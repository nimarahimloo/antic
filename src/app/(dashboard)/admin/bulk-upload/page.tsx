"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, X, Loader2, Check, Package, Image as LibImage } from "lucide-react";
import { api } from "@/api";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToast, adminToasts } from "@/lib/adminToast";
import { Card } from "@/components/ui/card";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface BulkItem {
  id: string;
  image: string;
  code: string;
  name: string;
  color: string;
  color_code: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories?: Array<{ name: string; slug: string }>;
}

export default function AdminBulkUploadPage() {
  const { categories, loading: catsLoading } = useCurtainCategories();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);

  // Confirmation for bulk create
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();

  useEffect(() => {
    if (categories.length) {
      setSelectedCategory(categories[0]?.slug || "");
    }
  }, [categories]);

  const category = categories.find((c) => c.slug === selectedCategory);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      setUploading(true);
      try {
        const uploaded: BulkItem[] = [];
        for (const file of files) {
          const compressed = await compressImage(file);
          const media = await api.media.upload(compressed);
          const file_url = media.url;
          if (!file_url) throw new Error("آپلود پاسخ معتبری نداد");
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
        const msg = apiErrorMessage(e);
        adminToast("error", "بارگذاری تصویر", msg);
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    []
  );

  const updateItem = useCallback(
    (id: string, field: keyof BulkItem, value: string) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const autoNumber = useCallback(() => {
    const prefix = (selectedCategory || "MD").slice(0, 3).toUpperCase();
    setItems((prev) =>
      prev.map((it, i) => ({
        ...it,
        code: it.code || `${prefix}-${String(i + 1).padStart(3, "0")}`,
      }))
    );
  }, [selectedCategory]);

  const handleBulkCreate = useCallback(async () => {
    const valid = items.filter((i) => i.code && i.image);
    if (!valid.length || !selectedCategory) return;

    const confirmed = await confirm({
      title: "ثبت گروهی مدل‌های پرده",
      description: `آیا مطمئن هستید که می‌خواهید ${valid.length} مدل پرده را در دسته «${category?.name || selectedCategory}» ثبت کنید؟ این عملیات قابل بازگشت نیست.`,
      confirmLabel: "ثبت گروهی",
      cancelLabel: "انصراف",
      variant: "primary",
    });
    if (!confirmed) return;

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

      // Backend lacks a /bulk endpoint, so create sequentially
      for (const record of records) {
        await api.entities.CurtainModel.create(record);
      }

      setCreated(records.length);
      setItems([]);
      setSubcategory("");
      adminToasts.created("مدل پرده", `${records.length} مورد`);
      setTimeout(() => setCreated(0), 4000);
    } catch (e) {
      const msg = apiErrorMessage(e);
      adminToast("error", "ثبت گروهی", msg);
    } finally {
      setCreating(false);
    }
  }, [items, selectedCategory, subcategory]);

  if (catsLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="mb-6">
          <h1 className="font-display text-xl font-black text-foreground">بارگذاری گروهی پارچه</h1>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            تصاویر پارچه را به‌صورت یکجا بارگذاری کنید و به دسته‌بندی موردنظر اختصاص دهید.
          </p>
        </div>

        {/* انتخاب دسته‌بندی مقصد */}
        <Card className="p-5 mb-6">
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
          {category?.subcategories?.length && category.subcategories.length > 0 && (
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
        </Card>

        {/* ناحیه بارگذاری */}
        <Card className="p-10 mb-6">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-secondary/60 bg-card/40 p-10 text-center transition-colors hover:border-primary/60"
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
              disabled={uploading}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => setBulkPickerOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-secondary/60 bg-secondary/5 px-4 py-2 font-body text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
              disabled={uploading}
            >
              <LibImage className="h-4 w-4" /> انتخاب از کتابخانه رسانه
            </button>
          </div>
        </Card>

        {/* فهرست پارچه‌های آماده ثبت */}
        {items.length > 0 && (
          <Card className="p-5 mb-6">
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
                    <img
                      src={it.image}
                      alt={it.code || "پارچه"}
                      className="h-28 w-full rounded-lg object-cover"
                    />
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
          </Card>
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
          <Card className="p-10 text-center">
            <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 font-body text-sm text-muted-foreground">
              هنوز تصویری بارگذاری نشده است. تصاویر پارچه را از کاتالوگ فیزیکی انتخاب کنید.
            </p>
          </Card>
        )}
      </div>

      {dialogState.open && dialogState.options && (
        <ConfirmationDialog
          open={dialogState.open}
          onOpenChange={handleCancel}
          title={dialogState.options.title}
          description={dialogState.options.description}
          confirmLabel={dialogState.options.confirmLabel}
          cancelLabel={dialogState.options.cancelLabel}
          variant={dialogState.options.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <MediaPicker
        open={bulkPickerOpen}
        onOpenChange={setBulkPickerOpen}
        mode="multi"
        onSelect={(selected) => {
          const mediaList = Array.isArray(selected) ? selected : [selected];
          const newItems = mediaList.map((media) => ({
            id: Math.random().toString(36).slice(2),
            image: media.url,
            code: "",
            name: "",
            color: "",
            color_code: "",
          }));
          setItems((prev) => [...prev, ...newItems]);
        }}
        title="انتخاب تصاویر از کتابخانه برای بارگذاری گروهی"
      />
    </div>
  );
}