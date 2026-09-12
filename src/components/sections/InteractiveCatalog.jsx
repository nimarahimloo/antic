import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Phone, Check, X, SlidersHorizontal, RotateCcw, Heart, Bookmark } from "lucide-react";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import SavedCurtainsDrawer from "@/components/catalog/SavedCurtainsDrawer";
import { useSavedCurtains } from "@/hooks/useSavedCurtains";
import { ALL_CATEGORIES as FALLBACK_CATEGORIES } from "@/lib/catalogData";
import { base44 } from "@/api/base44Client";

// طیف‌های رنگی پشتیبانی‌شده در فیلتر پیشرفته
const COLOR_FAMILIES = [
  { key: "cream", label: "سفید و کرم", hex: "#EFE6D5" },
  { key: "brown", label: "بژ و قهوه‌ای", hex: "#8B5A2B" },
  { key: "gold", label: "طلایی", hex: "#C9A227" },
  { key: "neutral", label: "خاکستری و مشکی", hex: "#4A4A4A" },
  { key: "blue", label: "آبی و سرمه‌ای", hex: "#2C3E5D" },
  { key: "green", label: "سبز", hex: "#3E6B4F" },
  { key: "red", label: "قرمز و زرشکی", hex: "#7B2D3B" },
  { key: "purple", label: "بنفش", hex: "#5B4A73" },
];

// تبدیل کد رنگ (hex) به طیف رنگی برای فیلتر
function colorFamily(hex) {
  if (!hex || typeof hex !== "string" || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim())) return null;
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  if (s < 0.15) {
    if (l > 0.75 && (d === 0 || (hue >= 15 && hue < 70))) return "cream";
    return "neutral";
  }
  if (hue > 330 || hue < 15) return "red";
  if (hue < 45) return l < 0.5 ? "brown" : "cream";
  if (hue < 62) return "gold";
  if (hue < 170) return "green";
  if (hue < 265) return "blue";
  return "purple";
}

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

  // همهٔ مدل‌ها یک‌بار بارگذاری می‌شوند؛ جستجو و فیلتر روی کل دیتاست
  const [allModels, setAllModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [search, setSearch] = useState("");
  const [fabricFilter, setFabricFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [colorOverride, setColorOverride] = useState("");
  const { saved, isSaved, toggleSave, remove, clear } = useSavedCurtains();
  const [savedOpen, setSavedOpen] = useState(false);

  useEffect(() => {
    const cat = CATEGORIES.find((c) => c.slug === selectedCategory);
    setSelectedSubcategory(cat?.subcategories?.[0]?.slug || "");
  }, [selectedCategory]);

  useEffect(() => {
    base44.entities.CurtainModel
      .list("-created_date", 500)
      .then((data) => setAllModels(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categoryModels = useMemo(
    () => allModels.filter((m) => m.category_slug === selectedCategory),
    [allModels, selectedCategory]
  );

  // در حالت جستجو، نتیجه‌ها از بین «همهٔ» مدل‌ها می‌آیند؛ وگرنه دسته + زیردسته
  const gridItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = q
      ? allModels.filter((m) =>
          [m.code, m.name, m.fabric, m.color, m.description].some(
            (v) => v && String(v).toLowerCase().includes(q)
          )
        )
      : allModels.filter(
          (m) =>
            m.category_slug === selectedCategory &&
            (!selectedSubcategory || m.subcategory === selectedSubcategory)
        );
    if (fabricFilter) items = items.filter((m) => m.fabric === fabricFilter);
    if (colorFilter) items = items.filter((m) => colorFamily(m.color_code) === colorFilter);
    return items;
  }, [allModels, search, selectedCategory, selectedSubcategory, fabricFilter, colorFilter]);

  // گزینه‌های فیلتر بر اساس دامنهٔ فعلی (همه در جستجو، دستهٔ جاری در مرور)
  const filterSource = useMemo(
    () => (search.trim() ? allModels : categoryModels),
    [search, allModels, categoryModels]
  );
  const availableFabrics = useMemo(
    () => [...new Set(filterSource.map((m) => m.fabric).filter(Boolean))],
    [filterSource]
  );
  const availableFamilies = useMemo(
    () => [...new Set(filterSource.map((m) => colorFamily(m.color_code)).filter(Boolean))],
    [filterSource]
  );

  // پالت رنگ زنده — برای پیش‌نمایش رنگ روی پنجره (با نام)
  const LIVE_COLORS = [
    { hex: "#F5EFE0", name: "عاج" },
    { hex: "#E8D5B0", name: "کرم" },
    { hex: "#D4C5B9", name: "بژ" },
    { hex: "#C9A227", name: "طلایی" },
    { hex: "#A67C00", name: "برنزی" },
    { hex: "#8B5A2B", name: "قهوه‌ای" },
    { hex: "#6B4226", name: "شکلاتی" },
    { hex: "#9B8B7A", name: "طوسی گرم" },
    { hex: "#4A4A4A", name: "زغالی" },
    { hex: "#1A1A1A", name: "مشکی" },
    { hex: "#2C3E5D", name: "سرمه‌ای" },
    { hex: "#3E6B4F", name: "یشمی" },
    { hex: "#7B2D3B", name: "زرشکی" },
    { hex: "#5B4A73", name: "بنفش" },
  ];

  // مدلِ نمایش‌داده‌شده روی پنجره — با رنگِ بازنویسی‌شدهٔ کاربر
  const previewModel = useMemo(
    () => (selectedModel && colorOverride ? { ...selectedModel, color_code: colorOverride } : selectedModel),
    [selectedModel, colorOverride]
  );

  const hasActiveFilters = !!(search.trim() || fabricFilter || colorFilter);

  function resetFilters() {
    setSearch("");
    setFabricFilter("");
    setColorFilter("");
  }

  useEffect(() => {
    if (gridItems.length > 0) {
      if (!selectedModel || !gridItems.find((m) => m.id === selectedModel.id)) {
        setSelectedModel(gridItems[0]);
      }
    } else {
      setSelectedModel(null);
    }
    setColorOverride("");
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
              دسته را انتخاب کنید، رنگ و طرح را عوض کنید. هر پارچه با همان رنگ و بافت دقیق روی پنجره اعمال می‌شود.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setSavedOpen(true)}
              className="btn-ghost-gold relative !px-5 !py-3"
            >
              <Bookmark className="h-4 w-4" />
              ذخیره‌ها
              {saved.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {saved.length}
                </span>
              )}
            </button>
            <Link to="/#contact" className="btn-ghost-gold shrink-0">تماس و مشاوره</Link>
          </div>
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
            </button>
          ))}
        </div>

        {/* فیلتر پیشرفته */}
        {!loading && allModels.length > 0 && (
          <div className="mb-8 rounded-2xl border border-secondary/60 bg-card/60 p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-display text-xs font-black text-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> فیلتر پیشرفته
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:text-primary"
                >
                  <RotateCcw className="h-3 w-3" /> پاک کردن همهٔ فیلترها
                </button>
              )}
            </div>

            {availableFabrics.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-body text-[11px] text-muted-foreground">جنس پارچه</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar" dir="rtl">
                  {availableFabrics.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFabricFilter((v) => (v === f ? "" : f))}
                      className={`shrink-0 rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
                        fabricFilter === f
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-secondary/60 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableFamilies.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 font-body text-[11px] text-muted-foreground">طیف رنگی</p>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_FAMILIES.filter((f) => availableFamilies.includes(f.key)).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setColorFilter((v) => (v === f.key ? "" : f.key))}
                      title={f.label}
                      className={`flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 transition-colors ${
                        colorFilter === f.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-secondary/60 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full border ${
                          colorFilter === f.key ? "border-primary" : "border-secondary/60"
                        }`}
                        style={{ backgroundColor: f.hex }}
                      />
                      <span className="font-body text-xs">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-5">
          {/* پیش‌نمایش روی پنجره */}
          <div className="lg:col-span-3">
            <div className="relative mx-auto max-w-[440px]">
              <VirtualWindow fabric={previewModel} />
              <div className="absolute bottom-4 right-4 z-10 rounded-full bg-background/80 px-4 py-2 backdrop-blur-md">
                <span className="font-display text-xs font-bold text-primary">{selectedModel ? selectedModel.code : category?.name}</span>
              </div>
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
                  <div className="flex items-center gap-2">
                    {selectedModel.color_code && (
                      <span className="h-9 w-9 rounded-lg border border-secondary/60" style={{ backgroundColor: selectedModel.color_code }} />
                    )}
                    <button
                      onClick={() => toggleSave(selectedModel, colorOverride)}
                      title={isSaved(selectedModel.id, colorOverride || selectedModel.color_code) ? "حذف از ذخیره‌شده‌ها" : "ذخیره برای بعد"}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 ${
                        isSaved(selectedModel.id, colorOverride || selectedModel.color_code)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-secondary/60 text-muted-foreground hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          isSaved(selectedModel.id, colorOverride || selectedModel.color_code) ? "fill-primary" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {selectedModel.fabric && <Spec label="نوع پارچه" value={selectedModel.fabric} />}
                  {selectedModel.color && <Spec label="رنگ" value={selectedModel.color} />}
                  {selectedModel.material && <Spec label="ترکیب" value={selectedModel.material} />}
                  {selectedModel.texture && <Spec label="بافت" value={selectedModel.texture} />}
                </div>

                {/* پیش‌نمایش زندهٔ رنگ — تغییر رنگ پرده روی پنجره */}
                <div className="mt-4 rounded-xl border border-secondary/50 bg-background/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-[11px] font-bold text-foreground">پیش‌نمایش زندهٔ رنگ</span>
                    {colorOverride && (
                      <button
                        onClick={() => setColorOverride("")}
                        className="font-body text-[10px] text-muted-foreground transition-colors hover:text-primary"
                      >
                        بازگشت به رنگ اصلی
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-2.5" dir="rtl">
                    {LIVE_COLORS.map((c) => {
                      const active = colorOverride === c.hex;
                      return (
                        <button
                          key={c.hex}
                          onClick={() => setColorOverride((v) => (v === c.hex ? "" : c.hex))}
                          title={c.name}
                          className="group flex flex-col items-center gap-1.5"
                        >
                          <span
                            className={`h-9 w-9 rounded-full border-2 transition-all duration-200 ${
                              active
                                ? "scale-110 border-primary shadow-[0_0_0_3px_rgba(201,162,39,0.25)]"
                                : "border-secondary/50 group-hover:scale-105 group-hover:border-primary/40"
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                          <span
                            className={`font-body text-[9px] transition-colors ${
                              active ? "font-bold text-primary" : "text-muted-foreground/80"
                            }`}
                          >
                            {c.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedModel.description && (
                  <p className="mt-4 font-body text-xs leading-6 text-muted-foreground">{selectedModel.description}</p>
                )}
                <a href="tel:02112345678" className="btn-gold mt-5 w-full justify-center">
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

            <div className="max-h-[440px] overflow-y-auto rounded-2xl border border-secondary/60 bg-card/50 p-3">
              {loading ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-xl bg-secondary/40" />
                  ))}
                </div>
              ) : gridItems.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-body text-sm text-muted-foreground">
                    {hasActiveFilters ? "نتیجه‌ای با این فیلترها پیدا نشد" : "هنوز مدلی ثبت نشده است"}
                  </p>
                  {hasActiveFilters && (
                    <button onClick={resetFilters} className="btn-ghost-gold mt-4 !px-5 !py-2 text-xs">
                      پاک کردن فیلترها
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {gridItems.map((m) => {
                    const active = selectedModel?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m)}
                        title={`${m.code} — ${m.name}`}
                        className={`group/sw relative aspect-square overflow-hidden rounded-xl border transition-all duration-300 ${
                          active ? "border-primary ring-2 ring-primary/40" : "border-secondary/60 hover:border-primary/60"
                        }`}
                      >
                        {m.image ? (
                          <img src={m.image} alt={m.code} className="h-full w-full object-cover" />
                        ) : m.color_code ? (
                          <span className="block h-full w-full" style={{ backgroundColor: m.color_code }} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-display text-[10px] text-muted-foreground">{m.code}</span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-1 py-1 text-center font-display text-[9px] font-bold text-foreground">
                          {m.code}
                        </span>
                        {active && (
                          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    <SavedCurtainsDrawer
      open={savedOpen}
      onClose={() => setSavedOpen(false)}
      saved={saved}
      onRemove={remove}
      onClear={clear}
      onSelect={(item) => {
        const model = allModels.find((m) => m.id === item.model_id);
        if (model) {
          setSelectedModel(model);
          setColorOverride(item.color_code || "");
        }
      }}
    />
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