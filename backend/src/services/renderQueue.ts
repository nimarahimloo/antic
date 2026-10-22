import { prisma } from "../lib/prisma.js";
import { renderInstallImage, styleFromModel, guessMaterial } from "./installEngine.js";
import path from "path";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

type JobState = {
  running: boolean;
  processed: number;
  failed: number;
  total: number;
  lastError?: string;
  currentModelId?: string;
  startedAt?: number;
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

/** Admin-only: generate one model */
export async function renderOneModel(modelId: string, opts?: { regenerate?: boolean }) {
  const model = await prisma.curtainModel.findUnique({ where: { id: modelId } });
  if (!model) throw new Error("Model not found");
  if (!model.image) throw new Error("مدل تصویر پارچه ندارد");

  if (model.installImage && !opts?.regenerate && model.installStatus === "approved") {
    return { skipped: true, install_image: model.installImage, style: styleFromModel(model) };
  }

  const style = styleFromModel(model);
  const template = await resolveTemplateUrl(style);
  if (!template) {
    throw new Error(
      `قالب chroma برای سبک «${style}» موجود نیست. ابتدا از پنل → پنجره مجازی یک قالب سبز آپلود کنید.`
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
      material: guessMaterial(model),
    });

    await prisma.curtainModel.update({
      where: { id: modelId },
      data: {
        installImage: result.publicPath,
        installStatus: "pending",
        installPending: null,
        installReview: `موتور داخلی (${style} / ${guessMaterial(model)}) — منتظر بازبینی ادمین`,
        installScore: null,
      },
    });

    return { skipped: false, install_image: result.publicPath, style };
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

/** Admin-only batch — sequential, safe for modest VPS */
export async function runBatch(opts?: {
  regenerate?: boolean;
  limit?: number;
  onlyMissing?: boolean;
}) {
  if (state.running) throw new Error("یک صف تولید از قبل در حال اجراست");

  const regenerate = !!opts?.regenerate;
  const limit = Math.min(opts?.limit || 200, 2000);

  const all = await prisma.curtainModel.findMany({
    orderBy: { updatedAt: "desc" },
    take: Math.min(limit * 4, 20000),
  });

  const targets = all
    .filter((m) => {
      if (!m.image) return false;
      if (regenerate) return true;
      if (!m.installImage) return true;
      if (!m.installStatus || m.installStatus === "pending") return true;
      return false;
    })
    .slice(0, limit);

  state.running = true;
  state.processed = 0;
  state.failed = 0;
  state.total = targets.length;
  state.lastError = undefined;
  state.startedAt = Date.now();

  (async () => {
    for (const m of targets) {
      state.currentModelId = m.id;
      try {
        await renderOneModel(m.id, { regenerate });
        state.processed++;
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
