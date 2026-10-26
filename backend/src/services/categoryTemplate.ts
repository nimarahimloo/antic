/**
 * Ensure every CurtainCategory has a chroma RenderTemplate keyed by category.slug.
 * Never overwrites an admin-uploaded template that still has a valid image on disk.
 */
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { resolveStyle, type CurtainStyleKey } from "../lib/curtainStyles.js";
import { generateChromaTemplate } from "./templateGenerator.js";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

function localPathFromPublic(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith("/uploads/")) {
    return path.join(path.resolve(uploadDir), path.basename(image));
  }
  if (!image.startsWith("http")) {
    return path.join(path.resolve(uploadDir), path.basename(image));
  }
  return null;
}

function fileExists(image: string | null | undefined): boolean {
  const p = localPathFromPublic(image);
  if (!p) return Boolean(image);
  try {
    return fs.existsSync(p) && fs.statSync(p).size > 100;
  } catch {
    return false;
  }
}

/** قالب موجود با فایل سالم را هرگز بازنویسی نکن */
export async function ensureCategoryTemplate(slug: string, _force = false) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  if (!key) return null;

  const existing = await prisma.renderTemplate.findFirst({
    where: { style: key },
    orderBy: { updatedAt: "desc" },
  });

  if (existing?.image && fileExists(existing.image)) {
    return existing;
  }

  const mechanism = resolveStyle({
    categorySlug: key,
    subcategory: null,
  }) as CurtainStyleKey;

  const gen = await generateChromaTemplate(mechanism, path.resolve(uploadDir));

  if (existing) {
    return prisma.renderTemplate.update({
      where: { id: existing.id },
      data: { image: gen.publicPath },
    });
  }

  return prisma.renderTemplate.create({
    data: { style: key, image: gen.publicPath },
  });
}

export function ensureCategoryTemplateBackground(slug: string, force = false) {
  ensureCategoryTemplate(slug, force).catch((e) =>
    console.warn("[categoryTemplate]", slug, e instanceof Error ? e.message : e)
  );
}

export async function ensureAllCategoryTemplates() {
  const cats = await prisma.curtainCategory.findMany({
    select: { slug: true, name: true, mechanism: true },
    orderBy: { order: "asc" },
  });
  const report: { slug: string; status: string; image?: string }[] = [];
  for (const c of cats) {
    if (!c.slug) continue;
    const before = await prisma.renderTemplate.findFirst({
      where: { style: c.slug },
      orderBy: { updatedAt: "desc" },
    });
    if (before?.image && fileExists(before.image)) {
      report.push({ slug: c.slug, status: "kept", image: before.image });
      continue;
    }
    try {
      const row = await ensureCategoryTemplate(c.slug, false);
      report.push({
        slug: c.slug,
        status: before ? "restored-file" : "created",
        image: row?.image,
      });
    } catch (e) {
      report.push({
        slug: c.slug,
        status: `error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
  return report;
}
