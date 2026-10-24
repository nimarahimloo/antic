import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

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
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: row.image || null,
    description: row.description || "",
    order: Number(row.order) || 0,
    subcategories: parseSubs(row.subcategories),
  };
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

/** دسته‌های پرده از /api/entities/CurtainCategory */
export function useCurtainCategories() {
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
    // وقتی تب دوباره فعال شد، لیست را تازه کن (بعد از تغییر ادمین)
    const onVis = () => {
      if (document.visibilityState === "visible") reload(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload]);

  return { categories, loading, error, reload };
}

export function refreshCurtainCategories() {
  cache = null;
  inflight = null;
}
