import { prisma } from "../lib/prisma.js";
import { renderInstallImage, styleFromModel } from "./installEngine.js";
import path from "path";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

type JobState = {
  running: boolean;
  processed: number;
  failed: number;
  total: number;
  lastError?: string;
  currentModelId?: string;
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

/**
 * Generate install image for one model and persist on CurtainModel.
 */
export async function renderOneModel(modelId: string, opts?: { regenerate?: boolean }) {
  const model = await prisma.curtainModel.findUnique({ where: { id: modelId } });
  if (!model) throw new Error("Model not found");
  if (!model.image) throw new Error("Model has no fabric image");

  if (model.installImage && !opts?.regenerate && model.installStatus === "approved") {
    return { skipped: true, install_image: model.installImage };
  }

  const style = styleFromModel(model);
  const template = await resolveTemplateUrl(style);
  if (!template) {
    // Fallback: no chroma template — store fabric as pending placeholder
    await prisma.curtainModel.update({
      where: { id: modelId },
      data: {
        installImage: model.image,
        installStatus: "pending",
        installReview: `قالب chroma برای سبک «${style}» موجود نیست. ابتدا در پنل ادمین قالب را آپلود کنید.`,
        installPending: null,
      },
    });
    return { skipped: false, install_image: model.image, note: "no-template-fallback" };
  }

  await prisma.curtainModel.update({
    where: { id: modelId },
    data: { installPending: "rendering" },
  });

  const result = await renderInstallImage({
    templatePathOrUrl: template,
    fabricPathOrUrl: model.image,
    outDir: path.resolve(uploadDir),
    maxWidth: Number(process.env.RENDER_MAX_WIDTH) || 1200,
  });

  await prisma.curtainModel.update({
    where: { id: modelId },
    data: {
      installImage: result.publicPath,
      installStatus: "pending",
      installPending: null,
      installReview: `رندر سرور (${style}) — آماده بازبینی ادمین`,
      installScore: null,
    },
  });

  return { skipped: false, install_image: result.publicPath, style };
}

/**
 * Process models missing install images (or all if regenerate).
 * Sequential to protect CPU/memory on modest VPS.
 */
export async function runBatch(opts?: {
  regenerate?: boolean;
  limit?: number;
  onlyMissing?: boolean;
}) {
  if (state.running) throw new Error("Batch already running");

  const regenerate = !!opts?.regenerate;
  const limit = Math.min(opts?.limit || 500, 5000);
  const onlyMissing = opts?.onlyMissing !== false && !regenerate;

  const where = onlyMissing
    ? {
        OR: [{ installImage: null }, { installImage: "" }, { installStatus: null }, { installStatus: "" }],
      }
    : {};

  // Prisma empty string filter — use findMany + filter for sqlite simplicity
  const all = await prisma.curtainModel.findMany({
    orderBy: { updatedAt: "desc" },
    take: regenerate ? limit : Math.min(limit * 3, 15000),
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

  // fire-and-forget loop
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
        await prisma.curtainModel
          .update({
            where: { id: m.id },
            data: {
              installPending: null,
              installReview: `خطای رندر: ${state.lastError}`,
            },
          })
          .catch(() => {});
      }
    }
    state.running = false;
    state.currentModelId = undefined;
  })();

  return { queued: targets.length };
}
