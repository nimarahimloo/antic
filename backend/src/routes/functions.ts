import { Router } from "express";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { renderOneModel, runBatch, getQueueState } from "../services/renderQueue.js";
import { generateChromaTemplate } from "../services/templateGenerator.js";
import { ALL_STYLE_KEYS, STYLE_META, type CurtainStyleKey } from "../lib/curtainStyles.js";
import { prisma } from "../lib/prisma.js";
import { toApi } from "../lib/serialize.js";
import path from "path";

const router = Router();

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

/** All generation functions require admin — never auto for public. */
router.post("/:name", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const name = req.params.name;
    const body = req.body || {};

    if (name === "generateInstallImage") {
      const modelId = String(body.model_id || body.modelId || "");
      if (!modelId) throw new HttpError(400, "model_id required");
      const result = await renderOneModel(modelId, { regenerate: !!body.regenerate });
      return res.json({ data: result });
    }

    if (name === "startInstallBatch") {
      const result = await runBatch({
        regenerate: !!body.regenerate,
        limit: body.limit ? Number(body.limit) : 200,
      });
      return res.json({ data: { ...result, state: getQueueState() } });
    }

    if (name === "generateRenderTemplate") {
      const styleRaw = String(body.style || "").trim();
      if (!styleRaw) throw new HttpError(400, "style required");
      if (!ALL_STYLE_KEYS.includes(styleRaw as CurtainStyleKey)) {
        throw new HttpError(
          400,
          `سبک نامعتبر: ${styleRaw}. مجاز: ${ALL_STYLE_KEYS.join(", ")}`
        );
      }
      const style = styleRaw as CurtainStyleKey;

      const generated = await generateChromaTemplate(style, path.resolve(uploadDir));

      const existing = await prisma.renderTemplate.findFirst({ where: { style } });
      let row;
      if (existing) {
        row = await prisma.renderTemplate.update({
          where: { id: existing.id },
          data: { image: generated.publicPath },
        });
      } else {
        row = await prisma.renderTemplate.create({
          data: { style, image: generated.publicPath },
        });
      }

      return res.json({
        data: {
          ...toApi(row),
          style_label: STYLE_META[style]?.label,
          width: generated.width,
          height: generated.height,
        },
      });
    }

    res.status(404).json({ error: `Unknown function: ${name}`, data: null });
  } catch (err) {
    if (err instanceof Error && /در حال اجرا/.test(err.message)) {
      return sendError(res, new HttpError(409, err.message));
    }
    sendError(res, err);
  }
});

export default router;
