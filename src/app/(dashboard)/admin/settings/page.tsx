"use client";

import { useEffect, useMemo, useState } from "react";
import { Key, Globe, Sparkles, AlertCircle, Upload, Loader2, Plus, Trash2, Image as ImageIcon, Image as LibImage } from "lucide-react";
import { api } from "@/api";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";
import { useAuth } from "@/lib/AuthContext";
import { adminToast, adminToasts } from "@/lib/adminToast";
import AdminPageHeroes, {
  buildDefaultPageHeroes,
  normalizePageHeroes,
  serializePageHeroes,
} from "@/components/admin/AdminPageHeroes";
import { OptimizedImage } from "@/components/ui/image";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";

interface SiteSetting {
  id: string;
  key: string;
  logo_url?: string;
  logoUrl?: string;
  hero_slides?: Array<{ space?: string; title?: string; subtitle?: string; image?: string }>;
  heroSlides?: Array<{ space?: string; title?: string; subtitle?: string; image?: string }>;
  page_heroes?: Record<string, unknown>;
  pageHeroes?: Record<string, unknown>;
  // SEO fields
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  robotsPolicy?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  organizationName?: string;
  organizationLogo?: string;
  sitemapEnabled?: boolean;
  verificationGoogle?: string;
  verificationBing?: string;
}

const DEFAULT_SLIDES = [
  { space: "پذیرایی", title: "فضای پذیرایی", subtitle: "پرده‌های شیک برای فضای پذیرایی", image: "/images/migrated/2be489b62_generated_image.png" },
  { space: "آشپزخانه", title: "آشپزخانه", subtitle: "کنترل نور و هماهنگی با دکوراسیون آشپزخانه", image: "/images/migrated/e29f4aed1_generated_image.png" },
  { space: "اتاق خواب", title: "اتاق خواب", subtitle: "حریم خصوصی و آرامش برای اتاق خواب", image: "/images/migrated/58350d5ba_generated_image.png" },
  { space: "فضاهای ویژه", title: "فضاهای ویژه", subtitle: "راهکار اختصاصی برای فضاهای خاص", image: "/images/migrated/7480c6599_generated_image.png" },
];

function emptySlide() {
  return { space: "", title: "", subtitle: "", image: "" };
}

export default function AdminSettingsPage() {
  const appUrl = useMemo(() => window.location.origin, []);
  const { initializeAuth } = useAuth();
  const [settingId, setSettingId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [pageHeroes, setPageHeroes] = useState(buildDefaultPageHeroes);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [slidePickerOpen, setSlidePickerOpen] = useState<{ open: boolean; idx: number } | null>(null);
  // SEO fields
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [robotsPolicy, setRobotsPolicy] = useState("index, follow");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [twitterTitle, setTwitterTitle] = useState("");
  const [twitterDescription, setTwitterDescription] = useState("");
  const [twitterImage, setTwitterImage] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState("");
  const [sitemapEnabled, setSitemapEnabled] = useState(true);
  const [verificationGoogle, setVerificationGoogle] = useState("");
  const [verificationBing, setVerificationBing] = useState("");

  // Confirmation for save
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = (await api.entities.SiteSetting.list("-updated_date", 10)) as SiteSetting[];
        const main =
          rows.find((r) => r.key === "main" || !r.key) ||
          rows[0] ||
          null;
        if (cancelled) return;
        if (main) {
          setSettingId(String(main.id));
          setLogoUrl(String(main.logo_url || main.logoUrl || ""));
          setSeoTitle(String(main.seoTitle || ""));
          setSeoDescription(String(main.seoDescription || ""));
          setSeoKeywords(String(main.seoKeywords || ""));
          setCanonicalUrl(String(main.canonicalUrl || ""));
          setRobotsPolicy(String(main.robotsPolicy || "index, follow"));
          setOgTitle(String(main.ogTitle || ""));
          setOgDescription(String(main.ogDescription || ""));
          setOgImage(String(main.ogImage || ""));
          setTwitterCard(String(main.twitterCard || "summary_large_image"));
          setTwitterTitle(String(main.twitterTitle || ""));
          setTwitterDescription(String(main.twitterDescription || ""));
          setTwitterImage(String(main.twitterImage || ""));
          setOrganizationName(String(main.organizationName || ""));
          setOrganizationLogo(String(main.organizationLogo || ""));
          setSitemapEnabled(Boolean(main.sitemapEnabled !== false));
          setVerificationGoogle(String(main.verificationGoogle || ""));
          setVerificationBing(String(main.verificationBing || ""));
          const hs = main.hero_slides || main.heroSlides;
          if (Array.isArray(hs) && hs.length) {
            setSlides(
              hs.map((s) => ({
                space: String(s.space || ""),
                title: String(s.title || ""),
                subtitle: String(s.subtitle || ""),
                image: String(s.image || ""),
              }))
            );
          }
          const ph = main.page_heroes || main.pageHeroes;
          if (ph && typeof ph === "object") {
            setPageHeroes(normalizePageHeroes(ph));
          }
        }
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadImage(file: File) {
    const compressed = await compressImage(file);
    const media = await api.media.upload(compressed);
    const url = media.url;
    if (!url) throw new Error("آپلود پاسخ معتبری نداد");
    return url;
  }

  async function onLogoFile(file: File) {
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setLogoUrl(url);
      setHint("لوگو آپلود شد؛ برای اعمال ذخیره کنید.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onSlideImage(idx: number, file: File) {
    if (!file) return;
    setUploadingSlide(idx);
    setError("");
    try {
      const url = await uploadImage(file);
      setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, image: url } : s)));
      setHint("تصویر اسلاید آپلود شد؛ برای اعمال ذخیره کنید.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploadingSlide(null);
    }
  }

  function updateSlide(idx: number, key: string, value: string) {
    setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }

  function addSlide() {
    setSlides((prev) => [...prev, emptySlide()]);
  }

  function removeSlide(idx: number) {
    setSlides((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function save() {
    const confirmed = await confirm({
      title: "ذخیره تنظیمات ظاهری",
      description: "آیا می‌خواهید تغییرات لوگو، بنر هیرو و تنظیمات ظاهری ذخیره شود؟",
      confirmLabel: "ذخیره",
      cancelLabel: "انصراف",
      variant: "primary",
    });
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setHint("");
    const payload = {
      key: "main",
      logo_url: logoUrl || null,
      hero_slides: slides
        .filter((s) => s.image || s.title)
        .map((s) => ({
          space: (s.space || s.title || "").trim(),
          title: (s.title || s.space || "").trim(),
          subtitle: (s.subtitle || "").trim(),
          image: (s.image || "").trim(),
        })),
      page_heroes: serializePageHeroes(pageHeroes),
      // SEO fields
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: seoKeywords || undefined,
      canonicalUrl: canonicalUrl || undefined,
      robotsPolicy: robotsPolicy || undefined,
      ogTitle: ogTitle || undefined,
      ogDescription: ogDescription || undefined,
      ogImage: ogImage || undefined,
      twitterCard: twitterCard || undefined,
      twitterTitle: twitterTitle || undefined,
      twitterDescription: twitterDescription || undefined,
      twitterImage: twitterImage || undefined,
      organizationName: organizationName || undefined,
      organizationLogo: organizationLogo || undefined,
      sitemapEnabled: sitemapEnabled,
      verificationGoogle: verificationGoogle || undefined,
      verificationBing: verificationBing || undefined,
    }
    try {
      if (settingId) {
        await api.entities.SiteSetting.update(settingId, payload);
      } else {
        const created = (await api.entities.SiteSetting.create(payload)) as { id?: string } | null;
        if (created?.id) setSettingId(String(created.id));
      }
      setHint("ذخیره شد. تغییرات در سایت اعمال می‌شود.");
      adminToasts.settingsSaved("تنظیمات ظاهری");
      if (typeof initializeAuth === "function") {
        await initializeAuth();
      }
    } catch (e) {
      setError(apiErrorMessage(e));
      adminToast("error", "تنظیمات", apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">تنظیمات</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">لوگو، بنر هیرو و وضعیت استقرار</p>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">لوگوی سایت</h2>
              <p className="font-body text-xs text-muted-foreground">نمایش در هدر و فوتر</p>
            </div>
          </div>
          {loading ? (
            <div className="mt-4 flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
                {logoUrl ? (
                  <OptimizedImage src={logoUrl} alt="لوگو" fill className="object-contain" sizes="80px" />
                ) : (
                  <OptimizedImage src="/brand/mark.svg" alt="پیش‌فرض" fill className="h-12 w-12 object-contain opacity-70" priority />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary">
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingLogo ? "آپلود…" : logoUrl ? "تعویض لوگو" : "آپلود لوگو"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" disabled={uploadingLogo} onChange={(e) => { const f = e.target.files?.[0] || null; e.target.value = ""; if (f) onLogoFile(f); }} />
                </label>
                <button
                  type="button"
                  onClick={() => setLogoPickerOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-secondary/60 bg-secondary/5 px-3 py-2.5 font-body text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
                  disabled={uploadingLogo}
                >
                  <LibImage className="h-3.5 w-3.5" /> کتابخانه
                </button>
                {logoUrl && (
                  <button type="button" onClick={() => setLogoUrl("")} className="rounded-xl border border-secondary/70 px-3 py-2.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive">بازگشت به پیش‌فرض</button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
                <ImageIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-sm font-black text-foreground">بنر هیرو (صفحه اصلی)</h2>
                <p className="font-body text-xs text-muted-foreground">تصویر، عنوان و توضیح هر اسلاید</p>
              </div>
            </div>
            <button type="button" onClick={addSlide} className="btn-ghost-gold text-xs">
              <Plus className="h-3.5 w-3.5" /> افزودن اسلاید
            </button>
          </div>
          {!loading && (
            <div className="mt-4 space-y-4">
              {slides.map((s, idx) => (
                <div key={idx} className="rounded-xl border border-secondary/50 bg-background/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-body text-xs font-bold text-muted-foreground">اسلاید {idx + 1}</span>
                    <button type="button" onClick={() => removeSlide(idx)} disabled={slides.length <= 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-40" aria-label="حذف اسلاید">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>عنوان</label>
                      <input className={inputCls} value={s.title} onChange={(e) => updateSlide(idx, "title", e.target.value)} placeholder="مثلاً فضای پذیرایی" />
                    </div>
                    <div>
                      <label className={labelCls}>برچسب کوتاه</label>
                      <input className={inputCls} value={s.space} onChange={(e) => updateSlide(idx, "space", e.target.value)} placeholder="مثلاً پذیرایی" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>توضیح</label>
                      <input className={inputCls} value={s.subtitle} onChange={(e) => updateSlide(idx, "subtitle", e.target.value)} placeholder="متن زیر عنوان" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>تصویر</label>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-secondary/60 bg-background">
                          {s.image ? <OptimizedImage src={s.image} alt="" fill className="object-cover" sizes="96px" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex gap-1">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2 font-body text-xs font-bold text-primary">
                          {uploadingSlide === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                          {uploadingSlide === idx ? "آپلود…" : s.image ? "تعویض" : "انتخاب"}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingSlide === idx} onChange={(e) => { const f = e.target.files?.[0] || null; e.target.value = ""; if (f) onSlideImage(idx, f); }} />
                        </label>
                        <button
                          type="button"
                          onClick={() => setSlidePickerOpen({ open: true, idx })}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-secondary/60 bg-secondary/5 px-2 py-2 font-body text-[10px] text-muted-foreground hover:border-primary/60 hover:text-primary"
                          disabled={uploadingSlide === idx}
                        >
                          <LibImage className="h-3 w-3" />
                        </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AdminPageHeroes value={pageHeroes} onChange={setPageHeroes} loading={loading} />

        {(error || hint) && (
          <p className={`font-body text-xs ${error ? "text-destructive" : "text-primary"}`}>{error || hint}</p>
        )}

        <button type="button" onClick={save} disabled={saving || loading} className="btn-gold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "در حال ذخیره…" : "ذخیره تنظیمات ظاهری"}
        </button>

        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Key className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">API</h2>
              <p className="font-body text-xs text-muted-foreground">بک‌اند خود پروژه</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-secondary/60 bg-background p-3">
            <p className="font-body text-[10px] text-muted-foreground">آدرس پایه</p>
            <code className="mt-1 block overflow-x-auto font-mono text-xs text-primary" dir="ltr">{appUrl}/api</code>
          </div>
        </div>

        <div className="rounded-2xl border border-secondary/60 bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">آمادگی انتشار</h2>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            <Item label="بدون وابستگی Base44 / Wix" />
            <Item label="فروشگاه و سبد محلی" />
            <Item label="پنل ادمین محصولات و سفارش‌ها" />
            <Item label="مدیریت لوگو و بنر هیرو" />
          </ul>
        </div>
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
      open={logoPickerOpen}
      onOpenChange={setLogoPickerOpen}
      mode="single"
      onSelect={(selected) => {
        const media = Array.isArray(selected) ? selected[0] : selected;
        if (media) setLogoUrl(media.url);
      }}
      title="انتخاب لوگو از کتابخانه"
    />

    {slidePickerOpen && (
      <MediaPicker
        open={slidePickerOpen.open}
        onOpenChange={(o) => setSlidePickerOpen(o ? { open: true, idx: slidePickerOpen.idx } : null)}
        mode="single"
        onSelect={(selected) => {
          const media = Array.isArray(selected) ? selected[0] : selected;
          if (media && slidePickerOpen) {
            setSlides((prev) =>
              prev.map((s, i) => (i === slidePickerOpen.idx ? { ...s, image: media.url } : s))
            );
          }
          setSlidePickerOpen(null);
        }}
        title="انتخاب تصویر اسلاید از کتابخانه"
      />
    )}
  </div>
  );
}

function Item({ warn, label }: { warn?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border ${warn ? "border-accent/50 text-accent" : "border-primary/50 text-primary"}`}>
        {warn ? <AlertCircle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      </span>
      <span className="font-body text-xs text-foreground/90">{label}</span>
    </li>
  );
}