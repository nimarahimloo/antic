import { Router } from "express";
import { z } from "zod";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { getQueueState, renderOneModel, runBatch } from "../services/renderQueue.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * Public: ONLY returns cached image — never generates.
 * Generation is admin-only (batch / one / functions.invoke).
 */
router.get("/install/:modelId", async (req, res) => {
  try {
    const model = await prisma.curtainModel.findUnique({ where: { id: req.params.modelId } });
    if (!model) throw new HttpError(404, "Model not found");
    res.json({
      install_image: model.installImage || null,
      status: model.installStatus || null,
      fabric_image: model.image || null,
      // client may fall back to live WebGL preview if null
      generated: Boolean(model.installImage),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/batch", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const body = z
      .object({
        regenerate: z.boolean().optional(),
        limit: z.number().int().positive().max(2000).optional(),
      })
      .parse(req.body || {});

    const result = await runBatch(body);
    res.json({ ok: true, ...result, state: getQueueState() });
  } catch (err) {
    if (err instanceof Error && /در حال اجرا/.test(err.message)) {
      return sendError(res, new HttpError(409, err.message));
    }
    sendError(res, err instanceof z.ZodError ? new HttpError(400, err.message) : err);
  }
});

router.get("/batch/status", requireAdmin, async (_req, res) => {
  res.json(getQueueState());
});

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

router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const total = await prisma.curtainModel.count();
    const withFabric = await prisma.curtainModel.count({
      where: { NOT: [{ image: null }, { image: "" }] },
    });
    // sqlite-friendly counts
    const models = await prisma.curtainModel.findMany({
      select: { image: true, installImage: true, installStatus: true },
    });
    let withInstall = 0,
      approved = 0,
      rejected = 0,
      fabric = 0;
    for (const m of models) {
      if (m.image) fabric++;
      if (m.installImage) withInstall++;
      if (m.installStatus === "approved") approved++;
      if (m.installStatus === "rejected") rejected++;
    }
    const templates = await prisma.renderTemplate.count();
    res.json({
      total,
      withFabric: fabric,
      withInstall,
      approved,
      rejected,
      pendingReview: withInstall - approved - rejected,
      missingInstall: fabric - withInstall,
      templates,
      queue: getQueueState(),
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
