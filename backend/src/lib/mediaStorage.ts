import fs from "fs";
import path from "path";

/** Resolve the upload directory (same convention as upload.ts / app.ts). */
export function resolveUploadDir(): string {
  return process.env.UPLOAD_DIR || "./uploads";
}

/** Ensure the media storage subdirectory exists. */
export function ensureMediaDir(): string {
  const dir = path.resolve(resolveUploadDir(), "media");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Build a storage path under uploads/media/YYYY/MM/<prefix>-<rand><ext>.
 *  Returns { storagePath (relative to upload dir), fullPath (absolute) }. */
export function storagePathFor(sha256: string | undefined, ext: string): {
  storagePath: string;
  fullPath: string;
  url: string;
} {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const prefix = sha256 ? sha256.slice(0, 12) : "media";
  const rand = Math.random().toString(36).slice(2, 10);
  const filename = `${prefix}-${rand}${ext.toLowerCase()}`;
  const storagePath = `media/${yyyy}/${mm}/${filename}`;
  const fullPath = path.resolve(resolveUploadDir(), storagePath);
  const url = `/uploads/${storagePath}`;
  return { storagePath, fullPath, url };
}

/** Delete a file from disk if it exists (no-throw). */
export function deleteFileIfExists(fullPath: string): void {
  try {
    fs.unlinkSync(fullPath);
  } catch {
    /* file may not exist — ignore */
  }
}

/** Ensure the media subdirectory tree exists at module load. */
ensureMediaDir();
