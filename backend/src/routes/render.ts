import { Router } from "express";
import { z } from "zod";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { getQueueState, renderOneModel, runBatch } from "../services/renderQueue.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

/** Public: get install image for a model (generates once if missing). */
router.get("/install/:modelId", async (req, res) => {
  try {
    const model = await prisma.curtainModel.findUnique({ where: { id: req.params.modelId } });
    if (!model) throw new HttpError(404, "Model not found");

    if (model.installImage && model.installStatus === "approved") {
      return res.json({
        install_image: model.installImage,
        status: model.installStatus,
        cached: true,
      });
    }

    // Live generate if fabric exists and not currently rendering
    if (model.image && model.installPending !== "rendering") {
      try {
        const result = await renderOneModel(model.id, { regenerate: !model.installImage });
        return res.json({
          install_image: result.install_image,
          status: "pending",
          cached: false,
          note: result.note,
        });
      } catch (e) {
        return res.json({
          install_image: model.installImage || model.image,
          status: model.installStatus || "pending",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    res.json({
      install_image: model.installImage || model.image,
      status: model.installStatus || "pending",
      pending: model.installPending,
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** Admin: queue batch generation */
router.post("/batch", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        regenerate: z.boolean().optional(),
        limit: z.number().int().positive().max(5000).optional(),
        onlyMissing: z.boolean().optional(),
      })
      .parse(req.body || {});

    const result = await runBatch(body);
    res.json({ ok: true, ...result, state: getQueueState() });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already running")) {
      return sendError(res, new HttpError(409, err.message));
    }
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

/** Admin: queue status */
router.get("/batch/status", requireAdmin, async (_req, res) => {
  res.json(getQueueState());
});

/** Admin: render one model now */
router.post("/one", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        model_id: z.string(),
        regenerate: z.boolean().optional(),
      })
      .parse(req.body || {});
    const result = await renderOneModel(body.model_id, { regenerate: body.regenerate });
    res.json(result);
  } catch (err) {
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

/** Stats for dashboard */
router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const total = await prisma.curtainModel.count();
    const withFabric = await prisma.curtainModel.count({ where: { NOT: { image: null } } });
    const approved = await prisma.curtainModel.count({ where: { installStatus: "approved" } });
    const rejected = await prisma.curtainModel.count({ where: { installStatus: "rejected" } });
    const withInstall = await prisma.curtainModel.count({
      where: { NOT: { installImage: null } },
    });
    const templates = await prisma.renderTemplate.count();
    res.json({
      total,
      withFabric,
      withInstall,
      approved,
      rejected,
      pendingReview: withInstall - approved - rejected,
      missingInstall: withFabric - withInstall,
      templates,
      queue: getQueueState(),
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
