import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Phone, X } from "lucide-react";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import CatalogCard from "@/components/catalog/CatalogCard";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { base44 } from "@/api/base44Client";

export default function InteractiveCatalog({ initialCategory }) {
  const { categories: CATEGORIES, loading: catsLoading } = useCurtainCategories();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [gridItems, setGridItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryCounts, setCategoryCounts] = useState({});

  // وقتی دسته‌ها از API آمدند، دستهٔ اولیه را ست کن
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
    const cat = CATEGORIES.find((c) => c.slug === selectedCategory);
    setSelectedSubcategory(cat?.subcategories?.[0]?.slug || "");
  }, [selectedCategory, CATEGORIES]);

  useEffect(() => {
    if (!selectedCategory && !search.trim()) {
      setGridItems([]);
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
      .then((data) => setGridItems(Array.isArray(data) ? data : []))
      .catch(() => setGridItems([]))
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedSubcategory, search]);

  useEffect(() => {
    base44.entities.CurtainModel.list("-created_date", 500)
      .then((rows) => {
        const counts = {};
        for (const r of rows || []) {
          const s = r.category_slug;
          if (s) counts[s] = (counts[s] || 0) + 1;
        }
        setCategoryCounts(counts);
      })
      .catch(() => {});
  }, []);

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
    <section id="catalog" className="relative overflow-hidden bg-background py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="eyebrow mb-2 block">انتخاب مدل</span>
            <h2 className="font-display text-xl font-black text-foreground lg:text-3xl">
              قاب پنجره · <span className="text-gold-gradient">نمونه نصب واقعی</span>
            </h2>
            <p className="mt-2 max-w-lg font-body text-sm leading-7 text-muted-foreground">
              دسته‌ها از پنل ادمین می‌آیند. مدل را انتخاب کنید؛ تصویر بزرگ همان نمونه نصب همان مدل است.
            </p>
          </div>
          <Link to="/#contact" className="btn-ghost-gold shrink-0">
            تماس و مشاوره
          </Link>
        </div>

        <div className="relative mb-6">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو با کد محصول، نام، رنگ، جنس یا بافت…"
            className="w-full rounded-2xl border border-secondary/70 bg-card py-4 pr-12 pl-12 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
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

        <div className="mb-8 flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
          {catsLoading && !CATEGORIES.length ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-secondary/40" />
            ))
          ) : (
            CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.slug}
                onClick={() => {
                  setSearch("");
                  setSelectedCategory(cat.slug);
                }}
                className={`shrink-0 rounded-full border px-5 py-2.5 font-display text-xs font-bold transition-all duration-300 ${
                  selectedCategory === cat.slug && !search.trim()
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {cat.name}
                {categoryCounts[cat.slug] != null && (
                  <span
                    className={`mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      selectedCategory === cat.slug && !search.trim()
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    {categoryCounts[cat.slug]}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CurtainPreview fabric={selectedModel} publicMode />

            {selectedModel && (
              <motion.div
                key={selectedModel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-5 rounded-2xl border border-secondary/60 bg-card p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-black text-foreground">{selectedModel.code}</p>
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
                  {selectedModel.fabric && <Spec label="نوع پارچه" value={selectedModel.fabric} />}
                  {selectedModel.color && <Spec label="رنگ" value={selectedModel.color} />}
                  {selectedModel.material && <Spec label="ترکیب" value={selectedModel.material} />}
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
                <a href="tel:02112345678" className="btn-gold mt-3 w-full justify-center">
                  <Phone className="h-4 w-4" /> مشاوره و سفارش
                </a>
              </motion.div>
            )}
          </div>

          <div className="lg:col-span-2">
            {!search.trim() && category?.subcategories?.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {category.subcategories.map((sub) => (
                  <button
                    type="button"
                    key={sub.slug}
                    onClick={() => setSelectedSubcategory(sub.slug)}
                    className={`rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
                      selectedSubcategory === sub.slug
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-secondary/60 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-xs font-bold text-foreground">
                {search.trim() ? "نتیجهٔ جستجو" : "انتخاب پارچه از کاتالوگ"}
              </span>
              <span className="font-body text-[11px] text-muted-foreground">
                {loading ? "…" : `${gridItems.length} مدل`}
              </span>
            </div>

            <div className="max-h-[560px] overflow-y-auto rounded-2xl border border-secondary/60 bg-card/50 p-3">
              {loading ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-secondary/40" />
                  ))}
                </div>
              ) : gridItems.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-body text-sm text-muted-foreground">
                    {search.trim() ? "نتیجه‌ای پیدا نشد" : "هنوز مدلی در این دسته ثبت نشده است"}
                  </p>
                </div>
              ) : (
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
