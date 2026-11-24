import { cache } from "react";

/**
 * Server-side data fetching utilities
 * All functions are cached per request using React's cache()
 * Cache can be invalidated with revalidateTag/revalidatePath
 */

// Backend URL for server-side fetches
const BACKEND_URL = (process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001').replace(/\/$/, '');

async function fetchEntities(entity: string, params: URLSearchParams) {
  const res = await fetch(`${BACKEND_URL}/api/entities/${entity}?${params}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return [];
  return res.json();
}

async function fetchEntity(entity: string, id: string) {
  const res = await fetch(`${BACKEND_URL}/api/entities/${entity}/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

// ============================================
// Categories
// ============================================

export const getCurtainCategories = cache(async (catalogOnly = false) => {
  const params = new URLSearchParams({ sort_by: "order", limit: "500" });
  const categories = await fetchEntities("CurtainCategory", params);
  const normalized = (categories || []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      image: r.image ? String(r.image) : null,
      description: r.description ? String(r.description) : "",
      order: Number(r.order) || 0,
      mechanism: r.mechanism ? String(r.mechanism) : null,
      subcategories: parseSubcategories(r.subcategories),
      inCatalog: !(r.in_catalog === false || r.in_catalog === 0 || r.inCatalog === false || r.inCatalog === 0),
      backgroundImage: r.backgroundImage ? String(r.backgroundImage) : null,
      backgroundGradient: r.backgroundGradient ? String(r.backgroundGradient) : null,
    };
  }).filter((c: { slug?: string }) => c.slug);

  const sorted = normalized.sort((a: { order: number; name: string }, b: { order: number; name: string }) => a.order - b.order || a.name.localeCompare(b.name, "fa"));

  return catalogOnly ? sorted.filter((c: { inCatalog: boolean }) => c.inCatalog) : sorted;
});

export const getCurtainCategory = cache(async (slug: string) => {
  const categories = await getCurtainCategories(false);
  return categories.find((c: { slug?: string }) => c.slug === slug) || null;
});

function parseSubcategories(raw: unknown): Array<{ name: string; slug: string }> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => {
      if (typeof s === "string") return { name: s, slug: s };
      return { name: s.name || s.slug || "", slug: String(s.slug || s.name || "").trim() };
    }).filter((s) => s.slug);
  }
  if (typeof raw === "string") {
    try {
      return parseSubcategories(JSON.parse(raw));
    } catch {
      return raw.split(/[,،]/).map((part) => part.trim()).filter(Boolean).map((part) => {
        const [name, slug] = part.split(":").map((x) => x.trim());
        return { name: name || slug, slug: slug || name };
      }).filter((s) => s.slug);
    }
  }
  return [];
}

// ============================================
// Curtain Models
// ============================================

export const getCurtainModels = cache(async (filters: Record<string, string> = {}, limit = 80) => {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters || {})) {
    if (k.startsWith("$")) continue;
    if (v !== null && typeof v === "object") continue;
    if (v === undefined || v === "") continue;
    clean[k] = v;
  }
  const params = new URLSearchParams({
    sort_by: "-created_date",
    limit: String(limit),
    filter: JSON.stringify(clean),
  });
  return fetchEntities("CurtainModel", params) as Promise<Record<string, unknown>[]>;
});

export const getCurtainModel = cache(async (id: string) => {
  return fetchEntity("CurtainModel", id) as Promise<Record<string, unknown> | null>;
});

export const getModelsByCategory = cache(async (categorySlug: string, subcategory?: string) => {
  const filter: Record<string, string> = { category_slug: categorySlug };
  if (subcategory) filter.subcategory = subcategory;
  return getCurtainModels(filter, 100);
});

// ============================================
// Projects
// ============================================

export const getProjects = cache(async (filters: Record<string, string> = {}, limit = 24) => {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filters || {})) {
    if (k.startsWith("$")) continue;
    if (v !== null && typeof v === "object") continue;
    if (v === undefined || v === "") continue;
    clean[k] = v;
  }
  const params = new URLSearchParams({
    sort_by: "-created_date",
    limit: String(limit),
    filter: JSON.stringify(clean),
  });
  return fetchEntities("Project", params) as Promise<Record<string, unknown>[]>;
});

export const getProject = cache(async (id: string) => {
  return fetchEntity("Project", id) as Promise<Record<string, unknown> | null>;
});

export const getProjectsByCategory = cache(async (categorySlug: string) => {
  return getProjects({ category_slug: categorySlug }, 50);
});

// ============================================
// Shop Categories & Products
// ============================================

export const getShopCategories = cache(async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/catalog/categories?limit=200`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data?.categories || []) as Record<string, unknown>[];
});

export const getShopProducts = cache(async (filters: Record<string, unknown> = {}) => {
  const params = new URLSearchParams(filters as Record<string, string>);
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/catalog/products?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  return (await response.json()) as Record<string, unknown>[];
});

export const getShopProduct = cache(async (slug: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/catalog/products?slug=${encodeURIComponent(slug)}&limit=1`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  const products = await response.json();
  return (products?.[0] || null) as Record<string, unknown> | null;
});

// ============================================
// Public Settings
// ============================================

export const getPublicSettings = cache(async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/app/public-settings`, {
    cache: "no-store",
  });
  if (!response.ok) return { public_settings: {} };
  return response.json();
});

// ============================================
// Site Contact Info
// ============================================

export const getSiteContact = cache(async () => {
  const settings = await getPublicSettings();
  const contact = (settings as { public_settings?: { contact?: Record<string, unknown> } })?.public_settings?.contact || {};
  return {
    phone: String(contact.phone || "+98 21 1234 5678"),
    phoneDisplay: String(contact.phone_display || "۰۲۱-۱۲۳۴۵۶۷۸"),
    email: String(contact.email || "info@antic-curtain.ir"),
    address: String(contact.address || "تهران، نمایشگاه دائمی پرده"),
  };
});

// ============================================
// Helper: Pagination
// ============================================

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getTotalPages(items: unknown[], pageSize: number): number {
  return Math.ceil(items.length / pageSize);
}