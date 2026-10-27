import { useEffect, useMemo, useState } from "react";
import { Key, Globe, Sparkles, AlertCircle, Upload, Loader2, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { compressImage } from "@/lib/compressImage";
import { useAuth } from "@/lib/AuthContext";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";

const DEFAULT_SLIDES = [
  {
    space: "پذیرایی",
    title: "فضای پذیرایی",
    subtitle: "پرده‌های شیک برای فضای پذیرایی",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/2be489b62_generated_image.png",
  },
  {
    space: "آشپزخانه",
    title: "آشپزخانه",
    subtitle: "کنترل نور و هماهنگی با دکوراسیون آشپزخانه",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e29f4aed1_generated_image.png",
  },
  {
    space: "اتاق خواب",
    title: "اتاق خواب",
    subtitle: "حریم خصوصی و آرامش برای اتاق خواب",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/58350d5ba_generated_image.png",
  },
  {
    space: "فضاهای ویژه",
    title: "فضاهای ویژه",
    subtitle: "راهکار اختصاصی برای فضاهای خاص",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/7480c6599_generated_image.png",
  },
];

function emptySlide() {
  return { space: "", title: "", subtitle: "", image: "" };
}

export default function AdminSettings() {
  const appUrl = useMemo(() => window.location.origin, []);
  const { checkAppState } = useAuth();

  const [settingId, setSettingId] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await base44.entities.SiteSetting.list("-updated_date", 10);
        const main =
          (Array.isArray(rows) ? rows : []).find((r) => r.key === "main" || !r.key) ||
          (Array.isArray(rows) && rows[0]) ||
          null;
        if (cancelled) return;
        if (main) {
          setSettingId(main.id);
          setLogoUrl(main.logo_url || main.logoUrl || "");
          const hs = main.hero_slides || main.heroSlides;
          if (Array.isArray(hs) && hs.length) {
            setSlides(
              hs.map((s) => ({
                space: s.space || "",
                title: s.title || "",
                subtitle: s.subtitle || "",
                image: s.image || "",
              }))
            );
          }
        }
      } catch {
        if (!cancelled) setError("بارگذاری تنظیمات ناموفق بود.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadImage(file) {
    const compressed = await compressImage(file);
    const res = await base44.integrations.Core.UploadPublicFile({ file: compressed });
    const url = res?.file_url || res?.url || res?.path;
    if (!url) throw new Error("آپلود پاسخ معتبری نداد");
    return url;
  }

  async function onLogoFile(file) {
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setLogoUrl(url);
      setHint("لوگو آپلود شد؛ برای اعمال ذخیره کنید.");
    } catch (e) {
      setError(e?.message || "آپلود لوگو ناموفق بود.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onSlideImage(idx, file) {
    if (!file) return;
    setUploadingSlide(idx);
    setError("");
    try {
      const url = await uploadImage(file);
      setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, image: url } : s)));
      setHint("تصویر اسلاید آپلود شد؛ برای اعمال ذخیره کنید.");
    } catch (e) {
      setError(e?.message || "آپلود تصویر اسلاید ناموفق بود.");
    } finally {
      setUploadingSlide(null);
    }
  }

  function updateSlide(idx, key, value) {
    setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }

  function addSlide() {
    setSlides((prev) => [...prev, emptySlide()]);
  }

  function removeSlide(idx) {
    setSlides((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function save() {
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
    };
    try {
      if (settingId) {
        await base44.entities.SiteSetting.update(settingId, payload);
      } else {
        const created = await base44.entities.SiteSetting.create(payload);
        if (created?.id) setSettingId(created.id);
      }
      setHint("ذخیره شد. تغییرات در سایت اعمال می‌شود.");
      if (typeof checkAppState === "function") {
        await checkAppState();
      }
    } catch (e) {
      setError(e?.data?.error || e?.message || "ذخیره ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">تنظیمات</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        لوگو، بنر هیرو و وضعیت استقرار
      </p>

      <div className="mt-6 space-y-6">
        {/* لوگو */}
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
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
                {logoUrl ? (
                  <img src={logoUrl} alt="لوگو" className="h-full w-full object-contain" />
                ) : (
                  <img src="/brand/mark.svg" alt="پیش‌فرض" className="h-12 w-12 object-contain opacity-70" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary">
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingLogo ? "آپلود…" : logoUrl ? "تعویض لوگو" : "آپلود لوگو"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      e.target.value = "";
                      if (f) onLogoFile(f);
                    }}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="rounded-xl border border-secondary/70 px-3 py-2.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    بازگشت به پیش‌فرض
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* هیرو */}
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
                <div
                  key={idx}
                  className="rounded-xl border border-secondary/50 bg-background/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-body text-xs font-bold text-muted-foreground">اسلاید {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSlide(idx)}
                      disabled={slides.length <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-40"
                      aria-label="حذف اسلاید"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>عنوان</label>
                      <input
                        className={inputCls}
                        value={s.title}
                        onChange={(e) => updateSlide(idx, "title", e.target.value)}
                        placeholder="مثلاً فضای پذیرایی"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>برچسب کوتاه</label>
                      <input
                        className={inputCls}
                        value={s.space}
                        onChange={(e) => updateSlide(idx, "space", e.target.value)}
                        placeholder="مثلاً پذیرایی"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>توضیح</label>
                      <input
                        className={inputCls}
                        value={s.subtitle}
                        onChange={(e) => updateSlide(idx, "subtitle", e.target.value)}
                        placeholder="متن زیر عنوان"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>تصویر</label>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-lg border border-secondary/60 bg-background">
                          {s.image ? (
                            <img src={s.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Upload className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2 font-body text-xs font-bold text-primary">
                          {uploadingSlide === idx ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {uploadingSlide === idx ? "آپلود…" : s.image ? "تعویض" : "انتخاب"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            disabled={uploadingSlide === idx}
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              e.target.value = "";
                              if (f) onSlideImage(idx, f);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(error || hint) && (
          <p className={`font-body text-xs ${error ? "text-destructive" : "text-primary"}`}>
            {error || hint}
          </p>
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
            <code className="mt-1 block overflow-x-auto font-mono text-xs text-primary" dir="ltr">
              {appUrl}/api
            </code>
          </div>
          <p className="mt-3 font-body text-[11px] text-muted-foreground">
            زرین‌پال: متغیرهای <code className="text-primary">ZARINPAL_MERCHANT_ID</code> و{" "}
            <code className="text-primary">ZARINPAL_SANDBOX</code> در فایل{" "}
            <code className="text-primary">backend/.env</code>
          </p>
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
            <Item ok label="بدون وابستگی Base44 / Wix" />
            <Item ok label="فروشگاه و سبد محلی" />
            <Item ok label="پنل ادمین محصولات و سفارش‌ها" />
            <Item ok label="مدیریت لوگو و بنر هیرو" />
            <Item ok label="درگاه زرین‌پال (با Merchant ID)" />
            <Item warn label="برای پرداخت واقعی ZARINPAL_MERCHANT_ID را در سرور ست کنید" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Item({ ok, warn, label }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
          warn ? "border-accent/50 text-accent" : "border-primary/50 text-primary"
        }`}
      >
        {warn ? <AlertCircle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      </span>
      <span className="font-body text-xs text-foreground/90">{label}</span>
    </li>
  );
}
