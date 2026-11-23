import { prisma } from "../lib/prisma.js";

export type CatalogToolResult = {
  content: unknown;
};

function parseSubcategories(value: string | null): unknown[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listCurtainCategories(): Promise<CatalogToolResult> {
  const rows = await prisma.curtainCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return {
    content: rows.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      mechanism: category.mechanism,
      image: category.image,
      in_catalog: category.inCatalog,
      subcategories: parseSubcategories(category.subcategories),
    })),
  };
}

export async function searchCurtainModels(input: {
  query?: string;
  category_slug?: string;
  limit?: number;
}): Promise<CatalogToolResult> {
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 50);
  const query = String(input.query || "").trim().toLocaleLowerCase("fa");
  const category = String(input.category_slug || "").trim();

  const rows = await prisma.curtainModel.findMany({
    where: category ? { categorySlug: category } : undefined,
    take: 500,
    orderBy: { updatedAt: "desc" },
  });

  const filtered = query
    ? rows.filter((model) =>
        [
          model.name,
          model.code,
          model.categorySlug,
          model.subcategory || "",
          model.fabric || "",
          model.color || "",
          model.description || "",
        ]
          .join(" ")
          .toLocaleLowerCase("fa")
          .includes(query),
      )
    : rows;

  return {
    content: filtered.slice(0, limit).map((model) => ({
      id: model.id,
      code: model.code,
      name: model.name,
      category_slug: model.categorySlug,
      subcategory: model.subcategory,
      color: model.color,
      fabric: model.fabric,
      description: model.description,
      image: model.image,
      url: `/curtain/${model.id}`,
    })),
  };
}

export async function getCurtainModel(input: { id: string }): Promise<CatalogToolResult> {
  const id = String(input.id || "").trim();
  const model = await prisma.curtainModel.findUnique({ where: { id } });
  if (!model) {
    return { content: { found: false, message: "مدل پرده پیدا نشد." } };
  }

  return {
    content: {
      id: model.id,
      code: model.code,
      name: model.name,
      category_slug: model.categorySlug,
      subcategory: model.subcategory,
      color: model.color,
      color_code: model.colorCode,
      fabric: model.fabric,
      material: model.material,
      texture: model.texture,
      description: model.description,
      image: model.image,
      install_image: model.installImage,
      url: `/curtain/${model.id}`,
    },
  };
}

export async function listCurtainProjects(input: { limit?: number }): Promise<CatalogToolResult> {
  const limit = Math.min(Math.max(Number(input.limit) || 20, 1), 50);
  const rows = await prisma.project.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return {
    content: rows.map((project) => ({
      id: project.id,
      title: project.title,
      category_slug: project.categorySlug,
      subcategory: project.subcategory,
      description: project.description,
      cover_image: project.coverImage,
      images: project.images,
    })),
  };
}
