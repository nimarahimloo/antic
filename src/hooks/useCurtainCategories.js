import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * منبع واحد دسته‌های کاتالوگ پرده (غیر از فروشگاه).
 * همهٔ سکشن‌های سایت باید از این hook / helpers استفاده کنند.
 * فروشگاه جداست: ShopCategory via src/rest/store-catalog.js
 */

let cache = null;
let inflight = null;

function parseSubs(raw) {
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

export function normalizeCategory(row) {
  if (!row) return null;
  const raw = row.in_catalog ?? row.inCatalog;
  const inCatalog = !(raw === false || raw === 0 || raw === "false" || raw === "0");
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: row.image || null,
    description: row.description || "",
    order: Number(row.order) || 0,
    mechanism: row.mechanism || null,
    subcategories: parseSubs(row.subcategories),
    inCatalog,
    in_catalog: inCatalog,
  };
}

/** فقط دسته‌هایی که تیک «کاتالوگ دارد» دارند */
export function filterCatalogCategories(categories) {
  if (!categories?.length) return [];
  return categories.filter((c) => c.inCatalog !== false);
}

function fetchCategories(force = false) {
  if (!force && cache) return Promise.resolve(cache);
  if (!force && inflight) return inflight;
  inflight = base44.entities.CurtainCategory.list("order", 200)
    .then((rows) => {
      const list = (Array.isArray(rows) ? rows : [])
        .map(normalizeCategory)
        .filter((c) => c && c.slug)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "fa"));
      cache = list;
      inflight = null;
      return list;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

/** دسته‌های پرده از /api/entities/CurtainCategory — تنها منبع غیر‌فروشگاه
 *  @param {{ catalogOnly?: boolean }} [opts] اگر catalogOnly=true فقط دسته‌های دارای تیک کاتالوگ
 */
export function useCurtainCategories(opts = {}) {
  const catalogOnly = Boolean(opts?.catalogOnly);
  const [categories, setCategories] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

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
  }, []);

  useEffect(() => {
    let alive = true;
    reload(false).then((list) => {
      if (!alive && list) {
        /* unmounted */
      }
    });
    const onVis = () => {
      if (document.visibilityState === "visible") reload(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload]);

  const visible = catalogOnly ? filterCatalogCategories(categories) : categories;
  return { categories: visible, allCategories: categories, loading, error, reload };
}

export function refreshCurtainCategories() {
  cache = null;
  inflight = null;
}

export function getCategoryMechanismMap() {
  const list = cache || [];
  const map = {};
  for (const c of list) {
    if (c.slug && c.mechanism) map[c.slug] = c.mechanism;
  }
  return map;
}

export function pickCategoriesByOrder(categories, limit = 8) {
  if (!categories?.length) return [];
  return categories.slice(0, limit);
}

export function pickFeaturedCategories(categories, limit = 6) {
  if (!categories?.length) return [];
  const withDesc = categories.filter((c) => c.description);
  const pool = withDesc.length >= 2 ? withDesc : categories;
  return pool.slice(0, limit);
}

export function pickVisualCategories(categories, limit = 6) {
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

export function pickSystemCategories(categories, limit = 6) {
  if (!categories?.length) return [];
  const system = categories.filter(
    (c) =>
      (c.mechanism && SYSTEM_MECHANISMS.has(c.mechanism)) ||
      (c.subcategories && c.subcategories.length > 0)
  );
  const pool = system.length >= 2 ? system : categories;
  return pool.slice(0, limit);
}

export function pickSecondaryCategories(categories, limit = 8) {
  if (!categories?.length) return [];
  const featured = pickFeaturedCategories(categories, 6);
  const featuredSlugs = new Set(featured.map((c) => c.slug));
  const rest = categories.filter((c) => !featuredSlugs.has(c.slug));
  if (rest.length >= 2) return rest.slice(0, limit);
  return categories.slice(Math.floor(categories.length / 2), Math.floor(categories.length / 2) + limit);
}
