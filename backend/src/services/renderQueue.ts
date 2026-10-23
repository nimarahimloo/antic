import { prisma } from "../lib/prisma.js";
import { renderInstallImage, styleFromModel, guessMaterial } from "./installEngine.js";
import path from "path";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

/** Auto-approve when quality score >= this (default 7). Set 11 to disable. */
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

/**
 * Resolve install base image for a model:
 *  1) InstallReference for categorySlug (real photo sample)
 *  2) RenderTemplate for categorySlug (chroma keyed to that category)
 *  3) InstallReference / RenderTemplate for mechanism style (roman, zebra, …)
 * Categories come from CurtainCategory / model.categorySlug — not hardcoded list only.
 */
async function resolveTemplateUrl(opts: {
  categorySlug?: string | null;
  style: string;
}): Promise<{ image: string; source: string; key: string } | null> {
  const keys = [opts.categorySlug, opts.style].filter(
    (k): k is string => Boolean(k && String(k).trim())
  );
  const tried = new Set<string>();

  for (const key of keys) {
    const k = key.trim().toLowerCase();
    if (tried.has(k)) continue;
    tried.add(k);

    const ref = await prisma.installReference.findFirst({
      where: { style: k },
      orderBy: { updatedAt: "desc" },
    });
    if (ref?.image) return { image: ref.image, source: "install_reference", key: k };

    const tpl = await prisma.renderTemplate.findFirst({
      where: { style: k },
      orderBy: { updatedAt: "desc" },
    });
    if (tpl?.image) return { image: tpl.image, source: "render_template", key: k };
  }
  return null;
}

/** Categories live in DB — list them for template coverage */
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

/** Admin-only: generate one model with high-accuracy engine */
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
  const resolved = await resolveTemplateUrl({ categorySlug, style });
  if (!resolved) {
    throw new Error(
      `برای دسته «${categorySlug || "—"}» / سبک «${style}» نه قالب chroma و نه نمونه واقعی در دیتابیس نیست. ` +
        `از پنل → پنجره مجازی قالب این دسته را بساز/آپلود کن، یا نمونه اجرا در InstallReference ثبت کن.`
    );
  }
  const template = resolved.image;

  await prisma.curtainModel.update({
    where: { id: modelId },
    data: { installPending: "rendering" },
  });

  try {
    const result = await renderInstallImage({
      templatePathOrUrl: template,
      fabricPathOrUrl: model.image,
      outDir: path.resolve(uploadDir),
      material,
      style,
    });

    const threshold = autoApproveThreshold();
    const autoOk = result.qualityScore >= threshold;
    const status = autoOk ? "approved" : "pending";
    const review = autoOk
      ? `موتور داخلی v2 · امتیاز ${result.qualityScore}/10 · تأیید خودکار`
      : `موتور داخلی v2 · امتیاز ${result.qualityScore}/10 · پوشش سبز ${Math.round(result.coverage * 100)}٪ · منتظر بازبینی`;

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
      material,
      score: result.qualityScore,
      auto_approved: autoOk,
    };
  } catch (e) {
    await prisma.curtainModel.update({
      where: { id: modelId },
      data: {
        installPending: null,
        installReview: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}

/** Admin batch — sequential; template cache makes later items much faster */
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
