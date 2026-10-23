/**
 * Ensure every CurtainCategory has a chroma RenderTemplate keyed by category.slug.
 * Geometry comes from resolveStyle(slug) → mechanism (roman / pleated / …).
 */
import path from "path";
import { prisma } from "../lib/prisma.js";
import { resolveStyle, type CurtainStyleKey } from "../lib/curtainStyles.js";
import { generateChromaTemplate } from "./templateGenerator.js";

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

export async function ensureCategoryTemplate(slug: string, force = false) {
  const key = String(slug || "")
    .trim()
    .toLowerCase();
  if (!key) return null;

  const existing = await prisma.renderTemplate.findFirst({
    where: { style: key },
    orderBy: { updatedAt: "desc" },
  });
  if (existing?.image && !force) return existing;

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

/** Fire-and-forget safe wrapper */
export function ensureCategoryTemplateBackground(slug: string, force = false) {
  ensureCategoryTemplate(slug, force).catch((e) =>
    console.warn("[category-template]", slug, e instanceof Error ? e.message : e)
  );
}
