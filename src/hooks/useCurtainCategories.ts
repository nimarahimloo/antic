"use client";

import { useCallback, useEffect, useState } from "react";
import { api, deduplicateRequest } from "@/api";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
  order: number;
  mechanism: string | null;
  subcategories: Array<{ name: string; slug: string }>;
  inCatalog: boolean;
  in_catalog: boolean;
  backgroundImage: string | null;
  backgroundGradient: string | null;
}

let cache: Category[] | null = null;

export function parseSubs(raw: unknown): Array<{ name: string; slug: string }> {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((s) => {
        if (typeof s === "string") return { name: s, slug: s };
        return { name: s.name || s.slug || "", slug: s.slug || s.name || "" };
      })
      .filter((s) => s.slug);
  }
  if (typeof raw === "string") {
    try {
      return parseSubs(JSON.parse(raw));
    } catch {
      return raw
        .split(/[,،]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [name, slug] = part.split(":").map((x) => x.trim());
          return { name: name || slug, slug: slug || name };
        })
        .filter((s) => s.slug);
    }
  }
  return [];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
  order: number;
  mechanism: string | null;
  subcategories: Array<{ name: string; slug: string }>;
  inCatalog: boolean;
  in_catalog: boolean;
  backgroundImage: string | null;
  backgroundGradient: string | null;
}

export function normalizeCategory(row: Record<string, unknown>): Category | null {
  if (!row) return null;
  const raw = row.in_catalog ?? row.inCatalog;
  const inCatalog = !(raw === false || raw === 0 || raw === "false" || raw === "0");
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    image: row.image ? String(row.image) : null,
    description: row.description ? String(row.description) : "",
    order: Number(row.order) || 0,
    mechanism: row.mechanism ? String(row.mechanism) : null,
    subcategories: parseSubs(row.subcategories),
    inCatalog,
    in_catalog: inCatalog,
    backgroundImage: row.backgroundImage ? String(row.backgroundImage) : null,
    backgroundGradient: row.backgroundGradient ? String(row.backgroundGradient) : null,
  };
}

/** فقط دسته‌هایی که تیک «کاتالوگ دارد» دارند */
export function filterCatalogCategories(categories: Category[]): Category[] {
  if (!categories?.length) return [];
  return categories.filter((c) => c.inCatalog !== false);
}

interface UseCurtainCategoriesOptions {
  catalogOnly?: boolean;
  initialData?: Array<{ id: string; name: string; slug: string; image: string | null; subcategories: unknown; parent_slug: string | null }>;
}

export function useCurtainCategories({ catalogOnly = false, initialData }: UseCurtainCategoriesOptions = {}) {
  const [categories, setCategories] = useState<Category[]>(() => {
    if (initialData && initialData.length > 0) {
      return initialData.map((row) => normalizeCategory(row as Record<string, unknown>)).filter((c): c is Category => c !== null);
    }
    return cache || [];
  });
  const [loading, setLoading] = useState(!cache && !initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async (force = false): Promise<Category[]> => {
    if (!force && cache) return cache;

    return deduplicateRequest("curtain-categories", async () => {
      const rows = await api.entities.CurtainCategory.list("order", 200);
      const list = (Array.isArray(rows) ? rows : [])
        .map((row) => normalizeCategory(row as Record<string, unknown>))
        .filter((c): c is Category => c !== null && !!c.slug)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "fa"));
      cache = list;
      return list;
    }).then((list) => {
      return list;
    });
  }, []);

  const reload = useCallback((force = false) => {
    setLoading(true);
    return fetchCategories(force)
      .then((list) => {
        setCategories(list);
        setError(null);
        return list;
      })
      .catch(() => setError("بارگذاری دسته‌ها ناموفق بود"))
      .finally(() => setLoading(false));
  }, [fetchCategories]);

  useEffect(() => {
    let alive = true;
    // Only fetch on mount if there is no module-level cache AND no initial data.
    if (!cache && !initialData) {
      reload(false).then((list) => {
        if (!alive && list) {
          /* unmounted */
        }
      });
    }
    const onVis = () => {
      if (document.visibilityState === "visible") reload(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload, initialData]);

  const visible = catalogOnly ? filterCatalogCategories(categories) : categories;
  return { categories: visible, allCategories: categories, loading, error, reload };
}

export function refreshCurtainCategories() {
  cache = null;
}

export function getCategoryMechanismMap(): Record<string, string> {
  const list = cache || [];
  const map: Record<string, string> = {};
  for (const c of list) {
    if (c.slug && c.mechanism) map[c.slug] = c.mechanism;
  }
  return map;
}

export function pickCategoriesByOrder(categories: Category[], limit = 8): Category[] {
  if (!categories?.length) return [];
  return categories.slice(0, limit);
}

export function pickFeaturedCategories(categories: Category[], limit = 6): Category[] {
  if (!categories?.length) return [];
  const withDesc = categories.filter((c) => c.description);
  const pool = withDesc.length >= 2 ? withDesc : categories;
  return pool.slice(0, limit);
}

export function pickVisualCategories(categories: Category[], limit = 6): Category[] {
  if (!categories?.length) return [];
  const withImage = categories.filter((c) => c.image);
  const pool = withImage.length >= 2 ? withImage : categories;
  return pool.slice(0, limit);
}

const SYSTEM_MECHANISMS = new Set([
  "shade",
  "double",
  "roman",
  "zebra",
  "roller",
  "panel",
  "pleated-manual",
  "pleated-chain",
  "pleated-sheer",
]);

export function pickSystemCategories(categories: Category[], limit = 6): Category[] {
  if (!categories?.length) return [];
  const system = categories.filter(
    (c) =>
      (c.mechanism && SYSTEM_MECHANISMS.has(c.mechanism)) ||
      (c.subcategories && c.subcategories.length > 0)
  );
  const pool = system.length >= 2 ? system : categories;
  return pool.slice(0, limit);
}

export function pickSecondaryCategories(categories: Category[], limit = 8): Category[] {
  if (!categories?.length) return [];
  const featured = pickFeaturedCategories(categories, 6);
  const featuredSlugs = new Set(featured.map((c) => c.slug));
  const rest = categories.filter((c) => !featuredSlugs.has(c.slug));
  if (rest.length >= 2) return rest.slice(0, limit);
  return categories.slice(Math.floor(categories.length / 2), Math.floor(categories.length / 2) + limit);
}

/** همهٔ دسته‌ها بدون فیلتر — برای سلکت ادمین */
export function allCategorySelectOptions(categories: Category[]): Array<{ value: string; label: string }> {
  return (Array.isArray(categories) ? categories : [])
    .filter((c) => c && c.slug)
    .slice()
    .sort(
      (a, b) =>
        (Number(a.order) || 0) - (Number(b.order) || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""), "fa")
    )
    .map((c) => ({ value: c.slug, label: c.name || c.slug }));
}
