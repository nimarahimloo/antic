import { Router } from "express";
import { z } from "zod";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { getQueueState, renderOneModel, runBatch } from "../services/renderQueue.js";
import { prisma } from "../lib/prisma.js";
import { ALL_STYLE_KEYS, STYLE_META, resolveStyle, guessMaterial } from "../lib/curtainStyles.js";

const router = Router();

/** Public: cached only — no generation */
router.get("/install/:modelId", async (req, res) => {
  try {
    const model = await prisma.curtainModel.findUnique({ where: { id: req.params.modelId } });
    if (!model) throw new HttpError(404, "Model not found");
    const style = resolveStyle(model);
    res.json({
      install_image: model.installImage || null,
      status: model.installStatus || null,
      fabric_image: model.image || null,
      style,
      style_label: STYLE_META[style]?.label,
      material: guessMaterial(model),
      generated: Boolean(model.installImage),
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** Public: taxonomy for admin UI / docs */
router.get("/styles", (_req, res) => {
  res.json({
    styles: ALL_STYLE_KEYS.map((k) => ({
      key: k,
      ...STYLE_META[k],
    })),
  });
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
    const models = await prisma.curtainModel.findMany({
      select: {
        image: true,
        installImage: true,
        installStatus: true,
        categorySlug: true,
        subcategory: true,
      },
    });
    let withInstall = 0,
      approved = 0,
      rejected = 0,
      fabric = 0;
    const byStyle: Record<string, { total: number; withInstall: number }> = {};
    for (const m of models) {
      if (m.image) fabric++;
      if (m.installImage) withInstall++;
      if (m.installStatus === "approved") approved++;
      if (m.installStatus === "rejected") rejected++;
      const st = resolveStyle(m);
      if (!byStyle[st]) byStyle[st] = { total: 0, withInstall: 0 };
      byStyle[st].total++;
      if (m.installImage) byStyle[st].withInstall++;
    }
    const templateRows = await prisma.renderTemplate.findMany({
      select: { style: true },
    });
    const templateStyles = new Set(templateRows.map((t) => t.style));
    const missingTemplates = ALL_STYLE_KEYS.filter((k) => !templateStyles.has(k));

    res.json({
      total: models.length,
      withFabric: fabric,
      withInstall,
      approved,
      rejected,
      pendingReview: withInstall - approved - rejected,
      missingInstall: fabric - withInstall,
      templates: templateRows.length,
      missingTemplates,
      byStyle,
      queue: getQueueState(),
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
