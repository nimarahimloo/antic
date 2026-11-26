"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { apiErrorMessage } from "@/lib/apiError";

interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  order: number;
  active: boolean;
}

interface Category {
  subcategories: unknown;
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
}

interface Project {
  id: string;
  title: string;
  cover_image?: string;
  subcategory?: string;
  categorySlug?: string;
}

interface CollectionPageContentProps {
  collection: Collection;
  categories: Category[];
  curtainCategories: Category[];
  slug: string;
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-secondary/50 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_24px_-6px_rgba(201,162,39,0.15)]">
        <div className="absolute inset-0">
          {project.cover_image ? (
            <img
              src={project.cover_image}
              alt={project.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#d9cfc0] via-[#b5a48c] to-[#8f7d64]" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
        <div className="relative mt-auto flex flex-1 flex-col justify-end p-5">
          <span className="mb-2 block font-display text-[10px] tracking-[0.35em] text-primary/90">
            نمونه اجرا
          </span>
          <h3 className="font-display text-lg font-black text-foreground group-hover:text-primary transition-colors">
            {project.title}
          </h3>
          {project.subcategory && (
            <p className="mt-2 font-body text-sm text-muted-foreground line-clamp-1">
              {project.subcategory}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProjectsGrid({ projects, loading }: { projects: Project[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="animate-pulse rounded-xl border border-secondary/60 bg-secondary/30 aspect-[4/3]" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50 mb-4">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-bold text-foreground mb-2">
          پروژه‌ای در این مجموعه یافت نشد
        </h3>
        <p className="font-body text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          به‌زودی نمونه‌های اجرا در این مجموعه اضافه می‌شود.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

export function CollectionPageContent({ collection, categories, curtainCategories, slug }: CollectionPageContentProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const activeCategory = searchParams.get("category") || undefined;
  const activeSubcategory = searchParams.get("subcategory") || undefined;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load projects for the collection with optional category filter
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const params = new URLSearchParams();
    if (activeCategory) params.set("categorySlug", activeCategory);
    fetch(`/api/entities/Collection/${encodeURIComponent(slug)}/projects?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error("خطا در بارگذاری پروژه‌ها");
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        setProjects(Array.isArray(data?.projects) ? data.projects : []);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load collection projects:", apiErrorMessage(err));
        if (!alive) return;
        setError("امکان بارگذاری پروژه‌ها وجود ندارد. لطفاً دوباره تلاش کنید.");
        setProjects([]);
      })
      .finally(() => {
        if (alive) setLoadedSlug(slug);
      });
    return () => { alive = false };
  }, [slug, activeCategory]);

  const loadingProjects = loadedSlug !== slug;

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => {
        if (activeCategory && p.categorySlug !== activeCategory) return false;
        if (activeSubcategory && p.subcategory !== activeSubcategory) return false;
        return true;
      }),
    [projects, activeCategory, activeSubcategory]
  );

  // Get subcategories for the active category
  const activeCat = useMemo(
    () =>
      categories.find((c) => c.slug === activeCategory) ||
      curtainCategories.find((c) => c.slug === activeCategory) ||
      null,
    [categories, curtainCategories, activeCategory]
  );

  const subcategories = useMemo<{ name: string; slug: string }[]>(
    () => {
      if (!activeCat?.subcategories) return [];
      try {
        const parsed =
          typeof activeCat.subcategories === "string"
            ? JSON.parse(activeCat.subcategories)
            : activeCat.subcategories;
        return Array.isArray(parsed)
          ? parsed
              .map((s: unknown) => {
                const record = s as Record<string, unknown>;
                return {
                  name: typeof s === "string" ? s : String(record.name || ""),
                  slug:
                    typeof s === "string"
                      ? s
                      : String(record.slug || record.name || ""),
                };
              })
              .filter((s) => s.slug)
          : [];
      } catch {
        return [];
      }
    },
    [activeCat]
  );

  const handleCategoryChange = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams);
    if (categorySlug) params.set("category", categorySlug);
    else params.delete("category");
    params.delete("subcategory");
    replace(pathname + "?" + params.toString());
  };

  const handleSubcategoryChange = (subcategorySlug: string) => {
    const params = new URLSearchParams(searchParams);
    if (subcategorySlug) params.set("subcategory", subcategorySlug);
    else params.delete("subcategory");
    replace(pathname + "?" + params.toString());
  };

  return (
    <div className="bg-background pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10 lg:pt-12">
        <nav className="flex flex-wrap items-center gap-2 font-body text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">
            خانه
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/collections" className="transition-colors hover:text-primary">
            مجموعه‌ها
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{collection.title}</span>
        </nav>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
            <p className="font-body text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                window.dispatchEvent(new Event("collection-retry"));
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-destructive px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
            >
              دوباره تلاش کنید
            </button>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <span className="eyebrow mb-3 block">مجموعه</span>
            <h1 className="font-display text-3xl font-black text-foreground lg:text-4xl">
              {collection.title}
            </h1>
            {collection.description ? (
              <p className="mt-5 font-body text-base leading-relaxed text-muted-foreground">
                {collection.description}
              </p>
            ) : null}
          </div>
          {collection.coverImage ? (
            <div className="relative overflow-hidden rounded-2xl border border-secondary/60">
              <img
                src={collection.coverImage}
                alt={collection.title}
                className="h-[300px] w-full object-cover lg:h-[400px]"
                loading="lazy"
              />
            </div>
          ) : null}
        </div>

        {/* Category Filter */}
        <div className="mt-12 lg:mt-16">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">
              فیلتر دسته‌بندی
            </h2>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryChange("")}
              className={
                "rounded-full border px-4 py-2 font-body text-sm transition-colors " +
                (!activeCategory
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/70 text-muted-foreground hover:border-primary/50")
              }
            >
              همه
            </button>
            {curtainCategories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => handleCategoryChange(c.slug)}
                className={
                  "rounded-full border px-4 py-2 font-body text-sm transition-colors " +
                  (activeCategory === c.slug
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-secondary/70 text-muted-foreground hover:border-primary/50")
                }
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Subcategory Filter */}
          {activeCategory && subcategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSubcategoryChange("")}
                className={
                  "rounded-full border px-3 py-1.5 font-body text-xs transition-colors " +
                  (!activeSubcategory
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-secondary/70 text-muted-foreground hover:border-primary/50")
                }
              >
                همه
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => handleSubcategoryChange(sub.slug)}
                  className={
                    "rounded-full border px-3 py-1.5 font-body text-xs transition-colors " +
                    (activeSubcategory === sub.slug
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-secondary/70 text-muted-foreground hover:border-primary/50")
                  }
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 lg:mt-14">
          <h2 className="mb-6 font-display text-lg font-bold text-foreground">
            پروژه‌های {collection.title}
          </h2>
          <ProjectsGrid projects={filteredProjects} loading={loadingProjects} />
        </div>
      </section>
    </div>
  );
}
