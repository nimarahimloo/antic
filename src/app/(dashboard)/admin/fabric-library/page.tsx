"use client";

import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/ui/image";
import { api } from "@/api";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToasts } from "@/lib/adminToast";
import { Upload, Loader2, Image as ImageIcon, Palette, Image as LibImage } from "lucide-react";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const HARMONY_SLUGS = ["cotton", "silk", "sheer", "velvet"];

const FALLBACK_NAMES: Record<string, string> = {
  cotton: "کتان",
  silk: "حریر",
  sheer: "تور",
  velvet: "مخمل",
};

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";

export default function AdminFabricLibraryPage() {
  const { categories, loading: catsLoading } = useCurtainCategories();
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Record<string, string>>({});
  const [pickerSlug, setPickerSlug] = useState<string | null>(null);

  // Confirmation for save
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();

  // local state for form values
  const [formData, setFormData] = useState<Record<string, { backgroundImage: string; backgroundGradient: string }>>({});

  // Initialize form data from categories
  useEffect(() => {
    const initial: Record<string, { backgroundImage: string; backgroundGradient: string }> = {};
    HARMONY_SLUGS.forEach((slug) => {
      const cat = categories.find((c) => c.slug === slug);
      initial[slug] = {
        backgroundImage: cat?.backgroundImage || "",
        backgroundGradient: cat?.backgroundGradient || "",
      };
    });
    setFormData(initial);
  }, [categories]);

  const updateField = (slug: string, field: "backgroundImage" | "backgroundGradient", value: string) => {
    setFormData((prev) => ({ ...prev, [slug]: { ...prev[slug], [field]: value } }));
    setErrors((prev) => ({ ...prev, [slug]: "" }));
  };

  async function handleImageUpload(slug: string, file: File) {
    setUploading(slug);
    setErrors((prev) => ({ ...prev, [slug]: "" }));
    try {
      const media = await api.media.upload(file);
      const url = media.url;
      if (!url) throw new Error("آپلود پاسخ معتبری نداد");
      updateField(slug, "backgroundImage", url);
      setHints((prev) => ({ ...prev, [slug]: "تصویر آپلود شد. برای ذخیره دکمه ذخیره را بزنید." }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, [slug]: apiErrorMessage(e) }));
    } finally {
      setUploading(null);
    }
  }

  async function removeImage(slug: string) {
    updateField(slug, "backgroundImage", "");
  }

  async function save(slug: string) {
    const confirmed = await confirm({
      title: "ذخیره پس‌زمینه هارمونی",
      description: `آیا می‌خواهید تغییرات پس‌زمینه برای بافت «${FALLBACK_NAMES[slug]}» ذخیره شود؟`,
      confirmLabel: "ذخیره",
      cancelLabel: "انصراف",
      variant: "primary",
    });
    if (!confirmed) return;

    setSaving(slug);
    setErrors((prev) => ({ ...prev, [slug]: "" }));
    const data = formData[slug];
    try {
      const cat = categories.find((c) => c.slug === slug);
      if (!cat) throw new Error("دسته یافت نشد");
      await api.entities.CurtainCategory.update(cat.id, {
        backgroundImage: data.backgroundImage || null,
        backgroundGradient: data.backgroundGradient || null,
      });
      adminToasts.updated("پس‌زمینه هارمونی", FALLBACK_NAMES[slug]);
      setHints((prev) => ({ ...prev, [slug]: "ذخیره شد." }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, [slug]: apiErrorMessage(e) }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-black text-foreground">مدیریت پس‌زمینه هارمونی بافت و رنگ</h1>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          پس‌زمینه کارت‌های چهار بافت اصلی (کتان، حریر، تور، مخمل) را از اینجا مدیریت کنید.
          می‌توانید تصویر آپلود کنید یا کد گرادیان CSS وارد کنید. اولویت با تصویر است.
        </p>
      </div>

      {catsLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HARMONY_SLUGS.map((slug) => {
            const cat = categories.find((c) => c.slug === slug);
            const data = formData[slug] || { backgroundImage: "", backgroundGradient: "" };
            const hasImage = Boolean(data.backgroundImage);
            const hasGradient = Boolean(data.backgroundGradient);

            return (
              <div key={slug} className="rounded-2xl border border-secondary/50 bg-card p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{FALLBACK_NAMES[slug]}</h3>
                    <p className="font-body text-[11px] text-muted-foreground">اسلاگ: {slug}</p>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <label className={labelCls}>تصویر پس‌زمینه (اختیاری)</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex h-24 w-32 items-center justify-center overflow-hidden rounded-lg border border-secondary/60 bg-background">
                      {data.backgroundImage ? (
                        <OptimizedImage src={data.backgroundImage} alt="" fill className="object-cover" sizes="128px" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2 font-body text-xs font-bold text-primary">
                          {uploading === slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploading === slug ? "آپلود…" : hasImage ? "تعویض" : "انتخاب"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading === slug}
                            onChange={(e) => { const f = e.target.files?.[0] || null; e.target.value = ""; if (f) handleImageUpload(slug, f); }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPickerSlug(slug)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-secondary/60 bg-secondary/5 px-2 py-2 font-body text-[10px] text-muted-foreground hover:border-primary/60 hover:text-primary"
                          disabled={uploading === slug}
                        >
                          <LibImage className="h-3 w-3" />
                        </button>
                      </div>
                      {hasImage && (
                        <button type="button" onClick={() => removeImage(slug)} className="rounded-xl border border-secondary/70 px-3 py-2 text-xs text-muted-foreground hover:border-destructive hover:text-destructive">حذف تصویر</button>
                      )}
                    </div>
                  </div>
                  {errors[slug] && <p className="text-xs text-destructive">{errors[slug]}</p>}
                  {hints[slug] && <p className="text-xs text-primary">{hints[slug]}</p>}
                </div>

                {/* Gradient Input */}
                <div>
                  <label className={labelCls}>کد گرادیان CSS (اختیاری)</label>
                  <input
                    className={inputCls}
                    type="text"
                    value={data.backgroundGradient}
                    onChange={(e) => updateField(slug, "backgroundGradient", e.target.value)}
                    placeholder="مثال: from-[#c4b59a]/90 via-[#a8926e]/40 to-transparent"
                    dir="ltr"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    اولویت با تصویر است. اگر تصویر تنظیم شده باشد، گرادیان نمایش داده نمی‌شود.
                  </p>
                </div>

                {/* Preview */}
                <div className="mt-4 rounded-xl border border-secondary/50 overflow-hidden">
                  <div className="aspect-[4/3] relative">
                    {data.backgroundImage ? (
                      <OptimizedImage src={data.backgroundImage} alt="پیش‌نمایش" fill className="object-cover" sizes="200px" />
                    ) : data.backgroundGradient ? (
                      <div className={`h-full w-full bg-gradient-to-br ${data.backgroundGradient}`} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground text-xs">
                        پیش‌فرض
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  </div>
                  <div className="p-3 text-center font-body text-[10px] text-muted-foreground bg-background/50 border-t border-secondary/50">
                    پیش‌نمایش کارت
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => save(slug)}
                  disabled={saving === slug}
                  className="btn-gold mt-4 w-full justify-center"
                >
                  {saving === slug ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> در حال ذخیره…</>
                  ) : (
                    <><span>ذخیره تغییرات</span></>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pickerSlug && (
        <MediaPicker
          open={Boolean(pickerSlug)}
          onOpenChange={(o) => {
            if (!o) setPickerSlug(null);
          }}
          mode="single"
          onSelect={(selected) => {
            const media = Array.isArray(selected) ? selected[0] : selected;
            if (media && pickerSlug) {
              updateField(pickerSlug, "backgroundImage", media.url);
              setHints((prev) => ({ ...prev, [pickerSlug]: "تصویر از کتابخانه انتخاب شد. برای ذخیره دکمه ذخیره را بزنید." }));
            }
            setPickerSlug(null);
          }}
          title="انتخاب تصویر پس‌زمینه از کتابخانه"
        />
      )}

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
    </div>
  );
}