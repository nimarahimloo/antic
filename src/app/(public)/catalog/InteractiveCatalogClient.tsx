"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Phone, X } from "lucide-react";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import ProjectCard from "@/components/ProjectCard";
import { useCurtainCategories, Category, parseSubs } from "@/hooks/useCurtainCategories";
import { SITE_PHONE_HREF } from "@/lib/siteContact";
import { getRootCategories } from "@/lib/categoryTree";
import { searchProducts, getCurtainModelRelatedProjects, RelatedProject, ProductsResponse } from "@/rest/store-catalog";
import { CatalogCardSkeleton } from "@/components/sections/InteractiveCatalogSkeletons";
import { InteractiveCatalogSkeleton } from "@/components/sections/InteractiveCatalogSkeletons";
import { ModelGrid } from "./ModelGrid";
import { OptimizedImage } from "@/components/ui/image";

interface RawCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  subcategories: unknown;
  parent_slug: string | null;
}

interface InteractiveCatalogClientProps {
  initialCategories: RawCategory[];
  initialCategory?: string;
  initialCategoryCounts: Record<string, number>;
}

export default function InteractiveCatalogClient({
  initialCategories,
  initialCategory,
  initialCategoryCounts,
}: InteractiveCatalogClientProps) {
  const { categories: allCats, loading: catsLoading } = useCurtainCategories({
    catalogOnly: true,
    initialData: initialCategories,
  });

  // دسته‌های مادر + زیردسته‌ها به صورت لیست شسته (flat) تا هر دو در UI نمایش داده شوند
  const categories = useMemo(() => {
    const cats = allCats.length > 0 ? allCats : initialCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      description: "",
      order: 0,
      mechanism: null,
      subcategories: parseSubs(c.subcategories as unknown),
      inCatalog: true,
      in_catalog: true,
      backgroundImage: null,
      backgroundGradient: null,
    })) as Category[];
    const roots = getRootCategories(cats, { includeSpace: false });
    const flat: Array<{ slug: string; name: string; image: string | null; isSub: boolean; parentSlug?: string }> = [];
    for (const root of roots) {
      flat.push({ slug: root.slug, name: root.name, image: root.image || null, isSub: false });
      for (const sub of parseSubs(root.subcategories)) {
        flat.push({ slug: sub.slug, name: sub.name, image: null, isSub: true, parentSlug: root.slug });
      }
    }
    return flat;
  }, [allCats, initialCategories]);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [filterKey, setFilterKey] = useState(0);
  const [gridItems, setGridItems] = useState<Record<string, unknown>[]>([]);
  const [projectFallback, setProjectFallback] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryCounts, _setCategoryCounts] = useState<Record<string, number>>(initialCategoryCounts);
  const countsLoaded = useRef(false);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProject[]>([]);
  const [relatedProjectsLoading, setRelatedProjectsLoading] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    pointerId: null as number | null,
  });
  const resumeTimer = useRef<NodeJS.Timeout | null>(null);
  const [paused, setPaused] = useState(false);
  const [_isDragging, _setIsDragging] = useState(false);

  const pauseAuto = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!categories.length || paused) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el || dragRef.current.active) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;
      if (el.scrollLeft >= max - 2) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += 0.75;
      }
    }, 24);
    return () => clearInterval(id);
  }, [categories.length, paused]);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
      pointerId: e.pointerId,
    };
    el.setPointerCapture(e.pointerId);
    _setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const el = scrollerRef.current;
    if (el) el.releasePointerCapture(e.pointerId);
    dragRef.current.active = false;
    _setIsDragging(false);
  };

  // Load category counts
  useEffect(() => {
    if (countsLoaded.current || catsLoading) return;
    countsLoaded.current = true;
    // Counts already loaded from server
  }, [catsLoading]);

  // Fetch models when category/subcategory/search changes
  useEffect(() => {
    if (!selectedCategory) {
      (async () => {
        setGridItems([]);
        setLoading(false);
      })();
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
    })();

    searchProducts({
      categoryId: selectedCategory,
      search: debouncedSearch,
      limit: 50,
    })
      .then((res: ProductsResponse) => {
        if (!cancelled) {
          const items = res?.products ?? [];
          setGridItems(items);
          // Set fallback projects for initial render
          if (!selectedSubcategory) {
            setProjectFallback(items.slice(0, 6));
          }
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error("Failed to fetch models:", err);
          setGridItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterKey, debouncedSearch, selectedCategory, selectedSubcategory]);

  // Fetch related projects when model selected
  useEffect(() => {
    if (!selectedModel?.id) {
      (async () => {
        setRelatedProjects([]);
      })();
      return;
    }

    let cancelled = false;
    (async () => {
      setRelatedProjectsLoading(true);
    })();

    getCurtainModelRelatedProjects(selectedModel.id as string)
      .then((projects: RelatedProject[]) => {
        if (!cancelled) setRelatedProjects(projects);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error("Failed to fetch related projects:", err);
          setRelatedProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) setRelatedProjectsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedModel?.id]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Handle category click
  const handleCategoryClick = useCallback(
    (cat: { slug: string; parentSlug?: string; isSub: boolean }) => {
      if (cat.isSub) {
        setSelectedSubcategory(cat.slug);
        setSelectedCategory(cat.parentSlug || "");
      } else {
        setSelectedCategory(cat.slug);
        setSelectedSubcategory("");
      }
      setFilterKey((k) => k + 1);
      pauseAuto();
    },
    [pauseAuto]
  );

  // Handle model click
  const handleModelClick = useCallback((model: Record<string, unknown>) => {
    setSelectedModel(model);
    pauseAuto();
  }, [pauseAuto]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedModel(null);
    setRelatedProjects([]);
  }, []);

  if (catsLoading && !categories.length) {
    return <InteractiveCatalogSkeleton />;
  }

  // Render models grid content
  const renderModelsGrid = () => {
    if (selectedModel) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">مدل‌های دسته «{categories.find((c) => c.slug === selectedCategory)?.name}»</h2>
            <button
              onClick={clearSelection}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
              بازگشت به لیست
            </button>
          </div>
          <CurtainPreview
            fabric={{
              install_image: (selectedModel.install_image as string) || undefined,
              image: (selectedModel.image as string) || undefined,
              name: selectedModel.name as string,
              code: selectedModel.code as string,
            }}
            publicMode
          />
        </motion.div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">
            {selectedCategory
              ? `مدل‌های ${categories.find((c) => c.slug === selectedCategory)?.name ?? "دسته"}`
              : "دسته‌ای انتخاب نشده"}
          </h2>
          {selectedCategory && (
            <a
              href={`tel:${SITE_PHONE_HREF}`}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
            >
              <Phone className="h-4 w-4" />
              تماس برای سفارش
            </a>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <CatalogCardSkeleton key={i} />)}
          </div>
        ) : gridItems.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 font-body text-muted-foreground">
              {debouncedSearch
                ? `هیچ مدلی برای «${debouncedSearch}» یافت نشد`
                : "برای مشاهده مدل‌ها، یک دسته را انتخاب کنید"}
            </p>
          </div>
        ) : (
          <React.Fragment>
            <ModelGrid
              gridItems={gridItems}
              selectedModel={selectedModel}
              handleModelClick={handleModelClick}
            />

            {/* Related Projects Fallback */}
            {!selectedModel && projectFallback.length > 0 && (
              <div className="mt-8">
                <h3 className="font-display text-lg font-bold mb-4">پروژه‌های پیشنهادی</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectFallback.slice(0, 6).map((product) => (
                    <ProjectCard
                      key={product.id as string}
                      project={{
                        id: product.id as string,
                        title: product.name as string,
                        cover_image: product.image as string | undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </React.Fragment>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Category Scroller */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {categories.map((cat) => {
            const isActive =
              (cat.isSub && cat.slug === selectedSubcategory) ||
              (!cat.isSub && cat.slug === selectedCategory && !selectedSubcategory);
            const count = categoryCounts[cat.slug] ?? 0;
            return (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat)}
                className={`flex-shrink-0 flex flex-col items-center gap-2 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-background border border-secondary/40 hover:border-primary/50"
                }`}
                style={{ width: cat.isSub ? 100 : 120 }}
              >
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-secondary/30">
                  {cat.image ? (
                    <OptimizedImage
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold">
                        انتخاب شده
                      </span>
                    </div>
                  )}
                </div>
                <span className="font-body text-sm font-medium text-center leading-snug line-clamp-2">
                  {cat.name}
                </span>
                {count > 0 && (
                  <span className="font-body text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                    {count} مدل
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
        <input
          type="search"
          placeholder="جستجو در مدل‌ها..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-secondary/40 bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 font-body text-sm"
          aria-label="جستجوی مدل‌ها"
        />
      </div>

      {/* Content Area */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Models Grid */}
        <div className="min-w-0">
          {renderModelsGrid()}
        </div>

        {/* Related Projects Sidebar */}
        <aside className="lg:sticky lg:top-24 space-y-4">
          {selectedModel && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-background border border-secondary/40 rounded-2xl p-4"
            >
              <h3 className="font-display text-lg font-bold mb-4">پروژه‌های مرتبط</h3>
              {relatedProjectsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : relatedProjects.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">پروژه مرتبطی یافت نشد</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {relatedProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-secondary/30">
                        {project.cover_image ? (
                          <OptimizedImage
                            src={project.cover_image}
                            alt={project.title as string}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium truncate">{project.title}</p>
                        <p className="font-body text-xs text-muted-foreground truncate">{project.category_slug}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </aside>
      </div>
    </div>
  );
}
