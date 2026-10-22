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

async function resolveTemplateUrl(style: string): Promise<string | null> {
  const row = await prisma.renderTemplate.findFirst({
    where: { style },
    orderBy: { updatedAt: "desc" },
  });
  return row?.image || null;
}

/** Admin-only: generate one model with high-accuracy engine */
export async function renderOneModel(modelId: string, opts?: { regenerate?: boolean }) {
  const model = await prisma.curtainModel.findUnique({ where: { id: modelId } });
  if (!model) throw new Error("Model not found");
  if (!model.image) throw new Error("مدل تصویر پارچه ندارد");

  // Skip if already approved and good enough (unless force regenerate)
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
  const template = await resolveTemplateUrl(style);
  if (!template) {
    throw new Error(
      `قالب chroma برای سبک «${style}» موجود نیست. از پنل → پنجره مجازی قالب سبز این سبک را آپلود کنید.`
    );
  }

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
      // re-render weak approved scores if below threshold
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
