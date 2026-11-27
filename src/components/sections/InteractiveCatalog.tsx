"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Phone, X, ChevronLeft } from "lucide-react";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import CatalogCard from "@/components/catalog/CatalogCard";
import ProjectCard from "@/components/ProjectCard";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { apiErrorMessage } from "@/lib/apiError";
import { api } from "@/api";
import { SITE_PHONE_HREF } from "@/lib/siteContact";
import { getRootCategories, parseSubs } from "@/lib/categoryTree";
import { getCategoryProjects, getCurtainModelRelatedProjects, RelatedProject } from "@/rest/store-catalog";
import { CatalogCardSkeleton, CurtainPreviewSkeleton } from "./InteractiveCatalogSkeletons";

/**
 * کاتالوگ تعاملی — صفحات models
 * دسته‌های مادر + زیردسته‌ها (flat list)
 * - جستجوی زنده با debounce
 * - کلیک روی دسته → نمایش مدل‌های آن دسته
 */
export default function InteractiveCatalog({ initialCategory }: { initialCategory?: string }) {
  const { categories: allCats, loading: catsLoading } = useCurtainCategories({
    catalogOnly: true,
  });

  // دسته‌های مادر + زیردسته‌ها به صورت لیست شسته (flat) تا هر دو در UI نمایش داده شوند
  const categories = useMemo(() => {
    const roots = getRootCategories(allCats, { includeSpace: false });
    const flat: Array<{ slug: string; name: string; image: string | null; isSub: boolean; parentSlug?: string }> = [];
    for (const root of roots) {
      flat.push({ slug: root.slug, name: root.name, image: root.image || null, isSub: false });
      for (const sub of parseSubs(root.subcategories)) {
        flat.push({ slug: sub.slug, name: sub.name, image: null, isSub: true, parentSlug: root.slug });
      }
    }
    return flat;
  }, [allCats]);

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  // Combined filter state to prevent duplicate fetches when both category and subcategory change
  const [filterKey, setFilterKey] = useState(0);
  const [gridItems, setGridItems] = useState<Record<string, unknown>[]>([]);
  const [projectFallback, setProjectFallback] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const countsLoaded = useRef(false);
  // Related projects state
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
  const [isDragging, setIsDragging] = useState(false);

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
    if (e.pointerType === "mouse" && e.button !== 0) return;
    
    // Don't start dragging if clicking on a category button or its children
    const target = e.target as HTMLElement;
    if (target.closest('[data-card]') || target.closest('button')) {
      return;
    }
    
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
      pointerId: e.pointerId,
    };
    pauseAuto();
    setIsDragging(true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  const endDrag = (_e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    if (el && dragRef.current.pointerId != null) {
      try {
        el.releasePointerCapture(dragRef.current.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    setIsDragging(false);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      // A drag happened, suppress the click
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
    // If not moved, let the click propagate normally to the button
  };

  useEffect(() => {
    if (!allCats.length) return;
    if (initialCategory && allCats.find((c) => c.slug === initialCategory)) {
      setSelectedCategory(initialCategory);
    } else if (!selectedCategory || !allCats.find((c) => c.slug === selectedCategory)) {
      setSelectedCategory(allCats[0].slug);
    }
  }, [allCats, initialCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const category = allCats.find((c) => c.slug === selectedCategory);

  useEffect(() => {
    setSelectedSubcategory("");
  }, [selectedCategory]);

  // Debounce search so the API isn't hammered on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selectedCategory && !debouncedSearch.trim()) {
      setTimeout(() => {
        setGridItems([]);
        setProjectFallback([]);
        setLoading(false);
      }, 0);
      return;
    }
    setLoading(true);
    const q = debouncedSearch.trim();
    const filter: Record<string, string> = {};
    if (!q) {
      if (selectedCategory) filter.category_slug = selectedCategory;
      if (selectedSubcategory) filter.subcategory = selectedSubcategory;
    }
    api.entities.CurtainModel.filter(filter, {
      sort: "-created_date",
      limit: 80,
      search: q || undefined,
    })
      .then(async (data) => {
        const models = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
        setGridItems(models);
        if (!q && models.length === 0 && selectedCategory) {
          try {
            const pf: Record<string, string> = { category_slug: selectedCategory };
            if (selectedSubcategory) pf.subcategory = selectedSubcategory;
            const projects = await api.entities.Project.filter(pf, {
              sort: "-created_date",
              limit: 24,
            });
            setProjectFallback((Array.isArray(projects) ? projects : []) as Record<string, unknown>[]);
          } catch (err) {
            console.error("Failed to load project fallback:", apiErrorMessage(err));
            setProjectFallback([]);
          }
        } else {
          setProjectFallback([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load models:", apiErrorMessage(err));
        setGridItems([]);
        setProjectFallback([]);
      })
      .finally(() => setLoading(false));
  }, [filterKey, debouncedSearch, selectedCategory, selectedSubcategory]);

  // Fetch related projects when category or selected model changes
  useEffect(() => {
    let cancelled = false;
    setRelatedProjectsLoading(true);

    const fetchProjects = async () => {
      try {
        let projects: RelatedProject[] = [];

        // If a model is selected, fetch its directly related projects
        if (selectedModel?.id) {
          projects = await getCurtainModelRelatedProjects(String(selectedModel.id), 6);
        }
        // Otherwise if a category is selected (and no search), fetch category projects
        else if (selectedCategory && !debouncedSearch.trim()) {
          projects = await getCategoryProjects(selectedCategory, selectedSubcategory || undefined, 6);
        }

        if (!cancelled) {
          setRelatedProjects(projects);
        }
      } catch (err) {
        console.error("Failed to load related projects:", err);
        if (!cancelled) {
          setRelatedProjects([]);
        }
      } finally {
        if (!cancelled) {
          setRelatedProjectsLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [filterKey, selectedModel, selectedCategory, selectedSubcategory, debouncedSearch]);

  // Category counts: deferred + batched to avoid hammering the server on page load
  useEffect(() => {
    if (!allCats.length || countsLoaded.current) return;
    countsLoaded.current = true;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const counts: Record<string, number> = {};
      const batchSize = 5;
      for (let i = 0; i < allCats.length; i += batchSize) {
        const batch = allCats.slice(i, i + batchSize);
        await Promise.all(batch.map(async (c) => {
          try {
            const n = await api.entities.CurtainModel.count({ category_slug: c.slug });
            if (!cancelled) counts[c.slug] = typeof n === "number" ? n : (n as { count: number })?.count || 0;
          } catch {
            if (!cancelled) counts[c.slug] = 0;
          }
        }));
        if (cancelled) break;
      }
      if (!cancelled) setCategoryCounts(counts);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [allCats]);

  useEffect(() => {
    if (gridItems.length > 0) {
      if (!selectedModel || !gridItems.find((m) => m.id === selectedModel.id)) {
        setSelectedModel(gridItems[0]);
      }
    } else {
      setSelectedModel(null);
    }
  }, [gridItems]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && categories.length === 0) {
    return (
      <section className="border-b border-secondary/40 bg-background py-10">
        <div className="mx-auto flex max-w-7xl gap-5 overflow-hidden px-5 lg:px-10">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 w-44 shrink-0 animate-pulse rounded-2xl bg-secondary/40 lg:h-56 lg:w-56" />
          ))}
        </div>
      </section>
    );
  }

  if (!categories.length) return null;

  return (
    <section className="bg-background pb-16 pt-4 lg:pb-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-6 relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی مدل، کد یا رنگ…"
            className="w-full rounded-2xl border border-secondary bg-card py-3 pr-11 pl-11 font-body text-sm outline-none focus:border-primary"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="پاک کردن جستجو"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* کارت کاور دسته‌ها */}
        <div
          ref={scrollerRef}
          dir="ltr"
          className="flex cursor-grab gap-3 overflow-x-auto no-scrollbar pb-1 active:cursor-grabbing lg:gap-4"
          style={{ scrollBehavior: isDragging ? "auto" : undefined, touchAction: "pan-x" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
        >
          {catsLoading && !categories.length
            ? [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 w-28 shrink-0 animate-pulse rounded-2xl bg-secondary/40 lg:h-32 lg:w-32"
                />
              ))
            : categories.map((cat) => {
                const active = selectedCategory === cat.slug && !search.trim();
                return (
                  <button
                    type="button"
                    key={cat.slug}
                    data-card
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearch("");
                      // Batch state updates to prevent duplicate fetches
                      setSelectedSubcategory(cat.isSub ? "" : "");
                      setSelectedCategory(cat.parentSlug || cat.slug);
                      setFilterKey((k) => k + 1);
                    }}
                    className={`group relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border transition-all lg:h-32 lg:w-32 ${
                      active
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-secondary/60 hover:border-primary/60"
                    }`}
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/40">
                        <span className="px-2 text-center font-display text-[11px] font-bold text-muted-foreground">
                          {cat.name}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-center">
                      <span className={`font-display text-[11px] font-bold ${cat.isSub ? "text-muted-foreground" : "text-foreground"} lg:text-xs`}>
                        {cat.isSub ? `↳ ${cat.name}` : cat.name}
                      </span>
                      {categoryCounts[cat.parentSlug || cat.slug] != null && !cat.isSub && (
                        <span className="mt-0.5 block font-body text-[9px] text-muted-foreground">
                          {categoryCounts[cat.parentSlug || cat.slug]} مدل
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
        </div>

        {!search.trim() && (category?.subcategories?.length ?? 0) > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
            <button
              type="button"
              onClick={() => {
                setSelectedSubcategory("");
                setFilterKey((k) => k + 1);
              }}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] ${
                !selectedSubcategory
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/70 text-muted-foreground"
              }`}
            >
              همه
            </button>
            {category?.subcategories.map((sub) => (
              <button
                key={sub.slug}
                type="button"
                onClick={() => {
                  setSelectedSubcategory(sub.slug);
                  setFilterKey((k) => k + 1);
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] ${
                  selectedSubcategory === sub.slug
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-secondary/70 text-muted-foreground"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-5">
          {/* RTL: Preview on RIGHT (col-span-3), List on LEFT (col-span-2) */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            {selectedModel ? (
              <motion.div
                key={selectedModel.id as string}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-secondary/60 bg-card p-5 lg:p-6"
              >
                <CurtainPreview fabric={selectedModel as Record<string, unknown>} publicMode />
                <div className="mt-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-foreground">{selectedModel.code as string}</p>
                    <p className="font-body text-xs text-muted-foreground">{selectedModel.name as string}</p>
                  </div>
                  {(() => {
                    const colorCode = selectedModel.color_code;
                    if (!colorCode) return null;
                    return (
                      <span
                        className="h-9 w-9 rounded-lg border border-secondary/60"
                        style={{ backgroundColor: String(colorCode) }}
                      />
                    );
                  })()}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(() => {
                    const color = selectedModel.color;
                    if (!color) return null;
                    return <Spec label="رنگ" value={String(color)} />;
                  })()}
                  {(() => {
                    const fabric = selectedModel.fabric;
                    if (!fabric) return null;
                    return <Spec label="پارچه" value={String(fabric)} />;
                  })()}
                  {(() => {
                    const material = selectedModel.material;
                    if (!material) return null;
                    return <Spec label="جنس" value={String(material)} />;
                  })()}
                  {(() => {
                    const texture = selectedModel.texture;
                    if (!texture) return null;
                    return <Spec label="بافت" value={String(texture)} />;
                  })()}
                </div>
                {(() => {
                  const description = selectedModel.description;
                  if (!description) return null;
                  return (
                    <p className="mt-4 font-body text-xs leading-6 text-muted-foreground">
                      {String(description)}
                    </p>
                  );
                })()}
                <Link
                  href={`/curtain/${selectedModel.id as string}`}
                  className="btn-ghost-gold mt-4 w-full justify-center text-xs"
                >
                  مشاهدهٔ جزئیات کامل
                </Link>
                <a href={SITE_PHONE_HREF} className="btn-gold mt-3 w-full justify-center">
                  <Phone className="h-4 w-4" /> مشاوره و سفارش
                </a>
              </motion.div>
            ) : loading ? (
              <CurtainPreviewSkeleton />
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-secondary/60 bg-card/40 p-8 text-center">
                <p className="font-body text-sm text-muted-foreground">
                  یک مدل را از سمت چپ انتخاب کنید
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-foreground">
                {search.trim()
                  ? "نتایج جستجو"
                  : category
                    ? category.name
                    : "مدل‌ها"}
              </h2>
              <span className="font-body text-[11px] text-muted-foreground">
                {loading
                  ? "…"
                  : gridItems.length
                    ? `${gridItems.length} مدل`
                    : projectFallback.length
                      ? `${projectFallback.length} نمونه`
                      : ""}
              </span>
            </div>

            <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-secondary/60 bg-card/50 p-3">
              {loading ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <CatalogCardSkeleton key={i} />
                  ))}
                </div>
              ) : gridItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {gridItems.map((m) => (
                    <CatalogCard
                      key={m.id as string}
                      model={m as { id: string; code: string; name: string; install_image?: string; image?: string; color_code?: string; fabric?: string; color?: string }}
                      active={selectedModel?.id === m.id}
                      onClick={() => setSelectedModel(m)}
                    />
                  ))}
                </div>
              ) : projectFallback.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {projectFallback.map((p) => (
                    <ProjectCard key={p.id as string} project={p as { id: string; title: string; cover_image?: string }} />
                  ))}
                  <Link
                    href={`/projects/category/${selectedCategory}`}
                    className="col-span-full mt-1 rounded-xl border border-primary/40 bg-primary/5 py-3 text-center font-body text-xs font-bold text-primary"
                  >
                    مشاهده همه نمونه‌های این دسته ←
                  </Link>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="font-body text-sm text-muted-foreground">
                    {search.trim()
                      ? "نتیجه‌ای پیدا نشد"
                      : "هنوز مدل یا نمونه‌اجرایی در این دسته ثبت نشده است"}
                  </p>
                  <Link href="/projects" className="mt-3 inline-block font-body text-xs text-primary underline">
                    رفتن به نمونه‌های اجرا شده
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Projects Section */}
      {(relatedProjects.length > 0 || relatedProjectsLoading) && (
        <section className="border-t border-secondary/60 bg-background pt-16 pb-8">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                {selectedModel
                  ? `پروژه‌های مرتبط با ${(selectedModel as { name?: string }).name || "این مدل"}`
                  : selectedCategory
                    ? `نمونه‌های اجرا شده در ${(allCats.find(c => c.slug === selectedCategory) as { name?: string })?.name || "این دسته"}`
                    : "پروژه‌های مرتبط"}
              </h2>
              {selectedCategory && (
                <Link
                  href={`/projects/category/${selectedCategory}${selectedSubcategory ? `?subcategory=${selectedSubcategory}` : ""}`}
                  className="font-body text-xs text-primary hover:underline flex items-center gap-1"
                >
                  مشاهده همه
                  <ChevronLeft className="h-3 w-3" />
                </Link>
              )}
            </div>

            {relatedProjectsLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] rounded-2xl bg-secondary/30" />
                    <div className="mt-3 h-5 w-3/4 rounded bg-secondary/30" />
                    <div className="h-4 w-1/2 rounded bg-secondary/30" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group block"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_rgba(201,162,39,0.35)]">
                      <div className="absolute inset-0">
                        {project.cover_image ? (
                          <img
                            src={project.cover_image}
                            alt={project.title}
                            className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-[#d9cfc0] via-[#b5a48c] to-[#8f7d64]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                      <div className="relative mt-auto flex flex-1 flex-col justify-end p-6">
                        <span className="mb-2 font-display text-[10px] tracking-[0.35em] text-primary/90">
                          نمونه اجرا
                        </span>
                        <h3 className="font-display text-lg font-black text-foreground">{project.title}</h3>
                        {project.subcategory && (
                          <p className="mt-1 font-body text-sm text-muted-foreground line-clamp-1">{project.subcategory}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/50 px-3 py-2">
      <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      <p className="font-display text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}