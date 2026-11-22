import path from "path";
import sharp from "sharp";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";
import { getAIImageModelInfo } from "./aiProviders.js";
import {
  getPrivateAIFile,
  readPrivateAIFile,
  savePrivateAIFile,
  serializeAIFile,
} from "./aiFiles.js";
import { completeAIUsage, reserveAIUsage } from "./aiUsage.js";

const CLOUDFLARE_AI_ROOT = "https://api.cloudflare.com/client/v4";

function cloudflareCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new HttpError(
      503,
      "CLOUDFLARE_ACCOUNT_ID و CLOUDFLARE_API_TOKEN تنظیم نشده‌اند.",
    );
  }
  return { accountId, apiToken };
}

function normaliseDimension(value: number, fallback: number) {
  const bounded = Math.min(Math.max(Math.floor(value || fallback), 256), 1920);
  return Math.max(256, Math.round(bounded / 32) * 32);
}

function outputTiles(width: number, height: number) {
  return Math.ceil(width / 512) * Math.ceil(height / 512);
}

export function estimateImageQuotaUnits(input: {
  modelId: string;
  width: number;
  height: number;
  referenceCount: number;
  steps: number;
}) {
  const tiles = outputTiles(input.width, input.height);
  if (input.modelId.endsWith("flux-2-klein-4b")) {
    return Math.ceil(tiles * 26.05 + input.referenceCount * 5.37);
  }
  if (input.modelId.endsWith("flux-2-klein-9b")) {
    const megapixels = (input.width * input.height) / 1_000_000;
    const output = 1_363.64 + Math.max(0, megapixels - 1) * 181.82;
    const inputUnits =
      input.referenceCount * ((511 * 511 * 181.82) / 1_000_000);
    return Math.ceil(output + inputUnits);
  }
  return Math.ceil(
    tiles * input.steps * 37.5 +
      input.referenceCount * input.steps * 18.75,
  );
}

function detectMimeType(buffer: Buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return "image/png";
}

function extractBase64(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.success === false) {
    const errors = Array.isArray(root.errors) ? root.errors : [];
    const message = errors
      .map((item) =>
        item && typeof item === "object" && "message" in item
          ? String((item as { message: unknown }).message)
          : "",
      )
      .filter(Boolean)
      .join("؛ ");
    throw new HttpError(502, message || "Cloudflare درخواست تصویر را رد کرد.");
  }

  const result = root.result;
  if (typeof result === "string") {
    return result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
  }
  if (!result || typeof result !== "object") return null;
  const record = result as Record<string, unknown>;
  if (typeof record.image === "string") {
    return record.image.includes(",")
      ? record.image.slice(record.image.indexOf(",") + 1)
      : record.image;
  }
  if (Array.isArray(record.images) && record.images.length) {
    const first = record.images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "image" in first) {
      const image = (first as { image: unknown }).image;
      if (typeof image === "string") return image;
    }
  }
  return null;
}

async function prepareReference(buffer: Buffer) {
  try {
    const resized = await sharp(buffer)
      .rotate()
      .resize({
        width: 511,
        height: 511,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 90 })
      .toBuffer();
    return resized;
  } catch {
    throw new HttpError(400, "یکی از تصاویر مرجع قابل پردازش نیست.");
  }
}

export async function generateWorkspaceImage(input: {
  userId: string;
  conversationId?: string | null;
  prompt: string;
  modelId: string;
  referenceFileIds: string[];
  width: number;
  height: number;
  steps?: number;
  guidance?: number;
  requestKey?: string | null;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new HttpError(400, "متن درخواست تصویر الزامی است.");
  if (prompt.length > 4_000) {
    throw new HttpError(400, "متن درخواست تصویر حداکثر ۴۰۰۰ نویسه است.");
  }
  if (input.referenceFileIds.length > 4) {
    throw new HttpError(400, "حداکثر چهار تصویر مرجع مجاز است.");
  }

  if (input.requestKey) {
    const existing = await prisma.aIFile.findFirst({
      where: { userId: input.userId, requestKey: input.requestKey },
    });
    if (existing) {
      return { file: serializeAIFile(existing), reused: true };
    }
  }

  const model = getAIImageModelInfo(input.modelId);
  const width = normaliseDimension(input.width, 1024);
  const height = normaliseDimension(input.height, 1024);
  const steps =
    input.modelId.endsWith("flux-2-dev")
      ? Math.min(Math.max(Math.floor(input.steps || 8), 1), 20)
      : 4;
  const guidance = Math.min(Math.max(Number(input.guidance || 3.5), 0), 10);

  const references: Buffer[] = [];
  for (const fileId of input.referenceFileIds) {
    const file = await getPrivateAIFile(input.userId, fileId);
    if (!file.mimeType.startsWith("image/")) {
      throw new HttpError(400, "فقط تصویر می‌تواند به‌عنوان مرجع استفاده شود.");
    }
    references.push(await prepareReference(await readPrivateAIFile(file)));
  }

  const estimatedUnits = estimateImageQuotaUnits({
    modelId: input.modelId,
    width,
    height,
    referenceCount: references.length,
    steps,
  });
  const usage = await reserveAIUsage({
    userId: input.userId,
    provider: "cloudflare",
    model: input.modelId,
    operation: "image",
    estimatedUnits,
  });

  const { accountId, apiToken } = cloudflareCredentials();
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", String(width));
  form.append("height", String(height));
  form.append("guidance", String(guidance));
  if (input.modelId.endsWith("flux-2-dev")) {
    form.append("steps", String(steps));
  }
  references.forEach((buffer, index) => {
    form.append(
      `input_image_${index}`,
      new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }),
      `reference-${index}.jpg`,
    );
  });

  try {
    const response = await fetch(
      `${CLOUDFLARE_AI_ROOT}/accounts/${accountId}/ai/run/${input.modelId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}` },
        body: form,
        signal: AbortSignal.timeout(120_000),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = extractBase64(payload);
      throw new HttpError(
        502,
        message
          ? "پاسخ نامعتبر از Cloudflare دریافت شد."
          : `Cloudflare خطای ${response.status} برگرداند.`,
      );
    }

    const base64 = extractBase64(payload);
    if (!base64) {
      throw new HttpError(502, "Cloudflare تصویری برنگرداند.");
    }
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.length || bytes.length > 20 * 1024 * 1024) {
      throw new HttpError(502, "فایل تصویر دریافتی معتبر نیست.");
    }
    const mimeType = detectMimeType(bytes);
    const extension = mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/webp" ? ".webp" : ".png";
    const file = await savePrivateAIFile({
      userId: input.userId,
      conversationId: input.conversationId,
      kind: "output",
      originalName: `ai-${Date.now()}${extension}`,
      mimeType,
      buffer: bytes,
      provider: "cloudflare",
      model: input.modelId,
      prompt,
      requestKey: input.requestKey || null,
      metadata: {
        width,
        height,
        steps,
        guidance,
        referenceCount: references.length,
        estimatedQuotaUnits: estimatedUnits,
      },
    });

    await completeAIUsage(usage.id, {
      status: "success",
      units: estimatedUnits,
    });
    return {
      file: serializeAIFile(file),
      reused: false,
      model: model.id,
      width,
      height,
      estimatedQuotaUnits: estimatedUnits,
    };
  } catch (error) {
    await completeAIUsage(usage.id, {
      status: "error",
      errorCode: error instanceof HttpError ? String(error.status) : "provider_error",
    });
    if (error instanceof HttpError) throw error;
    console.error("Cloudflare image generation failed", error);
    throw new HttpError(502, "تولید تصویر با Cloudflare انجام نشد.");
  }
}
