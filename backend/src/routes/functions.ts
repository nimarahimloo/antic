import { Router } from "express";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError } from "../lib/errors.js";
import { renderOneModel, runBatch, getQueueState } from "../services/renderQueue.js";

const router = Router();

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
      return res.status(501).json({
        error:
          "قالب سبز را یک‌بار از عکس نصب واقعی آپلود کنید (پنل → پنجره مجازی). تولید خودکار قالب نیاز به عکس مرجع دارد.",
        data: { image: "", style: body.style || "" },
      });
    }

    res.json({ data: null, error: `Unknown function: ${name}` });
  } catch (err) {
    if (err instanceof Error && /در حال اجرا/.test(err.message)) {
      return sendError(res, new HttpError(409, err.message));
    }
    sendError(res, err);
  }
});

export default router;
