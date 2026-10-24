import { prisma } from "../lib/prisma.js";
import { renderInstallImage, styleFromModel, guessMaterial } from "./installEngine.js";
import { renderFromProductPhoto } from "./productRetexture.js";
import path from "path";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

function autoApproveThreshold() {
  const n = Number(process.env.RENDER_AUTO_APPROVE_SCORE ?? "7");
  return Number.isFinite(n) ? n : 7;
}

type JobState = {
  running: boolean;
  processed: number;
  failed: number;
  total: number;
  lastError?: string;
  currentModelId?: string;
  startedAt?: number;
  avgScore?: number;
};

const state: JobState = {
  running: false,
  processed: 0,
  failed: 0,
  total: 0,
};

export function getQueueState() {
  return { ...state };
}

type ResolvedTemplate = {
  image: string;
  source: "install_reference" | "render_template";
  key: string;
  mode: "hybrid" | "chroma";
  chromaImage?: string | null;
};

/**
 * اولویت:
 *  1) InstallReference (عکس واقعی) → hybrid: auto-chroma از عکس + پارچه
 *  2) RenderTemplate سبز → chroma کلاسیک
 */
async function resolveTemplateCandidates(opts: {
  categorySlug?: string | null;
  style: string;
}): Promise<ResolvedTemplate[]> {
  const keys = [opts.categorySlug, opts.style]
    .filter((k): k is string => Boolean(k && String(k).trim()))
    .map((k) => k.trim().toLowerCase());
  const unique = [...new Set(keys)];
  const out: ResolvedTemplate[] = [];
  const seen = new Set<string>();

  for (const k of unique) {
    const ref = await prisma.installReference.findFirst({
      where: { style: k },
      orderBy: { updatedAt: "desc" },
    });
    if (ref?.image) {
      const id = `ref:${k}:${ref.image}`;
      if (!seen.has(id)) {
        seen.add(id);
        const chroma = await prisma.renderTemplate.findFirst({
          where: { style: k },
          orderBy: { updatedAt: "desc" },
        });
        out.push({
          image: ref.image,
          source: "install_reference",
          key: k,
          mode: "hybrid",
          chromaImage: chroma?.image || null,
        });
      }
    }
  }

  for (const k of unique) {
    const tpl = await prisma.renderTemplate.findFirst({
      where: { style: k },
      orderBy: { updatedAt: "desc" },
    });
    if (tpl?.image) {
      const id = `tpl:${k}:${tpl.image}`;
      if (!seen.has(id)) {
        seen.add(id);
        out.push({
          image: tpl.image,
          source: "render_template",
          key: k,
          mode: "chroma",
        });
      }
    }
  }
  return out;
}

export async function listCategoryTemplateCoverage() {
  const [categories, templates, refs] = await Promise.all([
    prisma.curtainCategory.findMany({ orderBy: { order: "asc" } }),
    prisma.renderTemplate.findMany({ select: { style: true, image: true, updatedAt: true } }),
    prisma.installReference.findMany({ select: { style: true, image: true, note: true } }),
  ]);
  const tplBy = new Map(templates.map((t) => [t.style.toLowerCase(), t]));
  const refBy = new Map(refs.map((r) => [r.style.toLowerCase(), r]));

  return categories.map((c) => {
    const slug = c.slug.toLowerCase();
    const tpl = tplBy.get(slug);
    const ref = refBy.get(slug);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      hasChromaTemplate: Boolean(tpl?.image),
      hasRealReference: Boolean(ref?.image),
      templateImage: tpl?.image || null,
      referenceImage: ref?.image || null,
      referenceNote: ref?.note || null,
    };
  });
}

export async function renderOneModel(modelId: string, opts?: { regenerate?: boolean }) {
  const model = await prisma.curtainModel.findUnique({ where: { id: modelId } });
  if (!model) throw new Error("Model not found");
  if (!model.image) throw new Error("مدل تصویر پارچه ندارد");

  if (
    model.installImage &&
    !opts?.regenerate &&
    model.installStatus === "approved" &&
    (model.installScore == null || model.installScore >= autoApproveThreshold())
  ) {
    return {
      skipped: true,
      install_image: model.installImage,
      style: styleFromModel(model),
      score: model.installScore,
    };
  }

  const style = styleFromModel(model);
  const material = guessMaterial(model);
  const categorySlug = model.categorySlug || null;
  const candidates = await resolveTemplateCandidates({ categorySlug, style });
  if (!candidates.length) {
    throw new Error(
      `برای دسته «${categorySlug || "—"}» قالب نیست. ` +
        `عکس واقعی محصول را در «نمونه‌های اجرای واقعی» آپلود کنید (یک بار برای هر دسته کافی است).`
    );
  }

  await prisma.curtainModel.update({
    where: { id: modelId },
    data: { installPending: "rendering" },
  });

  let lastErr: unknown;
  for (const resolved of candidates) {
    try {
      const result =
        resolved.mode === "hybrid"
          ? await renderFromProductPhoto({
              photoPathOrUrl: resolved.image,
              fabricPathOrUrl: model.image,
              outDir: path.resolve(uploadDir),
              style,
              material,
              chromaPathOrUrl: resolved.chromaImage,
            })
          : await renderInstallImage({
              templatePathOrUrl: resolved.image,
              fabricPathOrUrl: model.image,
              outDir: path.resolve(uploadDir),
              material,
              style,
            });

      const threshold = autoApproveThreshold();
      const autoOk = result.qualityScore >= threshold;
      const status = autoOk ? "approved" : "pending";
      const label = resolved.mode === "hybrid" ? "ترکیب مرجع+chroma" : "chroma";
      const review = autoOk
        ? `${label} · امتیاز ${result.qualityScore}/10 · تأیید خودکار · ${resolved.source}`
        : `${label} · امتیاز ${result.qualityScore}/10 · پوشش ${Math.round(result.coverage * 100)}٪ · ${resolved.source}`;

      await prisma.curtainModel.update({
        where: { id: modelId },
        data: {
          installImage: result.publicPath,
          installStatus: status,
          installPending: null,
          installReview: review,
          installScore: result.qualityScore,
        },
      });

      return {
        skipped: false,
        install_image: result.publicPath,
        style,
        category_slug: categorySlug,
        template_key: resolved.key,
        template_source: resolved.source,
        mode: resolved.mode,
        material,
        score: result.qualityScore,
        auto_approved: autoOk,
      };
    } catch (e) {
      lastErr = e;
      console.warn("[render] candidate failed", resolved.mode, resolved.key, e);
    }
  }

  await prisma.curtainModel.update({
    where: { id: modelId },
    data: {
      installPending: null,
      installReview: lastErr instanceof Error ? lastErr.message : String(lastErr),
    },
  });
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function runBatch(opts?: {
  regenerate?: boolean;
  limit?: number;
}) {
  if (state.running) throw new Error("یک صف تولید از قبل در حال اجراست");

  const regenerate = !!opts?.regenerate;
  const limit = Math.min(opts?.limit || 200, 2000);

  const all = await prisma.curtainModel.findMany({
    orderBy: { updatedAt: "desc" },
    take: Math.min(limit * 4, 20000),
  });

  const threshold = autoApproveThreshold();
  const targets = all
    .filter((m) => {
      if (!m.image) return false;
      if (regenerate) return true;
      if (!m.installImage) return true;
      if (m.installStatus === "rejected") return true;
      if (!m.installStatus || m.installStatus === "pending") return true;
      if (m.installStatus === "approved" && m.installScore != null && m.installScore < threshold - 1)
        return true;
      return false;
    })
    .slice(0, limit);

  state.running = true;
  state.processed = 0;
  state.failed = 0;
  state.total = targets.length;
  state.lastError = undefined;
  state.startedAt = Date.now();
  state.avgScore = 0;

  (async () => {
    let scoreSum = 0;
    let scoreN = 0;
    for (const m of targets) {
      state.currentModelId = m.id;
      try {
        const r = await renderOneModel(m.id, { regenerate });
        state.processed++;
        if (typeof r.score === "number") {
          scoreSum += r.score;
          scoreN++;
          state.avgScore = Math.round((scoreSum / scoreN) * 10) / 10;
        }
      } catch (e) {
        state.failed++;
        state.lastError = e instanceof Error ? e.message : String(e);
        console.error("[render-batch]", m.id, state.lastError);
      }
    }
    state.running = false;
    state.currentModelId = undefined;
  })();

  return { queued: targets.length };
}
