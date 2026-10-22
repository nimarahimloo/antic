import { Router } from "express";
import { optionalAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { HttpError, sendError } from "../lib/errors.js";
import { renderOneModel } from "../services/renderQueue.js";

const router = Router();

router.post("/:name", optionalAuth, async (req, res) => {
  try {
    const name = req.params.name;
    const body = req.body || {};

    if (name === "generateInstallImage") {
      const modelId = String(body.model_id || body.modelId || "");
      if (!modelId) throw new HttpError(400, "model_id required");
      const result = await renderOneModel(modelId, { regenerate: !!body.regenerate });
      return res.json({ data: result });
    }

    if (name === "generateRenderTemplate") {
      const style = String(body.style || "");
      if (!style) throw new HttpError(400, "style required");
      return res.status(501).json({
        error:
          "قالب chroma باید یک‌بار از عکس نصب واقعی با پارچه سبز ساخته و آپلود شود. از پنل ادمین → پنجره مجازی → آپلود قالب استفاده کنید.",
        data: { image: "", style },
      });
    }

    if (name === "startInstallBatch") {
      const { runBatch } = await import("../services/renderQueue.js");
      const result = await runBatch({
        regenerate: !!body.regenerate,
        limit: body.limit ? Number(body.limit) : 500,
      });
      return res.json({ data: result });
    }

    res.json({ data: null, error: `Unknown function: ${name}` });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
