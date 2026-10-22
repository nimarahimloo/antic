/**
 * Local catalog API — same surface as the old Wix store helpers.
 * All data comes from our backend /api/catalog (no external services).
 */

const API = import.meta.env.VITE_API_BASE || "/api";

export const CATALOG_SORTS = {
  featured: { label: "پیش‌فرض" },
  priceAsc: { label: "ارزان‌ترین" },
  priceHigh: { label: "گران‌ترین" },
  name: { label: "نام" },
  newest: { label: "جدیدترین" },
};

async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Catalog error ${res.status}`);
  }
  return res.json();
}

export async function searchProducts({
  limit = 24,
  cursor,
  categoryId,
  sort = "featured",
  minPrice,
  maxPrice,
  inStockOnly = false,
  search = "",
} = {}) {
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  if (cursor) q.set("cursor", String(cursor));
  if (categoryId) q.set("categoryId", categoryId);
  if (sort) q.set("sort", sort);
  if (minPrice != null) q.set("minPrice", String(minPrice));
  if (maxPrice != null) q.set("maxPrice", String(maxPrice));
  if (inStockOnly) q.set("inStockOnly", "true");
  if (search) q.set("search", search);
  return get(`/catalog/products?${q}`);
}

export function queryProducts(options = {}) {
  return searchProducts(options);
}

export async function getProductBySlug(slug) {
  const res = await get(`/catalog/products/slug/${encodeURIComponent(slug)}`);
  return res?.product ?? null;
}

export function queryProductsByCategory(categoryId, options = {}) {
  return searchProducts({ ...options, categoryId });
}

export async function countProducts() {
  const res = await get("/catalog/products/count");
  return res?.count ?? 0;
}

export async function queryCategories({ limit = 100 } = {}) {
  const res = await get(`/catalog/categories?limit=${limit}`);
  return {
    categories: res?.categories ?? [],
    nextCursor: null,
  };
}

export async function getCategoryBySlug(slug) {
  const { categories } = await queryCategories();
  return categories.find((c) => c.slug === slug) || null;
}
