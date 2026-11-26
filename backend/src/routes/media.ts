import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";
import { HttpError, sendError, ErrorCode } from "../lib/errors.js";
import {
  validateMediaFile,
  type MediaInfo,
  ALLOWED_MIME_TYPES,
  type AllowedMimeType,
} from "../services/mediaValidation.js";
import { storagePathFor, deleteFileIfExists, resolveUploadDir } from "../lib/mediaStorage.js";
import fs from "fs";
import path from "path";

const router = Router();

/** Security headers for all media API responses. */
router.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Content-Security-Policy", "default-src 'none'");
  next();
});

/** Map multer / validation errors to proper HTTP status + code. */
function uploadErrorToHttp(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
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
    if (/فقط تصویر/i.test(msg) || /type.*mismatch/i.test(msg)) {
      return new HttpError(415, ErrorCode.UPLOAD, "فقط تصویر مجاز است.");
    }
    if (/بیش از حد مجاز/i.test(msg) || /size/i.test(msg)) {
      return new HttpError(413, ErrorCode.UPLOAD, "حجم فایل بیش از حد مجاز است.");
    }
    return new HttpError(400, ErrorCode.UPLOAD, msg || "بارگذاری ناموفق بود");
  }
  return new HttpError(400, ErrorCode.UPLOAD, "بارگذاری ناموفق بود");
}

/** Memory storage — we validate the buffer before writing anything to disk. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

function mimeTypeAllowed(mime: string): mime is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mime as AllowedMimeType);
}

/** GET /api/media — list media with pagination, search, mime filter. */
router.get("/", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const search = (req.query.search as string) || "";
    const mimeType = (req.query.mimeType as string) || "";
    const sortBy = (req.query.sort_by as string) || "-createdAt";

    const where: Record<string, unknown> = {};
    if (search.trim()) {
      where.OR = [
        { originalName: { contains: search.trim() } },
        { filename: { contains: search.trim() } },
        { alt: { contains: search.trim() } },
        { title: { contains: search.trim() } },
      ];
    }
    if (mimeType && mimeTypeAllowed(mimeType)) {
      where.mimeType = mimeType;
    }

    const orderBy: Record<string, string> = {};
    const sortKey = sortBy.replace(/^-/, "");
    const sortDir = sortBy.startsWith("-") ? "desc" : "asc";
    orderBy[sortKey] = sortDir;

    const [items, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          width: true,
          height: true,
          storagePath: true,
          url: true,
          webpUrl: true,
          originalSize: true,
          sha256: true,
          alt: true,
          caption: true,
          title: true,
          uploadedById: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { usages: true } },
        },
      }),
      prisma.media.count({ where }),
    ]);

    res.json({
      items: items.map((m) => ({
        ...m,
        usageCount: m._count.usages,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    sendError(res, err);
  }
});

/** GET /api/media/:id — get one media record. */
router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const media = await prisma.media.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        storagePath: true,
        url: true,
        webpUrl: true,
        originalSize: true,
        sha256: true,
        alt: true,
        caption: true,
        title: true,
        uploadedById: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { usages: true } },
      },
    });
    if (!media) throw new HttpError(404, "رسانه یافت نشد");
    res.json({ ...media, usageCount: (media as any)._count.usages });
  } catch (err) {
    sendError(res, err);
  }
});

/** GET /api/media/:id/usages — where this media is referenced. */
router.get("/:id/usages", requireAdmin, async (req, res) => {
  try {
    const usages = await prisma.mediaUsage.findMany({
      where: { mediaId: req.params.id as string },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        fieldName: true,
        createdAt: true,
      },
    });
    res.json({ usages, count: usages.length });
  } catch (err) {
    sendError(res, err);
  }
});

/** POST /api/media — upload a new image (admin only). */
router.post("/", requireAdmin, (req: AuthedRequest, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return next(uploadErrorToHttp(err));
    }
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return next(new HttpError(400, ErrorCode.UPLOAD, "فایلی بارگذاری نشده است"));

    const buffer = Buffer.from(file.buffer as Uint8Array);
    const clientMime = file.mimetype;
    const originalName = file.originalname || "upload";

    (async () => {
      try {
        // Validate actual content (magic bytes, dimensions, SVG sanitization, size)
        const info: MediaInfo = await validateMediaFile(buffer, {
          mimeType: clientMime,
          originalName,
        });

        // Dedup: if same sha256 already exists, reuse the existing Media record
        if (info.sha256) {
          const existing = await prisma.media.findUnique({ where: { sha256: info.sha256 } });
          if (existing) {
            return res.json({ media: existing, reused: true });
          }
        }

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

        // Build storage path for the ORIGINAL file (private, under uploads/media/originals/)
        const { storagePath: origStoragePath, fullPath: origFullPath, url: origUrl } =
          storagePathFor(info.sha256, ext);

        // Build storage path for the WEBP derivative (public, under uploads/media/webp/)
        const webpExt = ".webp";
        const { storagePath: webpStoragePath, fullPath: webpFullPath, url: webpUrl } =
          storagePathFor(info.sha256, webpExt);

        // Ensure target directories exist
        const origTargetDir = path.dirname(origFullPath);
        const webpTargetDir = path.dirname(webpFullPath);
        fs.mkdirSync(origTargetDir, { recursive: true });
        fs.mkdirSync(webpTargetDir, { recursive: true });

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

        // Create Media record
        const media = await prisma.media.create({
          data: {
            filename: path.basename(origFullPath),
            originalName,
            mimeType: info.mimeType,
            size: info.originalSize,
            width: info.width,
            height: info.height,
            storagePath: webpStoragePath,
            url: webpUrl, // Public URL points to WebP derivative
            webpUrl,
            originalSize: info.originalSize,
            originalMimeType: info.originalMimeType,
            sha256: info.sha256,
            alt: undefined,
            caption: undefined,
            title: undefined,
            uploadedById: req.user?.sub ?? undefined,
          },
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            width: true,
            height: true,
            storagePath: true,
            url: true,
            webpUrl: true,
            originalSize: true,
            originalMimeType: true,
            sha256: true,
            alt: true,
            caption: true,
            title: true,
            uploadedById: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        res.status(201).json({ media, reused: false });
      } catch (e) {
        next(e instanceof HttpError ? e : new HttpError(400, ErrorCode.UPLOAD, e instanceof Error ? e.message : String(e)));
      }
    })();
  });
});

/** PATCH /api/media/:id — update metadata (admin only). */
router.patch("/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const { alt, caption, title } = req.body || {};
    const data: Record<string, unknown> = {};
    if (alt !== undefined) data.alt = String(alt);
    if (caption !== undefined) data.caption = String(caption);
    if (title !== undefined) data.title = String(title);

    if (Object.keys(data).length === 0) {
      throw new HttpError(400, "هیچ فیلد برای به‌روزرسانی ارسال نشده است.");
    }

    const media = await prisma.media.update({
      where: { id: req.params.id as string },
      data,
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        storagePath: true,
        url: true,
        webpUrl: true,
        sha256: true,
        alt: true,
        caption: true,
        title: true,
        updatedAt: true,
      },
    });
    res.json({ media });
  } catch (err) {
    sendError(res, err);
  }
});

/** POST /api/media/usages — register that an entity field references a media (admin only). */
router.post("/usages", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const { mediaId, entityType, entityId, fieldName } = req.body || {};
    if (!mediaId || !entityType || !entityId || !fieldName) {
      throw new HttpError(400, "mediaId، entityType، entityId و fieldName الزامی هستند.");
    }
    // Ensure media exists
    const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } });
    if (!media) throw new HttpError(404, "رسانه یافت نشد");

    const usage = await prisma.mediaUsage.create({
      data: { mediaId, entityType, entityId, fieldName },
      select: { id: true, mediaId: true, entityType: true, entityId: true, fieldName: true, createdAt: true },
    });
    res.status(201).json({ usage });
  } catch (err) {
    sendError(res, err);
  }
});

/** DELETE /api/media/:id — delete media (admin only). Refuses if referenced. */
router.delete("/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const force = String(req.query.force) === "true";
    const media: any = await prisma.media.findUnique({
      where: { id: req.params.id as string },
      include: { usages: true },
    });
    if (!media) throw new HttpError(404, "رسانه یافت نشد");

    const usages = Array.isArray(media.usages) ? media.usages : [];
    if (usages.length > 0 && !force) {
      const usageList = usages
        .map((u: { entityType: string; entityId: string; fieldName: string }) => `${u.entityType}.${u.fieldName} (${u.entityId})`)
        .join(", ");
      throw new HttpError(
        409,
        `این تصویر در جای‌های دیگر استفاده شده است و قابل حذف نیست: ${usageList}`,
        { usages },
      );
    }

    // Delete files from disk (both original and WebP)
    const uploadDir = resolveUploadDir();
    const fullPath = path.resolve(uploadDir, media.storagePath);
    deleteFileIfExists(fullPath);
    // Also delete WebP derivative if it has a different path
    if (media.webpUrl) {
      const webpSlug = media.webpUrl.replace(/^\/uploads\//, "");
      const webpFullPath = path.resolve(uploadDir, webpSlug);
      deleteFileIfExists(webpFullPath);
    }

    // Delete MediaUsage rows then Media record (cascade via Prisma also works, but explicit is clear)
    await prisma.mediaUsage.deleteMany({ where: { mediaId: media.id } });
    await prisma.media.delete({ where: { id: media.id } });

    res.json({ id: media.id, deleted: true, fileDeleted: true });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;