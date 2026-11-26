#!/usr/bin/env tsx
/**
 * Legacy media import & usage backfill.
 *
 * Scans UPLOAD_DIR recursively, registers every valid image file in the
 * Media table (SHA-256 content-dedup), and links all existing image/gallery
 * references across Prisma entities to MediaUsage rows.
 *
 * Safe to rerun: existing Media rows are reused by sha256, existing
 * MediaUsage rows are not duplicated (@@unique on mediaId+entityType+entityId+fieldName),
 * and file contents are never modified or deleted.
 *
 * Usage:
 *   DATABASE_URL="file:./test.db" UPLOAD_DIR="./test-uploads" npx tsx scripts/import-legacy-media.ts
 *
 * Prints a JSON import report on stdout.
 */

import { prisma } from "../src/lib/prisma.js";
import { resolveUploadDir, storagePathFor } from "../src/lib/mediaStorage.js";
import { detectMimeBySignature, extFromMime, computeSha256, type AllowedMimeType } from "../src/services/mediaValidation.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const DRY_RUN = process.env.DRY_RUN === "true";

interface ImageRef {
  entityType: string;
  entityId: string;
  fieldName: string;
  url: string;
}

// All image-bearing fields across every Prisma entity that can reference Media.
const IMAGE_FIELDS: Array<{ model: string; field: string; isArray: boolean }> = [
  { model: "CurtainModel", field: "image", isArray: false },
  { model: "CurtainModel", field: "installImage", isArray: false },
  { model: "CurtainCategory", field: "image", isArray: false },
  { model: "CurtainCategory", field: "backgroundImage", isArray: false },
  { model: "PortfolioCategory", field: "image", isArray: false },
  { model: "Project", field: "coverImage", isArray: false },
  { model: "Project", field: "images", isArray: true },
  { model: "RenderTemplate", field: "image", isArray: false },
  { model: "InstallReference", field: "image", isArray: false },
  { model: "SavedDesign", field: "image", isArray: false },
  { model: "Collection", field: "coverImage", isArray: false },
  { model: "VirtualWindowSetting", field: "viewImage", isArray: false },
  { model: "SiteSetting", field: "logoUrl", isArray: false },
  { model: "SiteSetting", field: "heroSlides", isArray: true },
  { model: "Product", field: "image", isArray: false },
  { model: "Product", field: "gallery", isArray: true },
  { model: "ShopCategory", field: "image", isArray: false },
];

function isHttpUrl(u: string): boolean {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

/** Convert a public URL like /uploads/media/2026/11/abc.jpg to an absolute disk path. */
function urlToDiskPath(url: string): string | null {
  try {
    const u = new URL(url, "http://localhost");
    const pathname = u.pathname;
    if (!pathname.startsWith("/uploads/")) return null;
    const relative = pathname.slice("/uploads/".length);
    return path.resolve(UPLOAD_DIR, relative);
  } catch {
    return null;
  }
}

async function readImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

async function scanUploadDir(dir: string): Promise<Map<string, { diskPath: string; mime: AllowedMimeType; width: number; height: number; size: number; sha256: string }>> {
  const bySha = new Map<string, { diskPath: string; mime: AllowedMimeType; width: number; height: number; size: number; sha256: string }>();

  async function walk(current: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      let buffer: Buffer;
      try {
        buffer = await fs.promises.readFile(full);
      } catch {
        continue;
      }
      if (buffer.length === 0) continue;

      const mime = detectMimeBySignature(buffer);
      if (!mime) continue;

      const dims = await readImageDimensions(buffer);
      if (!dims) continue;

      const sha256 = computeSha256(buffer);
      // If we already have this sha256, keep the first-seen path (content-identical).
      if (!bySha.has(sha256)) {
        bySha.set(sha256, {
          diskPath: full,
          mime,
          width: dims.width,
          height: dims.height,
          size: buffer.length,
          sha256,
        });
      }
    }
  }

  await walk(dir);
  return bySha;
}

/** Collect every image URL reference from every entity. */
const ENTITY_MODEL_MAP: Record<string, string> = {
  CurtainModel: "curtainModel",
  CurtainCategory: "curtainCategory",
  PortfolioCategory: "portfolioCategory",
  Project: "project",
  RenderTemplate: "renderTemplate",
  InstallReference: "installReference",
  SavedDesign: "savedDesign",
  Collection: "collection",
  VirtualWindowSetting: "virtualWindowSetting",
  SiteSetting: "siteSetting",
  Product: "product",
  ShopCategory: "shopCategory",
};

async function collectImageRefs(): Promise<ImageRef[]> {
  const refs: ImageRef[] = [];

  for (const { model, field, isArray } of IMAGE_FIELDS) {
    const prismaModel = ENTITY_MODEL_MAP[model];
    if (!prismaModel) {
      console.warn(`No Prisma model mapping for entity ${model}, skipping`);
      continue;
    }
    // Build a dynamic select: only the id and the image field.
    // @ts-expect-error dynamic model access
    const rows = await prisma[prismaModel as keyof typeof prisma].findMany({
      select: { id: true, [field]: true },
    });
    for (const row of rows as Array<Record<string, unknown>>) {
      const entityId = String(row.id);
      const val = row[field];
      if (val === null || val === undefined || val === "") continue;
      const urls = isArray
        ? (Array.isArray(val) ? val.filter((v): v is string => typeof v === "string" && v.trim() !== "") : [])
        : typeof val === "string" && val.trim() !== ""
          ? [val]
          : [];
      for (const url of urls) {
        refs.push({ entityType: model, entityId, fieldName: field, url });
      }
    }
  }

  return refs;
}

async function main() {
  const report: {
    scannedFiles: number;
    registeredMedia: number;
    reusedMedia: number;
    skippedNonImage: number;
    imageRefsFound: number;
    usagesCreated: number;
    usagesAlreadyExisted: number;
    unmatchedUrls: Array<{ url: string; reason: string }>;
    errors: Array<{ step: string; message: string }>;
  } = {
    scannedFiles: 0,
    registeredMedia: 0,
    reusedMedia: 0,
    skippedNonImage: 0,
    imageRefsFound: 0,
    usagesCreated: 0,
    usagesAlreadyExisted: 0,
    unmatchedUrls: [],
    errors: [],
  };

  console.error(`[import-legacy-media] UPLOAD_DIR=${UPLOAD_DIR} DRY_RUN=${DRY_RUN}`);

  // ---- Step 1: scan upload dir ----
  console.error("[import-legacy-media] scanning upload dir...");
  const bySha = await scanUploadDir(UPLOAD_DIR);
  report.scannedFiles = bySha.size;
  console.error(`[import-legacy-media] found ${bySha.size} valid image files on disk`);

  // Build lookup: disk absolute path -> media record info
  const diskToMedia: Map<string, { id: string; sha256: string; url: string }> = new Map();
  const shaToMedia: Map<string, { id: string; sha256: string; url: string }> = new Map();

  if (!DRY_RUN) {
    const existing = await prisma.media.findMany({
      select: { id: true, sha256: true, url: true, storagePath: true },
    });
    for (const m of existing) {
      if (!m.sha256) continue;
      shaToMedia.set(m.sha256, { id: m.id, sha256: m.sha256, url: m.url });
      if (m.storagePath) {
        const full = path.resolve(UPLOAD_DIR, m.storagePath);
        diskToMedia.set(full, { id: m.id, sha256: m.sha256!, url: m.url });
      }
    }
    report.reusedMedia = existing.length;
  }

  // ---- Step 2: register files on disk as Media ----
  for (const [sha256, info] of bySha) {
    if (shaToMedia.has(sha256)) continue; // already registered
    if (DRY_RUN) {
      report.registeredMedia++;
      continue;
    }
    const { storagePath, fullPath, url } = storagePathFor(sha256, extFromMime(info.mime));
    // Only create DB record; do NOT copy/move the file (preserve existing URLs & contents).
    const media = await prisma.media.create({
      data: {
        filename: path.basename(info.diskPath),
        originalName: path.basename(info.diskPath),
        mimeType: info.mime,
        size: info.size,
        width: info.width,
        height: info.height,
        storagePath,
        url,
        sha256,
        alt: undefined,
        caption: undefined,
        title: undefined,
        uploadedById: undefined,
      },
      select: { id: true, sha256: true, url: true },
    });
    shaToMedia.set(sha256, { id: media.id, sha256, url: media.url });
    diskToMedia.set(fullPath, { id: media.id, sha256, url: media.url });
    report.registeredMedia++;
  }

  // ---- Step 3: collect entity image refs ----
  console.error("[import-legacy-media] collecting entity image references...");
  const refs = await collectImageRefs();
  report.imageRefsFound = refs.length;
  console.error(`[import-legacy-media] found ${refs.length} image references across entities`);

  // ---- Step 4: link refs to MediaUsage ----
  for (const ref of refs) {
    const diskPath = urlToDiskPath(ref.url);
    if (!diskPath) {
      report.unmatchedUrls.push({ url: ref.url, reason: "not a /uploads/ URL" });
      continue;
    }
    const diskInfo = diskToMedia.get(diskPath);
    let resolvedDiskInfo: { id: string; sha256: string; url: string } | undefined = diskInfo;
    if (!diskInfo) {
      // Maybe the file exists on disk under a different path (e.g. root uploads/).
      // Try matching by sha256 of the file at diskPath.
      try {
        const buffer = await fs.promises.readFile(diskPath);
        const sha256 = computeSha256(buffer);
        const bySha = shaToMedia.get(sha256);
        if (bySha) {
          resolvedDiskInfo = bySha;
        } else {
          report.unmatchedUrls.push({ url: ref.url, reason: "file on disk not registered as Media" });
          continue;
        }
      } catch {
        report.unmatchedUrls.push({ url: ref.url, reason: "file not found on disk" });
        continue;
      }
    }

    if (DRY_RUN) {
      report.usagesCreated++;
      continue;
    }

    // Idempotent: @@unique([mediaId, entityType, entityId, fieldName]) prevents duplicates.
    try {
      await prisma.mediaUsage.create({
        data: {
          mediaId: resolvedDiskInfo!.id,
          entityType: ref.entityType,
          entityId: ref.entityId,
          fieldName: ref.fieldName,
        },
      });
      report.usagesCreated++;
    } catch (err) {
      // Prisma P2002 = unique violation => already existed.
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        report.usagesAlreadyExisted++;
      } else {
        report.errors.push({ step: "link-usage", message: String(err) });
      }
    }
  }

  // ---- Step 5: report ----
  console.error("[import-legacy-media] done.");
  console.log(JSON.stringify(report, null, 2));
  return report;
}

main().catch((err) => {
  console.error("[import-legacy-media] FATAL:", err);
  process.exit(1);
});
