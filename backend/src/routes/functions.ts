import { Router } from "express";
import { optionalAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { HttpError, sendError } from "../lib/errors.js";

const router = Router();

/**
 * Server functions formerly powered by Base44 AI.
 * Without external image-gen API we:
 * - generateInstallImage: copy model fabric image as install preview placeholder + mark pending review
 * - generateRenderTemplate: require admin upload path (returns clear error if no AI key)
 *
 * Set OPENAI_API_KEY later to plug real generation without changing the invoke contract.
 */
router.post("/:name", optionalAuth, async (req: AuthedRequest, res) => {
  try {
    const name = req.params.name;
    const body = req.body || {};

    if (name === "generateInstallImage") {
      const modelId = String(body.model_id || body.modelId || "");
      if (!modelId) throw new HttpError(400, "model_id required");

      const model = await prisma.curtainModel.findUnique({ where: { id: modelId } });
      if (!model) throw new HttpError(404, "Model not found");

      // Placeholder: use fabric image so UI has something to review (no external AI)
      const install_image = model.image || "";
      if (!install_image) {
        throw new HttpError(
          400,
          "مدل تصویر پارچه ندارد؛ ابتدا تصویر مدل را آپلود کنید یا موتور تولید تصویر را پیکربندی کنید."
        );
      }

      await prisma.curtainModel.update({
        where: { id: modelId },
        data: {
          installImage: install_image,
          installStatus: body.regenerate ? "pending" : model.installStatus || "pending",
          installReview:
            "تولید خودکار بدون سرویس AI خارجی: تصویر پارچه به‌عنوان پیش‌نمایش نصب کپی شد. در صورت نیاز دستی جایگزین کنید.",
          installScore: null,
        },
      });

      return res.json({
        data: {
          install_image,
          install_status: "pending",
          note: "local-placeholder",
        },
      });
    }

    if (name === "generateRenderTemplate") {
      const style = String(body.style || "");
      if (!style) throw new HttpError(400, "style required");

      // Without external AI: instruct admin to upload
      return res.status(501).json({
        error:
          "تولید قالب با AI پیکربندی نشده است. از دکمه آپلود در پنل ادمین یک عکس نصب واقعی برای این سبک بارگذاری کنید.",
        data: { image: "", style },
      });
    }

    res.json({ data: null, error: `Unknown function: ${name}` });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
