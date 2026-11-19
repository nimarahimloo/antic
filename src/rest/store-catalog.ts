/**
 * Local catalog API — product/category queries against our backend /api/catalog.
 */

const API = process.env.NEXT_PUBLIC_API_BASE || "/api";

export const CATALOG_SORTS = {
  featured: { label: "پیش‌فرض" },
  priceAsc: { label: "ارزان‌ترین" },
  priceHigh: { label: "گران‌ترین" },
  name: { label: "نام" },
  newest: { label: "جدیدترین" },
} as const;

interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  formattedPrice: string;
  image?: string;
  images?: string[];
  categoryId?: string;
  inventory?: { availabilityStatus: string };
  variants?: ProductVariant[];
  [key: string]: unknown;
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  formattedPrice: string;
  [key: string]: unknown;
}

interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  [key: string]: unknown;
}

interface ProductsResponse {
  products: Product[];
  nextCursor?: string;
  totalCount?: number;
}

interface CategoriesResponse {
  categories: Category[];
  nextCursor?: string | null;
}

interface SearchProductsOptions {
  limit?: number;
  cursor?: string;
  categoryId?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  search?: string;
}

async function get<T>(path: string): Promise<T> {
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
}: SearchProductsOptions = {}): Promise<ProductsResponse> {
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

export function queryProducts(options: SearchProductsOptions = {}) {
  return searchProducts(options);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const res = await get<{ product?: Product }>(`/catalog/products/slug/${encodeURIComponent(slug)}`);
  return res?.product ?? null;
}

export function queryProductsByCategory(categoryId: string, options: SearchProductsOptions = {}) {
  return searchProducts({ ...options, categoryId });
}

export async function countProducts(): Promise<number> {
  const res = await get<{ count?: number }>("/catalog/products/count");
  return res?.count ?? 0;
}

export async function queryCategories({ limit = 100 } = {}): Promise<CategoriesResponse> {
  const res = await get<CategoriesResponse>(`/catalog/categories?limit=${limit}`);
  return {
    categories: res?.categories ?? [],
    nextCursor: null,
  };
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const { categories } = await queryCategories();
  return categories.find((c) => c.slug === slug);
}