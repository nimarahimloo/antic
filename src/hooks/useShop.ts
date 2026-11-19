"use client";

// Catalog queries run on Wix before pagination. A changed selection starts a fresh cursor chain.
import { useCallback, useEffect, useRef, useState } from "react";
import { searchProducts, queryCategories, CATALOG_SORTS } from "@/rest/store-catalog";
import { apiErrorMessage } from "@/lib/apiError";

export const SORTS = CATALOG_SORTS;
const SYSTEM_CATEGORY_SLUG = "all-products";

interface Product {
  id: string;
  slug: string;
  name: string;
  [key: string]: unknown;
}

interface Category {
  id: string;
  slug: string;
  name: string;
  visible?: boolean;
  [key: string]: unknown;
}

interface PageState {
  key: string | null;
  products: Product[] | null;
  cursor: string | null;
  error: string | null;
  loadingMore: boolean;
}

interface UseShopReturn {
  categories: Category[];
  activeCategory: Category | null;
  setActiveCategory: (cat: Category | null) => void;
  sort: string;
  setSort: (sort: string) => void;
  filters: Record<string, unknown>;
  setFilters: (filters: Record<string, unknown>) => void;
  products: Product[] | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
}

export function useShop({ pageSize = 24 } = {}): UseShopReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [sort, setSort] = useState("featured");
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<PageState>({ key: null, products: null, cursor: null, error: null, loadingMore: false });
  const generation = useRef(0);
  const pendingMore = useRef<{ generation: number; key: string } | null>(null);
  const key = JSON.stringify([
    pageSize,
    activeCategory?.id ?? null,
    sort,
    filters.minPrice ?? null,
    filters.maxPrice ?? null,
    !!filters.inStockOnly,
    filters.search ?? "",
    attempt,
  ]);
  const currentKey = useRef(key);
  currentKey.current = key;

  useEffect(() => {
    let alive = true;
    queryCategories({ limit: 100 })
      .then(({ categories: list }) => {
        if (alive) setCategories((list || []).filter((c) => c.visible !== false && c.slug !== SYSTEM_CATEGORY_SLUG));
      })
      .catch(() => {
        if (alive) setCategories([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = ++generation.current;
    let alive = true;
    pendingMore.current = null;
    setPage({ key, products: null, cursor: null, error: null, loadingMore: false });
    const [limit, categoryId, selectedSort, minPrice, maxPrice, inStockOnly, search] = JSON.parse(key);
    searchProducts({ limit, categoryId, sort: selectedSort, minPrice, maxPrice, inStockOnly, search })
      .then((res) => {
        if (alive && generation.current === id && currentKey.current === key) {
          setPage({ key, products: res.products, cursor: res.nextCursor ?? null, error: null, loadingMore: false });
        }
      })
      .catch((e) => {
        if (alive && generation.current === id && currentKey.current === key) {
          setPage({ key, products: [], cursor: null, error: apiErrorMessage(e) || "Couldn't load products.", loadingMore: false });
        }
      });
    return () => {
      alive = false;
      generation.current++;
    };
  }, [key]);

  const loadMore = useCallback(async () => {
    if (page.key !== key || !page.cursor || pendingMore.current) return;
    const request = { generation: generation.current, key };
    pendingMore.current = request; // blocks repeated clicks before React rerenders
    const isCurrent = () => generation.current === request.generation && currentKey.current === key;
    setPage((p) => ({ ...p, loadingMore: true, error: null }));
    try {
      const res = await searchProducts({ limit: pageSize, cursor: page.cursor });
      if (isCurrent())
        setPage((p) => {
          const seen = new Set((p.products || []).map((product) => product.id));
          return {
            ...p,
            products: [
              ...(p.products || []),
              ...res.products.filter((product) => {
                if (seen.has(product.id)) return false;
                seen.add(product.id);
                return true;
              }),
            ],
            cursor: res.nextCursor ?? null,
          };
        });
    } catch (e) {
      if (isCurrent()) setPage((p) => ({ ...p, error: apiErrorMessage(e) || "Couldn't load more products." }));
    } finally {
      if (pendingMore.current === request) pendingMore.current = null;
      if (isCurrent()) setPage((p) => ({ ...p, loadingMore: false }));
    }
  }, [key, page.key, page.cursor, pageSize]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const current = page.key === key;
  return {
    categories,
    activeCategory,
    setActiveCategory,
    sort,
    setSort,
    filters,
    setFilters,
    products: current ? page.products : null,
    loading: !current || page.products === null,
    error: current ? page.error : null,
    retry,
    hasMore: current && !!page.cursor,
    loadMore,
    loadingMore: current && page.loadingMore,
  };
}