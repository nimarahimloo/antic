import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { UploadCloud, X, Loader2, Check, Package } from "lucide-react";
import { ALL_CATEGORIES as FALLBACK_CATEGORIES } from "@/lib/catalogData";

export default function AdminBulkUpload() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    base44.entities.CurtainCategory
      .list("order", 100)
      .then((data) => {
        if (data?.length) {
          setCategories(data);
          setSelectedCategory(data[0]?.slug || "");
        } else {
          setCategories(FALLBACK_CATEGORIES);
          setSelectedCategory(FALLBACK_CATEGORIES[0]?.slug || "");
        }
      })
      .catch(() => {
        setCategories(FALLBACK_CATEGORIES);
        setSelectedCategory(FALLBACK_CATEGORIES[0]?.slug || "");
      });
  }, []);

  const category = categories.find((c) => c.slug === selectedCategory);

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        uploaded.push({
          id: Math.random().toString(36).slice(2),
          image: file_url,
          code: "",
          name: "",
          color: "",
          color_code: "",
        });
      }
      setItems((prev) => [...prev, ...uploaded]);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function autoNumber() {
    const prefix = (selectedCategory || "MD").slice(0, 3).toUpperCase();
    setItems((prev) =>
      prev.map((it, i) => ({
        ...it,
        code: it.code || `${prefix}-${String(i + 1).padStart(3, "0")}`,
      }))
    );
  }

  async function handleBulkCreate() {
    const valid = items.filter((i) => i.code && i.image);
    if (!valid.length || !selectedCategory) return;
    setCreating(true);
    try {
      const records = valid.map((i) => ({
        code: i.code,
        name: i.name || i.code,
        category_slug: selectedCategory,
        subcategory: subcategory || undefined,
        color: i.color || undefined,
        color_code: i.color_code || undefined,
        image: i.image,
      }));
      await base44.entities.CurtainModel.bulkCreate(records);
      setCreated(records.length);
      setItems([]);
      setSubcategory("");
      setTimeout(() => setCreated(0), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-black text-foreground">بارگذاری گروهی پارچه</h1>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          صدها مدل پارچه را به‌صورت یکجا بارگذاری کنید و به دسته‌بندی موردنظر اختصاص دهید.
        </p>
      </div>

      {/* انتخاب دسته‌بندی مقصد */}
      <div className="mb-6 rounded-2xl border border-secondary/60 bg-card p-5">
        <p className="mb-3 font-display text-xs font-bold text-foreground">دسته‌بندی مقصد</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setSelectedCategory(cat.slug);
                setSubcategory("");
              }}
              className={`rounded-full border px-4 py-2 font-body text-xs transition-colors ${
                selectedCategory === cat.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-secondary/60 text-muted-foreground hover:border-primary/60"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        {category?.subcategories?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 font-body text-[11px] text-muted-foreground">زیردسته (اختیاری)</p>
            <div className="flex flex-wrap gap-2">
              {category.subcategories.map((sub) => (
                <button
                  key={sub.slug}
                  onClick={() => setSubcategory(sub.slug)}
                  className={`rounded-full border px-3.5 py-1.5 font-body text-xs transition-colors ${
                    subcategory === sub.slug
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-secondary/60 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ناحیه بارگذاری */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-secondary/60 bg-card/40 p-10 text-center transition-colors hover:border-primary/60"
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="mt-3 font-display text-sm font-bold text-foreground">
          {uploading ? "در حال بارگذاری…" : "تصاویر پارچه را اینجا بکشید یا کلیک کنید"}
        </p>
        <p className="mt-1 font-body text-[11px] text-muted-foreground">
          می‌توانید چندین تصویر را همزمان انتخاب کنید
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* فهرست پارچه‌های آماده ثبت */}
      {items.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-display text-xs font-bold text-foreground">
              {items.length} پارچه آماده ثبت
            </span>
            <div className="flex gap-2">
              <button
                onClick={autoNumber}
                className="rounded-lg border border-secondary/60 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
              >
                شماره‌گذاری خودکار
              </button>
              <button
                onClick={() => setItems([])}
                className="rounded-lg border border-secondary/60 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
              >
                پاک کردن همه
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-xl border border-secondary/60 bg-card p-3">
                <div className="relative mb-3">
                  <img src={it.image} alt={it.code || "پارچه"} className="h-28 w-full rounded-lg object-cover" />
                  <button
                    onClick={() => removeItem(it.id)}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 backdrop-blur-md transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={it.code}
                    onChange={(e) => updateItem(it.id, "code", e.target.value)}
                    placeholder="کد"
                    className="rounded-lg border border-secondary/60 bg-background px-2.5 py-1.5 font-body text-xs text-foreground outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => updateItem(it.id, "name", e.target.value)}
                    placeholder="نام (اختیاری)"
                    className="rounded-lg border border-secondary/60 bg-background px-2.5 py-1.5 font-body text-xs text-foreground outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={it.color}
                    onChange={(e) => updateItem(it.id, "color", e.target.value)}
                    placeholder="رنگ (اختیاری)"
                    className="rounded-lg border border-secondary/60 bg-background px-2.5 py-1.5 font-body text-xs text-foreground outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={it.color_code}
                    onChange={(e) => updateItem(it.id, "color_code", e.target.value)}
                    placeholder="کد رنگ hex"
                    className="rounded-lg border border-secondary/60 bg-background px-2.5 py-1.5 font-body text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleBulkCreate}
            disabled={creating || !selectedCategory}
            className="btn-gold mt-5 w-full justify-center sm:w-auto"
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت…</>
            ) : (
              <><Package className="h-4 w-4" /> ثبت گروهی {items.filter((i) => i.code).length} پارچه</>
            )}
          </button>
        </div>
      )}

      {/* پیام موفقیت */}
      {created > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <Check className="h-5 w-5 text-primary" />
          <span className="font-body text-sm text-foreground">
            {created} پارچه با موفقیت ثبت و به دسته‌بندی اختصاص داده شد.
          </span>
        </div>
      )}

      {items.length === 0 && !created && (
        <div className="rounded-2xl border border-secondary/60 bg-card/40 p-10 text-center">
          <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-body text-sm text-muted-foreground">
            هنوز تصویری بارگذاری نشده است. تصاویر پارچه را از کاتالوگ فیزیکی انتخاب کنید.
          </p>
        </div>
      )}
    </div>
  );
}