import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Phone, X } from "lucide-react";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import CatalogCard from "@/components/catalog/CatalogCard";
import { ALL_CATEGORIES as FALLBACK_CATEGORIES } from "@/lib/catalogData";
import { base44 } from "@/api/base44Client";

export default function InteractiveCatalog({ initialCategory }) {
  // دسته‌ها از دیتابیس (قابل مدیریت از پنل)؛ در نبودِ آن‌ها از فایل ایستا
  const [dbCategories, setDbCategories] = useState(null);

  useEffect(() => {
    base44.entities.CurtainCategory
      .list("order", 100)
      .then((data) => setDbCategories(data?.length ? data : null))
      .catch(() => setDbCategories(null));
  }, []);

  const CATEGORIES = dbCategories || FALLBACK_CATEGORIES;

  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory && CATEGORIES.find((c) => c.slug === initialCategory)
      ? initialCategory
      : CATEGORIES[0]?.slug
  );
  const category = CATEGORIES.find((c) => c.slug === selectedCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    category?.subcategories?.[0]?.slug || ""
  );

  // مدل‌ها از سرور فیلتر می‌شوند — هر تغییر دسته/زیردسته/جستجو یک کوئری جدید
  const [gridItems, setGridItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryCounts, setCategoryCounts] = useState({});

  useEffect(() => {
    const cat = CATEGORIES.find((c) => c.slug === selectedCategory);
    setSelectedSubcategory(cat?.subcategories?.[0]?.slug || "");
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    const q = search.trim();
    let query;
    if (q) {
      const r = { $regex: q, $options: "i" };
      query = { $or: [{ code: r }, { name: r }, { fabric: r }, { color: r }, { description: r }] };
    } else {
      query = { category_slug: selectedCategory };
      if (selectedSubcategory) query.subcategory = selectedSubcategory;
    }
    base44.entities.CurtainModel
      .filter(query, { sort: "-created_date", limit: 50 })
      .then((data) => setGridItems(data?.items || []))
      .catch(() => setGridItems([]))
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedSubcategory, search]);

  // شمارش مدل‌ها به تفکیک دسته — برای نمایش روی تب‌ها
  useEffect(() => {
    base44.entities.CurtainModel
      .aggregate({ groupBy: "category_slug" })
      .then((data) => {
        const counts = {};
        data?.rows?.forEach((r) => { if (r.category_slug) counts[r.category_slug] = r.count; });
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
  }, [gridItems, selectedModel]);

  return (
    <section id="catalog" className="relative overflow-hidden bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="eyebrow mb-3 block">کاتالوگ تعاملی</span>
            <h2 className="font-display text-2xl font-black text-foreground lg:text-4xl">
              پرده را روی <span className="text-gold-gradient">پنجره</span> ببینید
            </h2>
            <p className="mt-3 max-w-lg font-body text-sm leading-7 text-muted-foreground">
              نمونهٔ پارچه را انتخاب کنید؛ بافت روی فرم سه‌بعدی پرده قرار می‌گیرد و نور، سایه و چین‌ها در مرورگر رندر می‌شوند؛ بدون تولید تصویر برای هر مدل.
            </p>
          </div>
          <Link to="/#contact" className="btn-ghost-gold shrink-0">تماس و مشاوره</Link>
        </div>

        {/* جستجوی هوشمند — بالای کاتالوگ */}
        <div className="relative mb-8">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی هوشمند: نام مدل، کد محصول، رنگ یا جنس پارچه…"
            className="w-full rounded-2xl border border-secondary/70 bg-card py-4 pr-12 pl-12 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="پاک کردن جستجو"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* تب دسته‌ها */}
        <div className="mb-8 flex gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setSearch("");
                setSelectedCategory(cat.slug);
              }}
              className={`shrink-0 rounded-full border px-5 py-2.5 font-display text-xs font-bold transition-all duration-300 ${
                selectedCategory === cat.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {cat.name}
              {categoryCounts[cat.slug] != null && (
                <span className={`mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                  selectedCategory === cat.slug
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground"
                }`}>
                  {categoryCounts[cat.slug]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* پیش‌نمایش روی پنجره */}
          <div className="lg:col-span-3">
            <div className="relative">
              <CurtainPreview fabric={selectedModel} />
            </div>

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
                    <span className="h-9 w-9 rounded-lg border border-secondary/60" style={{ backgroundColor: selectedModel.color_code }} />
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {selectedModel.fabric && <Spec label="نوع پارچه" value={selectedModel.fabric} />}
                  {selectedModel.color && <Spec label="رنگ" value={selectedModel.color} />}
                  {selectedModel.material && <Spec label="ترکیب" value={selectedModel.material} />}
                  {selectedModel.texture && <Spec label="بافت" value={selectedModel.texture} />}
                </div>
                {selectedModel.description && (
                  <p className="mt-4 font-body text-xs leading-6 text-muted-foreground">{selectedModel.description}</p>
                )}
                <Link to={`/curtain/${selectedModel.id}`} className="btn-ghost-gold mt-4 w-full justify-center text-xs">
                  مشاهدهٔ جزئیات کامل
                </Link>
                <a href="tel:02112345678" className="btn-gold mt-3 w-full justify-center">
                  <Phone className="h-4 w-4" /> مشاوره و سفارش
                </a>
              </motion.div>
            )}
          </div>

          {/* کنترل‌ها و نمونه‌ها */}
          <div className="lg:col-span-2">
            {!search.trim() && category?.subcategories?.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {category.subcategories.map((sub) => (
                  <button
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
                {search.trim() ? "نتیجهٔ جستجو" : "انتخاب پارچه"}
              </span>
              <span className="font-body text-[11px] text-muted-foreground">{loading ? "…" : `${gridItems.length} مدل`}</span>
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
                    {search.trim() ? "نتیجه‌ای پیدا نشد" : "هنوز مدلی ثبت نشده است"}
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