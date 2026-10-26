import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Phone, X } from "lucide-react";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import CatalogCard from "@/components/catalog/CatalogCard";
import ProjectCard from "@/components/ProjectCard";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { base44 } from "@/api/base44Client";
import { SITE_PHONE_HREF } from "@/lib/siteContact";

export default function InteractiveCatalog({ initialCategory }) {
  const { categories: CATEGORIES, loading: catsLoading } = useCurtainCategories({
    catalogOnly: true,
  });

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [gridItems, setGridItems] = useState([]);
  const [projectFallback, setProjectFallback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryCounts, setCategoryCounts] = useState({});

  useEffect(() => {
    if (!CATEGORIES.length) return;
    if (initialCategory && CATEGORIES.find((c) => c.slug === initialCategory)) {
      setSelectedCategory(initialCategory);
    } else if (!selectedCategory || !CATEGORIES.find((c) => c.slug === selectedCategory)) {
      setSelectedCategory(CATEGORIES[0].slug);
    }
  }, [CATEGORIES, initialCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const category = CATEGORIES.find((c) => c.slug === selectedCategory);

  useEffect(() => {
    setSelectedSubcategory("");
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedCategory && !search.trim()) {
      setGridItems([]);
      setProjectFallback([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = search.trim();
    const filter = {};
    if (!q) {
      if (selectedCategory) filter.category_slug = selectedCategory;
      if (selectedSubcategory) filter.subcategory = selectedSubcategory;
    }
    base44.entities.CurtainModel.filter(filter, {
      sort: "-created_date",
      limit: 80,
      search: q || undefined,
    })
      .then(async (data) => {
        const models = Array.isArray(data) ? data : [];
        setGridItems(models);
        if (!q && models.length === 0 && selectedCategory) {
          try {
            const pf = { category_slug: selectedCategory };
            if (selectedSubcategory) pf.subcategory = selectedSubcategory;
            const projects = await base44.entities.Project.filter(pf, {
              sort: "-created_date",
              limit: 24,
            });
            setProjectFallback(Array.isArray(projects) ? projects : []);
          } catch {
            setProjectFallback([]);
          }
        } else {
          setProjectFallback([]);
        }
      })
      .catch(() => {
        setGridItems([]);
        setProjectFallback([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedSubcategory, search]);

  useEffect(() => {
    if (!CATEGORIES.length) return;
    let cancelled = false;
    (async () => {
      const counts = {};
      await Promise.all(
        CATEGORIES.map(async (c) => {
          try {
            const n = await base44.entities.CurtainModel.count({ category_slug: c.slug });
            counts[c.slug] = typeof n === "number" ? n : n?.count || 0;
          } catch {
            counts[c.slug] = 0;
          }
        })
      );
      if (!cancelled) setCategoryCounts(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [CATEGORIES]);

  useEffect(() => {
    if (gridItems.length > 0) {
      if (!selectedModel || !gridItems.find((m) => m.id === selectedModel.id)) {
        setSelectedModel(gridItems[0]);
      }
    } else {
      setSelectedModel(null);
    }
  }, [gridItems]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="mb-8 flex gap-3 overflow-x-auto no-scrollbar pb-1" dir="rtl">
          {catsLoading && !CATEGORIES.length
            ? [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 w-28 shrink-0 animate-pulse rounded-2xl bg-secondary/40 lg:h-32 lg:w-32"
                />
              ))
            : CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.slug && !search.trim();
                return (
                  <button
                    type="button"
                    key={cat.slug}
                    onClick={() => {
                      setSearch("");
                      setSelectedCategory(cat.slug);
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
                      <span className="font-display text-[11px] font-bold text-foreground lg:text-xs">
                        {cat.name}
                      </span>
                      {categoryCounts[cat.slug] != null && (
                        <span className="mt-0.5 block font-body text-[9px] text-muted-foreground">
                          {categoryCounts[cat.slug]} مدل
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
        </div>

        {!search.trim() && category?.subcategories?.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
            <button
              type="button"
              onClick={() => setSelectedSubcategory("")}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-body text-[11px] ${
                !selectedSubcategory
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/70 text-muted-foreground"
              }`}
            >
              همه
            </button>
            {category.subcategories.map((sub) => (
              <button
                key={sub.slug}
                type="button"
                onClick={() => setSelectedSubcategory(sub.slug)}
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
          <div className="lg:col-span-3">
            {selectedModel ? (
              <motion.div
                key={selectedModel.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-secondary/60 bg-card p-5 lg:p-6"
              >
                <CurtainPreview fabric={selectedModel} publicMode />
                <div className="mt-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-foreground">{selectedModel.code}</p>
                    <p className="font-body text-xs text-muted-foreground">{selectedModel.name}</p>
                  </div>
                  {selectedModel.color_code && (
                    <span
                      className="h-9 w-9 rounded-lg border border-secondary/60"
                      style={{ backgroundColor: selectedModel.color_code }}
                    />
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {selectedModel.color && <Spec label="رنگ" value={selectedModel.color} />}
                  {selectedModel.fabric && <Spec label="پارچه" value={selectedModel.fabric} />}
                  {selectedModel.material && <Spec label="جنس" value={selectedModel.material} />}
                  {selectedModel.texture && <Spec label="بافت" value={selectedModel.texture} />}
                </div>
                {selectedModel.description && (
                  <p className="mt-4 font-body text-xs leading-6 text-muted-foreground">
                    {selectedModel.description}
                  </p>
                )}
                <Link
                  to={`/curtain/${selectedModel.id}`}
                  className="btn-ghost-gold mt-4 w-full justify-center text-xs"
                >
                  مشاهدهٔ جزئیات کامل
                </Link>
                <a href={SITE_PHONE_HREF} className="btn-gold mt-3 w-full justify-center">
                  <Phone className="h-4 w-4" /> مشاوره و سفارش
                </a>
              </motion.div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-secondary/60 bg-card/40 p-8 text-center">
                <p className="font-body text-sm text-muted-foreground">
                  {loading ? "در حال بارگذاری…" : "یک مدل را از سمت راست انتخاب کنید"}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
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
                    <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-secondary/40" />
                  ))}
                </div>
              ) : gridItems.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {gridItems.map((m) => (
                    <CatalogCard
                      key={m.id}
                      model={m}
                      active={selectedModel?.id === m.id}
                      onClick={() => setSelectedModel(m)}
                    />
                  ))}
                </div>
              ) : projectFallback.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {projectFallback.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                  <Link
                    to={`/projects/category/${selectedCategory}`}
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
                  <Link to="/projects" className="mt-3 inline-block font-body text-xs text-primary underline">
                    رفتن به نمونه‌های اجرا شده
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Spec({ label, value }) {
  return (
    <div className="rounded-lg bg-background/50 px-3 py-2">
      <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      <p className="font-display text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}
