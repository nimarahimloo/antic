import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { sendError, HttpError } from "../lib/errors.js";
import { requireAdmin, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function formatPrice(amount: number, currency = "IRR") {
  if (!amount || amount <= 0) return "";
  if (currency === "IRR" || currency === "TMN") {
    return new Intl.NumberFormat("fa-IR").format(Math.round(amount)) + " تومان";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function toStoreProduct(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  image: string | null;
  gallery: string | null;
  categoryId: string | null;
  visible: boolean;
  inStock: boolean;
  stock: number;
  ribbon: string | null;
  optionsJson: string | null;
  variantsJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const gallery = parseJson<string[]>(row.gallery, []);
  const options = parseJson<unknown[]>(row.optionsJson, []);
  const variants = parseJson<unknown[]>(row.variantsJson, []);
  const priceStr = formatPrice(row.price, row.currency);
  const compareStr = row.compareAtPrice != null ? formatPrice(row.compareAtPrice, row.currency) : "";

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    visible: row.visible,
    productType: "PHYSICAL",
    mainCategoryId: row.categoryId || undefined,
    plainDescription: row.description || "",
    media: {
      main: row.image
        ? { image: { url: row.image, altText: row.name } }
        : undefined,
      itemsInfo: {
        items: [row.image, ...gallery].filter(Boolean).map((url) => ({
          image: { url },
          altText: row.name,
        })),
      },
    },
    actualPriceRange: {
      minValue: { amount: String(row.price), formattedAmount: priceStr },
      maxValue: { amount: String(row.price), formattedAmount: priceStr },
    },
    compareAtPriceRange: compareStr
      ? {
          minValue: { amount: String(row.compareAtPrice), formattedAmount: compareStr },
          maxValue: { amount: String(row.compareAtPrice), formattedAmount: compareStr },
        }
      : undefined,
    inventory: {
      availabilityStatus: row.inStock && row.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    },
    ribbon: row.ribbon ? { name: row.ribbon } : undefined,
    options,
    modifiers: [],
    variantsInfo: {
      variants:
        variants.length > 0
          ? variants
          : [
              {
                id: `${row.id}-default`,
                visible: true,
                choices: [],
                price: {
                  actualPrice: { amount: String(row.price), formattedAmount: priceStr },
                  compareAtPrice: compareStr
                    ? { amount: String(row.compareAtPrice), formattedAmount: compareStr }
                    : undefined,
                },
                inventoryStatus: { inStock: row.inStock && row.stock > 0 },
              },
            ],
    },
    createdDate: row.createdAt.toISOString(),
    updatedDate: row.updatedAt.toISOString(),
  };
}

function toStoreCategory(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  visible: boolean;
  order: number;
}) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    image: row.image ? { url: row.image } : undefined,
    visible: row.visible,
    order: row.order,
  };
}

router.get("/products", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 24, 100);
    const skip = Number(req.query.cursor) || 0;
    const categoryId = req.query.categoryId as string | undefined;
    const search = (req.query.search as string) || "";
    const sort = (req.query.sort as string) || "featured";
    const inStockOnly = req.query.inStockOnly === "true";

    const where: Record<string, unknown> = { visible: true };
    if (categoryId) where.categoryId = categoryId;
    if (inStockOnly) where.inStock = true;
    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { description: { contains: search.trim() } },
      ];
    }

    let orderBy: Record<string, string> = { sortOrder: "asc" };
    if (sort === "priceAsc") orderBy = { price: "asc" };
    else if (sort === "priceHigh") orderBy = { price: "desc" };
    else if (sort === "name") orderBy = { name: "asc" };
    else if (sort === "newest") orderBy = { createdAt: "desc" };

    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, take: limit, skip }),
      prisma.product.count({ where }),
    ]);

    const nextCursor = skip + limit < total ? String(skip + limit) : null;
    res.json({
      products: rows.map(toStoreProduct),
      nextCursor,
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/products/count", async (_req, res) => {
  try {
    const count = await prisma.product.count({ where: { visible: true } });
    res.json({ count });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/products/slug/:slug", async (req, res) => {
  try {
    const row = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!row || !row.visible) return res.json({ product: null });
    res.json({ product: toStoreProduct(row) });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/categories", async (_req, res) => {
  try {
    // دسته‌های اصلی (CurtainCategory) برای محصولات فروشگاه
    const rows = await prisma.curtainCategory.findMany({
      orderBy: { order: "asc" },
    });
    res.json({
      categories: rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        image: c.image ? { url: c.image } : undefined,
        visible: true,
        order: c.order,
      })),
    });
  } catch (err) {
    sendError(res, err);
  }
});

router.get("/admin/products", requireAdmin, async (_req: AuthedRequest, res) => {
  try {
    const rows = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
    res.json(rows.map(toStoreProduct));
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/admin/products", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const b = req.body || {};
    if (!b.name) throw new HttpError(400, "name is required");
    const row = await prisma.product.create({
      data: {
        name: b.name,
        slug: b.slug || String(b.name || "").replace(/\s+/g, "-").toLowerCase(),
        description: b.description || null,
        price: Number(b.price) || 0,
        compareAtPrice: b.compareAtPrice != null ? Number(b.compareAtPrice) : null,
        currency: b.currency || "IRR",
        image: b.image || null,
        gallery: b.gallery ? JSON.stringify(b.gallery) : null,
        categoryId: b.categoryId || null,
        visible: b.visible !== false,
        inStock: b.inStock !== false,
        stock: Number(b.stock) || 100,
        ribbon: b.ribbon || null,
        optionsJson: b.options ? JSON.stringify(b.options) : null,
        variantsJson: b.variants ? JSON.stringify(b.variants) : null,
        sortOrder: Number(b.sortOrder) || 0,
      },
    });
    res.status(201).json(toStoreProduct(row));
  } catch (err) {
    sendError(res, err);
  }
});

router.put("/admin/products/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const b = req.body || {};
    const data: Record<string, unknown> = {};
    for (const k of ["name", "slug", "description", "image", "categoryId", "ribbon", "currency"] as const) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    if (b.price !== undefined) data.price = Number(b.price);
    if (b.compareAtPrice !== undefined)
      data.compareAtPrice = b.compareAtPrice == null ? null : Number(b.compareAtPrice);
    if (b.visible !== undefined) data.visible = !!b.visible;
    if (b.inStock !== undefined) data.inStock = !!b.inStock;
    if (b.stock !== undefined) data.stock = Number(b.stock);
    if (b.gallery !== undefined) data.gallery = JSON.stringify(b.gallery);
    if (b.options !== undefined) data.optionsJson = JSON.stringify(b.options);
    if (b.variants !== undefined) data.variantsJson = JSON.stringify(b.variants);
    if (b.sortOrder !== undefined) data.sortOrder = Number(b.sortOrder);

    const row = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(toStoreProduct(row));
  } catch (err) {
    sendError(res, err);
  }
});

router.delete("/admin/products/:id", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ id: req.params.id });
  } catch (err) {
    sendError(res, err);
  }
});

router.post("/admin/categories", requireAdmin, async (req: AuthedRequest, res) => {
  try {
    const b = req.body || {};
    if (!b.name) throw new HttpError(400, "name is required");
    const row = await prisma.shopCategory.create({
      data: {
        name: b.name,
        slug: b.slug || String(b.name || "").replace(/\s+/g, "-").toLowerCase(),
        description: b.description || null,
        image: b.image || null,
        visible: b.visible !== false,
        order: Number(b.order) || 0,
      },
    });
    res.status(201).json(toStoreCategory(row));
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
