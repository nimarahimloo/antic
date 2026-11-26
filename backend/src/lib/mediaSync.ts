/**
 * Central MediaUsage synchronization.
 *
 * Backend-owned helper that keeps MediaUsage rows in sync with the image/gallery
 * fields of every entity. Call this from entity create/update/delete routes so
 * that media references are always tracked regardless of which client (admin UI,
 * API, import script) performed the write.
 *
 * syncMediaUsage(entityType, entityId, fields)
 *   fields: Record<fieldName, string[]>  -- current URLs for each image field
 *
 * Behavior:
 *   - Deletes existing MediaUsage rows for (entityType, entityId) [all fields]
 *   - For each field, resolves each URL to a Media record (by url match)
 *   - Creates MediaUsage rows for resolved URLs
 *   - Unresolvable URLs are skipped (recorded in result.skipped)
 *
 * Returns { created, skipped }.
 */

import { prisma } from "../lib/prisma.js";

export interface SyncFieldResult {
  fieldName: string;
  created: number;
  skipped: Array<{ url: string; reason: string }>;
}

export interface SyncMediaUsageResult {
  created: number;
  skipped: Array<SyncFieldResult>;
  totalSkipped: number;
}

/**
 * Resolve a public media URL (e.g. /uploads/media/2026/11/abc.jpg) to a Media record id.
 * Matches on the Media.url field.
 */
async function resolveMediaIdByUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== "string") return null;
  const media = await prisma.media.findFirst({
    where: { url },
    select: { id: true },
  });
  return media?.id ?? null;
}

/**
 * Synchronize MediaUsage for a single entity.
 *
 * @param entityType - e.g. "Product", "CurtainCategory", "Project"
 * @param entityId - the entity's id
 * @param fields - record of fieldName -> array of image URLs (current values)
 */
export async function syncMediaUsage(
  entityType: string,
  entityId: string,
  fields: Record<string, string[]>,
): Promise<SyncMediaUsageResult> {
  const created: number[] = [];
  const skipped: SyncFieldResult[] = [];

  // Delete all existing usages for this entity (all fields) so we can rebuild cleanly.
  await prisma.mediaUsage.deleteMany({
    where: { entityType, entityId },
  });

  for (const [fieldName, urls] of Object.entries(fields)) {
    const fieldSkipped: Array<{ url: string; reason: string }> = [];
    let fieldCreated = 0;

    for (const url of urls) {
      if (!url || typeof url !== "string" || url.trim() === "") {
        fieldSkipped.push({ url: String(url), reason: "empty url" });
        continue;
      }

      const mediaId = await resolveMediaIdByUrl(url);
      if (!mediaId) {
        fieldSkipped.push({ url, reason: "no matching media record" });
        continue;
      }

      try {
        await prisma.mediaUsage.create({
          data: {
            mediaId,
            entityType,
            entityId,
            fieldName,
          },
        });
        fieldCreated++;
      } catch (err) {
        // @@unique on (mediaId, entityType, entityId, fieldName) => already existed
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "P2002"
        ) {
          // Already exists (race or re-sync) - count as created for idempotency.
          fieldCreated++;
        } else {
          fieldSkipped.push({ url, reason: String(err) });
        }
      }
    }

    created.push(fieldCreated);
    skipped.push({ fieldName, created: fieldCreated, skipped: fieldSkipped });
  }

  return {
    created: created.reduce((a, b) => a + b, 0),
    skipped,
    totalSkipped: skipped.reduce((a, b) => a + b.skipped.length, 0),
  };
}

/**
 * Extract image URLs from an entity record based on known image fields.
 * Returns Record<fieldName, string[]>.
 */
export function extractImageUrls(
  entityType: string,
  record: Record<string, unknown>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  const fieldSpec: Record<string, Array<{ field: string; isArray: boolean }>> = {
    CurtainModel: [
      { field: "image", isArray: false },
      { field: "installImage", isArray: false },
    ],
    CurtainCategory: [
      { field: "image", isArray: false },
      { field: "backgroundImage", isArray: false },
    ],
    PortfolioCategory: [{ field: "image", isArray: false }],
    Project: [
      { field: "coverImage", isArray: false },
      { field: "images", isArray: true },
    ],
    RenderTemplate: [{ field: "image", isArray: false }],
    InstallReference: [{ field: "image", isArray: false }],
    SavedDesign: [{ field: "image", isArray: false }],
    Collection: [{ field: "coverImage", isArray: false }],
    VirtualWindowSetting: [{ field: "viewImage", isArray: false }],
    SiteSetting: [
      { field: "logoUrl", isArray: false },
      { field: "heroSlides", isArray: true },
      { field: "pageHeroes", isArray: true },
    ],
    Product: [
      { field: "image", isArray: false },
      { field: "gallery", isArray: true },
    ],
    ShopCategory: [{ field: "image", isArray: false }],
  };

  const specs = fieldSpec[entityType] ?? [];
  for (const { field, isArray } of specs) {
    const val = record[field];
    if (val === null || val === undefined || val === "") {
      result[field] = [];
      continue;
    }
    if (isArray) {
      result[field] = Array.isArray(val)
        ? val.filter((v): v is string => typeof v === "string" && v.trim() !== "")
        : [];
    } else {
      result[field] = typeof val === "string" && val.trim() !== "" ? [val] : [];
    }
  }

  return result;
}
