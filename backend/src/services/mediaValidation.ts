import crypto from "crypto";
import sharp from "sharp";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

const dompurify = DOMPurify(new JSDOM("").window);

/** Allowed image MIME types (content-verified, not client-provided). */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/avif",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Default max upload size: 12 MB (matches existing upload.ts limit). */
export const DEFAULT_MAX_BYTES = 12 * 1024 * 1024;
/** Default max image dimension in either direction. */
export const DEFAULT_MAX_DIM = 4096;
/** Default min image dimension in either direction. */
export const DEFAULT_MIN_DIM = 1;

export interface MediaInfo {
  mimeType: AllowedMimeType;
  width: number;
  height: number;
  size: number;
  sha256: string;
  isSvg: boolean;
  safeSvg?: string; // sanitized SVG content when isSvg is true
  /// WebP derivative
  webpBuffer?: Buffer; // WebP-encoded buffer (raster or SVG→WebP)
  webpSize?: number;   // WebP file size in bytes
  /// Original (pre-conversion) metadata
  originalSize: number; // original file size in bytes
  originalMimeType?: AllowedMimeType; // original MIME type before conversion
}

/** Magic-byte signatures for supported image formats. Each entry:
 *  [mimeType, offset, bytes] where bytes must match at `offset` in the file. */
const MAGIC_BYTES: Array<[AllowedMimeType, number, Buffer]> = [
  ["image/jpeg", 0, Buffer.from([0xff, 0xd8, 0xff])],
  ["image/png", 0, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ["image/gif", 0, Buffer.from([0x47, 0x49, 0x46, 0x38])], // GIF87a / GIF89a
  ["image/webp", 0, Buffer.from([0x52, 0x49, 0x46, 0x46])], // starts with "RIFF", WEBP at offset 8
  ["image/svg+xml", 0, Buffer.from([0x3c, 0x3f, 0x78, 0x6d, 0x6c])], // "<?xml" or "<svg"
  ["image/bmp", 0, Buffer.from([0x42, 0x4d])], // "BM"
  ["image/tiff", 0, Buffer.from([0x49, 0x49, 0x2a, 0x00])], // little-endian TIFF
  ["image/tiff", 0, Buffer.from([0x4d, 0x4d, 0x00, 0x2a])], // big-endian TIFF
  ["image/vnd.microsoft.icon", 0, Buffer.from([0x00, 0x00, 0x01, 0x00])], // ICO
  // AVIF uses the HEIF container: "ftyp" box at offset 4, brand "avif1"/"avis" at offset 8.
  ["image/avif", 4, Buffer.from([0x66, 0x74, 0x79, 0x70])],
];

/** WEBP files start with "RIFF" but have "WEBP" at offset 8. */
const WEBP_SIGNATURE = Buffer.from([0x57, 0x45, 0x42, 0x50]); // "WEBP"
const WEBP_RIFF_OFFSET = 8;

/** SVG root element signatures (after optional XML declaration). */
const SVG_ROOT_PATTERNS = [Buffer.from("<svg"), Buffer.from("<svg "), Buffer.from("<SVG"), Buffer.from("<SVG ")];

function bytesStartWith(buffer: Buffer, offset: number, bytes: Buffer): boolean {
  if (offset + bytes.length > buffer.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

export function detectMimeBySignature(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 4) return null;

  for (const [mime, offset, sig] of MAGIC_BYTES) {
    if (mime === "image/webp") {
      // RIFF at 0 + WEBP at 8
      if (
        buffer.length >= 12 &&
        bytesStartWith(buffer, 0, Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
        bytesStartWith(buffer, WEBP_RIFF_OFFSET, WEBP_SIGNATURE)
      ) {
        return "image/webp";
      }
      continue;
    }
    if (mime === "image/svg+xml") {
      // "<svg" may follow an XML declaration; scan the first 64 bytes for <svg case-insensitively
      const head = buffer.subarray(0, Math.min(buffer.length, 64)).toString("latin1");
      if (/^<\?xml[\s\S]*?<svg/i.test(head) || /^<svg/i.test(head)) {
        return "image/svg+xml";
      }
      continue;
    }
    if (mime === "image/avif") {
      // "ftyp" at offset 4, brand "avif1" or "avis" at offset 8
      if (
        buffer.length >= 12 &&
        bytesStartWith(buffer, 4, Buffer.from([0x66, 0x74, 0x79, 0x70])) &&
        (bytesStartWith(buffer, 8, Buffer.from([0x61, 0x76, 0x69, 0x66])) || // "avif"
          bytesStartWith(buffer, 8, Buffer.from([0x61, 0x76, 0x69, 0x73]))) // "avis"
      ) {
        return "image/avif";
      }
      continue;
    }
    if (bytesStartWith(buffer, offset, sig)) return mime;
  }
  return null;
}

function extFromMime(mime: AllowedMimeType): string {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/webp": return ".webp";
    case "image/gif": return ".gif";
    case "image/svg+xml": return ".svg";
    case "image/bmp": return ".bmp";
    case "image/tiff": return ".tif";
    case "image/vnd.microsoft.icon": return ".ico";
    case "image/avif": return ".avif";
  }
}

/** Convert a raster image buffer to lossless WebP using Sharp. */
async function toWebp(buffer: Buffer, mime: AllowedMimeType): Promise<Buffer> {
  // Animated GIFs: keep animation, convert to WebP (lossless)
  if (mime === "image/gif") {
    return await sharp(buffer, { animated: true }).webp({ lossless: true }).toBuffer();
  }
  // SVG: rasterize to WebP at a reasonable default size
  if (mime === "image/svg+xml") {
    return await sharp(buffer)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ lossless: true })
      .toBuffer();
  }
  // Raster formats (JPEG, PNG, BMP, TIFF, AVIF, WebP)
  return await sharp(buffer).webp({ lossless: true }).toBuffer();
}

const ALLOWED_TAGS = [
  "svg",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polygon",
  "polyline",
  "g",
  "defs",
  "symbol",
  "use",
  "marker",
  "clipPath",
  "mask",
  "filter",
  "linearGradient",
  "radialGradient",
  "stop",
  "title",
  "desc",
];

const ALLOWED_ATTR = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "viewBox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "gradientUnits",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientTransform",
  "patternUnits",
];

/**
 * Sanitize SVG content using DOMPurify with a conservative allowlist.
 * Never serves an uploaded SVG unsanitized; rejects unsafe/malformed content.
 */
export function sanitizeSvg(xml: string): string {
  if (!xml || typeof xml !== "string") {
    throw new Error("svg-empty-input");
  }

  const trimmed = xml.trim();
  if (!trimmed) {
    throw new Error("svg-empty-input");
  }

  let cleaned: string;
  try {
    cleaned = dompurify.sanitize(trimmed, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      FORBID_TAGS: [
        "script",
        "foreignObject",
        "iframe",
        "object",
        "embed",
        "applet",
        "style",
        "meta",
        "form",
        "input",
        "button",
        "video",
        "audio",
        "image",
      ],
      FORBID_ATTR: [
        "onload",
        "onerror",
        "onclick",
        "onmouseover",
        "onmouseout",
        "onmousedown",
        "onmouseup",
        "onmousemove",
        "onkeydown",
        "onkeyup",
        "onfocus",
        "onblur",
        "onchange",
        "onsubmit",
        "onreset",
        "onselect",
        "oncontextmenu",
        "onabort",
      ],
    });
  } catch (err) {
    throw new Error(`svg-sanitizer-error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!cleaned || cleaned.trim() === "") {
    throw new Error("svg-empty-after-sanitization");
  }

  // Strip any remaining dangerous URI schemes the sanitizer may have missed.
  cleaned = cleaned.replace(
    /\s+(href|xlink:href|src)=["'](javascript|vbscript|data|mocha|livescript):[^"']*["']/gi,
    "",
  );

  // Ensure a root <svg> element is present.
  if (!/^<svg\b/i.test(cleaned)) {
    throw new Error("svg-no-root-element");
  }

  // Reject SVGs with no content (e.g., <svg></svg> or <svg />)
  const svgInner = cleaned.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/i, "").trim();
  if (!svgInner) {
    throw new Error("svg-empty-after-sanitization");
  }

  return cleaned;
}
function computeSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Validate an uploaded image buffer by inspecting actual file content.
 *
 * Does NOT trust client-provided MIME type or file extension. Detects the
 * format from magic bytes, cross-checks against the supplied MIME type,
 * reads dimensions via `sharp`, sanitizes SVG, and enforces size limits.
 *
 * @throws {Error} with a descriptive message on any validation failure.
 */
export async function validateMediaFile(
  buffer: Buffer,
  opts: {
    mimeType?: string;
    originalName?: string;
    maxBytes?: number;
    maxDim?: number;
    minDim?: number;
  } = {},
): Promise<MediaInfo> {
  const { mimeType: clientMime, originalName, maxBytes = DEFAULT_MAX_BYTES, maxDim = DEFAULT_MAX_DIM, minDim = DEFAULT_MIN_DIM } = opts;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("فایل خالی است.");
  }

  if (buffer.length > maxBytes) {
    throw new Error(`حجم فایل بیش از ${Math.round(maxBytes / 1024 / 1024)} مگابایت است.`);
  }

  // 1. Detect MIME from actual content (magic bytes)
  const detectedMime = detectMimeBySignature(buffer);
  if (!detectedMime) {
    throw new Error("فرمت فایل شناسایی نشد یا فایل تصویر معتبر نیست.");
  }

  // 2. Cross-check client-provided MIME type (reject obvious spoofing)
  if (clientMime && ALLOWED_MIME_TYPES.includes(clientMime as AllowedMimeType) && clientMime !== detectedMime) {
    throw new Error("نوع فایل با محتوای فایل مطابقت ندارد.");
  }

  const isSvg = detectedMime === "image/svg+xml";

  // 3. Read dimensions via sharp (sharp handles JPEG/PNG/WEBP/GIF/BMP/TIFF/ICO; SVG too)
  let width = 0;
  let height = 0;
  let safeSvg: string | undefined;

  try {
    if (isSvg) {
      const svgText = buffer.toString("utf8");
      safeSvg = sanitizeSvg(svgText);
      // Re-buffer sanitized SVG for dimension read
      const sanitizedBuffer = Buffer.from(safeSvg, "utf8");
      const meta = await sharp(sanitizedBuffer).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
    } else {
      const meta = await sharp(buffer).metadata();
      width = meta.width ?? 0;
      height = meta.height ?? 0;
    }
  } catch (err) {
    throw new Error(`خواندن ابعاد تصویر ناموفق بود: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!width || !height || width < minDim || height < minDim) {
    throw new Error("ابعاد تصویر نامعتبر است.");
  }
  if (width > maxDim || height > maxDim) {
    throw new Error(`ابعاد تصویر بیش از حد مجاز است (حداکثر ${maxDim}×${maxDim} پیکسل).`);
  }

  // 4. Content hash for deduplication (on original buffer)
  const sha256 = computeSha256(buffer);

  // 5. Convert to WebP for web delivery (lossless, preserves animation for GIF)
  let webpBuffer: Buffer | undefined;
  let webpSize: number | undefined;
  if (!isSvg) {
    // Raster images: convert directly to WebP
    webpBuffer = await toWebp(buffer, detectedMime);
    webpSize = webpBuffer.length;
  } else {
    // SVG: convert sanitized SVG to WebP derivative
    if (safeSvg) {
      const svgBuffer = Buffer.from(safeSvg, "utf8");
      webpBuffer = await toWebp(svgBuffer, "image/svg+xml");
      webpSize = webpBuffer.length;
    }
  }

  return {
    mimeType: detectedMime,
    width,
    height,
    size: buffer.length,
    sha256,
    isSvg,
    ...(safeSvg !== undefined ? { safeSvg } : {}),
    webpBuffer,
    webpSize,
    originalSize: buffer.length,
    originalMimeType: detectedMime,
  };
}

export { extFromMime, computeSha256 };
