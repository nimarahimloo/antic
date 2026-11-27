import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { optionalAuth, requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { sendError, HttpError, ErrorCode } from "../lib/errors.js";
import {
  validateMediaFile,
  type MediaInfo,
  ALLOWED_MIME_TYPES,
  type AllowedMimeType,
} from "../services/mediaValidation.js";
import { storagePathFor, deleteFileIfExists, resolveUploadDir } from "../lib/mediaStorage.js";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_BYTES = 12 * 1024 * 1024;

/** Memory storage — validate buffer in memory before writing anything to disk. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

const router = Router();

/** Map multer validation errors to proper HTTP status + code. */
function multerErrorToHttp(err: unknown): HttpError {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "LIMIT_FILE_SIZE") {
      return new HttpError(413, ErrorCode.UPLOAD, "حجم فایل بیش از حد مجاز است.");
    }
    if (code === "LIMIT_FILE_COUNT" || code === "LIMIT_UNEXPECTED_FILE") {
      return new HttpError(400, ErrorCode.UPLOAD, "بارگذاری فایل ناموفق است.");
    }
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (/فقط تصویر/i.test(msg)) {
      return new HttpError(415, ErrorCode.UPLOAD, "فقط تصویر مجاز است.");
    }
    return new HttpError(400, ErrorCode.UPLOAD, msg || "بارگذاری ناموفق بود");
  }
  return new HttpError(400, ErrorCode.UPLOAD, "بارگذاری ناموفق بود");
}

/** Write validated buffer to disk under uploads/media/YYYY/MM/. */
async function writeValidatedFile(
  buffer: Buffer,
  mime: AllowedMimeType,
  originalName: string,
): Promise<{ storagePath: string; fullPath: string; url: string }> {
  const extMap: Record<AllowedMimeType, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/tiff": ".tif",
    "image/vnd.microsoft.icon": ".ico",
    "image/avif": ".avif",
  };
  const ext = extMap[mime];
  const { storagePath, fullPath, url } = storagePathFor(undefined, ext);
  const targetDir = path.dirname(fullPath);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return { storagePath, fullPath, url };
}

/** Shared upload handler: memory-storage + content validation + disk write. */
async function handleUpload(req: AuthedRequest, res: import("express").Response, next: import("express").NextFunction) {
  // Wrap multer callback in a Promise so we can await file parsing before async validation.
  await new Promise<void>((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
      if (err) return reject(multerErrorToHttp(err));
      resolve();
    });
  });

  const file = req.file as Express.Multer.File | undefined;
  if (!file) return next(new HttpError(400, ErrorCode.UPLOAD, "فایلی بارگذاری نشده است"));

  const buffer = Buffer.from(file.buffer as Uint8Array);
  const clientMime = file.mimetype;
  const originalName = file.originalname || "upload";

  try {
    // Validate actual content (magic bytes, dimensions, SVG sanitization, size)
    const info: MediaInfo = await validateMediaFile(buffer, {
      mimeType: clientMime,
      originalName,
    });

    // Determine extension from detected MIME
    const extMap: Record<AllowedMimeType, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/svg+xml": ".svg",
      "image/bmp": ".bmp",
      "image/tiff": ".tif",
      "image/vnd.microsoft.icon": ".ico",
      "image/avif": ".avif",
    };
    const ext = extMap[info.mimeType];

    // Build storage path for the ORIGINAL file (private, under uploads/media/YYYY/MM/)
    const { storagePath: origStoragePath, fullPath: origFullPath, url: origUrl } = storagePathFor(info.sha256, ext);

    // Build storage path for the WEBP derivative (public, under uploads/media/webp/)
    const { storagePath: webpStoragePath, fullPath: webpFullPath, url: webpUrl } = storagePathFor(info.sha256, ".webp");

    // Ensure target directories exist
    fs.mkdirSync(path.dirname(origFullPath), { recursive: true });
    fs.mkdirSync(path.dirname(webpFullPath), { recursive: true });

    // Write original file to private storage
    const contentToWrite =
      info.isSvg && info.safeSvg !== undefined ? Buffer.from(info.safeSvg, "utf8") : buffer;
    fs.writeFileSync(origFullPath, contentToWrite);

    // Write WebP derivative to public storage
    if (info.webpBuffer) {
      fs.writeFileSync(webpFullPath, info.webpBuffer);
    } else {
      // Fallback: if no WebP buffer (shouldn't happen), copy original
      fs.writeFileSync(webpFullPath, contentToWrite);
    }

    // Respond with the public URL (WebP URL if available, otherwise original)
    const publicUrl = webpUrl || origUrl;
    res.status(201).json({ file_url: publicUrl, mimeType: info.mimeType, size: info.webpSize ?? contentToWrite.length, webpUrl });
  } catch (e) {
    next(e instanceof HttpError ? e : new HttpError(400, ErrorCode.UPLOAD, e instanceof Error ? e.message : String(e)));
  }
}

/** Admin / catalog media */
router.post("/", requireAdmin, handleUpload);

/**
 * Public upload for virtual studio (window photo only).
 * Images only, size-capped. No auth required so customers can try studio.
 */
router.post("/public", optionalAuth, handleUpload);

export default router;