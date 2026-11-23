"use client";

import { useState } from "react";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/compressImage";
import { api } from "@/api/client";
import { apiErrorMessage } from "@/lib/apiError";
import { OptimizedImage } from "@/components/ui/image";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";

export const PAGE_HERO_DEFS = [
  { key: "catalog", label: "کاتالوگ", defaultEyebrow: "کاتالوگ پرده", defaultTitle: "مدل‌ها و نمای نصب" },
  { key: "shop", label: "فروشگاه", defaultEyebrow: "فروشگاه", defaultTitle: "محصولات" },
  { key: "projects", label: "نمونه کارها", defaultEyebrow: "نمونه کارها", defaultTitle: "نمونه‌های اجرا شده" },
  { key: "about", label: "درباره ما", defaultEyebrow: "درباره پرده آنتیک", defaultTitle: "طراحی و اجرای پرده" },
  { key: "contact", label: "تماس", defaultEyebrow: "ارتباط با ما", defaultTitle: "گفت‌وگو را آغاز کنیم" },
];

interface PageHero {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
}

export function emptyPageHero(def: typeof PAGE_HERO_DEFS[0]): PageHero {
  return { eyebrow: def.defaultEyebrow, title: def.defaultTitle, description: "", image: "" };
}

export function buildDefaultPageHeroes(): Record<string, PageHero> {
  return Object.fromEntries(PAGE_HERO_DEFS.map((d) => [d.key, emptyPageHero(d)]));
}

export function normalizePageHeroes(ph: Record<string, unknown>): Record<string, PageHero> {
  const next = buildDefaultPageHeroes();
  if (!ph || typeof ph !== "object") return next;
  for (const d of PAGE_HERO_DEFS) {
    const row = ph[d.key];
    if (row && typeof row === "object") {
      const r = row as Record<string, unknown>;
      next[d.key] = {
        eyebrow: String(r.eyebrow || d.defaultEyebrow),
        title: String(r.title || d.defaultTitle),
        description: String(r.description || ""),
        image: String(r.image || ""),
      };
    }
  }
  return next;
}

export function serializePageHeroes(pageHeroes: Record<string, PageHero>): Record<string, PageHero> {
  return Object.fromEntries(
    PAGE_HERO_DEFS.map((d) => {
      const h = pageHeroes[d.key] || emptyPageHero(d);
      return [
        d.key,
        {
          eyebrow: String(h.eyebrow || "").trim(),
          title: String(h.title || "").trim(),
          description: String(h.description || "").trim(),
          image: String(h.image || "").trim(),
        },
      ];
    })
  );
}

/** UI + upload for page heroes; controlled via value/onChange */
export default function AdminPageHeroes({
  value,
  onChange,
  loading,
}: {
  value: Record<string, { eyebrow: string; title: string; description: string; image: string }>;
  onChange: (v: Record<string, { eyebrow: string; title: string; description: string; image: string }>) => void;
  loading: boolean;
}) {
  const [uploadingPage, setUploadingPage] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");

  function update(key: string, field: string, v: string) {
    onChange({ ...value, [key]: { ...value[key], [field]: v } });
  }

  async function onImage(key: string, file: File) {
    if (!file) return;
    setUploadingPage(key);
    setLocalError("");
    try {
      const compressed = await compressImage(file);
      const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url || res?.path;
      if (!url) throw new Error("آپلود پاسخ معتبری نداد");
      update(key, "image", url);
    } catch (e) {
      setLocalError(apiErrorMessage(e));
    } finally {
      setUploadingPage(null);
    }
  }

  return (
    <div className="rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
          <ImageIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-sm font-black text-foreground">هیرو صفحات داخلی</h2>
          <p className="font-body text-xs text-muted-foreground">
            تصویر و عنوان بالای صفحات کاتالوگ، فروشگاه، نمونه‌کار، درباره ما و تماس
          </p>
        </div>
      </div>
      {localError ? <p className="mt-2 font-body text-xs text-destructive">{localError}</p> : null}
      {!loading && (
        <div className="mt-4 space-y-4">
          {PAGE_HERO_DEFS.map((d) => {
            const h = value[d.key] || emptyPageHero(d);
            return (
              <div key={d.key} className="rounded-xl border border-secondary/50 bg-background/50 p-4">
                <p className="mb-3 font-body text-xs font-bold text-muted-foreground">{d.label}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>برچسب</label>
                    <input className={inputCls} value={h.eyebrow} onChange={(e) => update(d.key, "eyebrow", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>عنوان</label>
                    <input className={inputCls} value={h.title} onChange={(e) => update(d.key, "title", e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>توضیح</label>
                    <input
                      className={inputCls}
                      value={h.description}
                      onChange={(e) => update(d.key, "description", e.target.value)}
                      placeholder="متن زیر عنوان"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>تصویر پس‌زمینه</label>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg border border-secondary/60 bg-background">
                        {h.image ? (
                          <OptimizedImage src={h.image} alt="" fill className="object-cover" sizes="112px" />
                        ) : (
                          <Upload className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2 font-body text-xs font-bold text-primary">
                        {uploadingPage === d.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        {uploadingPage === d.key ? "آپلود…" : h.image ? "تعویض تصویر" : "بارگذاری تصویر"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={uploadingPage === d.key}
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            e.target.value = "";
                            if (f) onImage(d.key, f);
                          }}
                        />
                      </label>
                      {h.image ? (
                        <button type="button" onClick={() => update(d.key, "image", "")} className="text-xs text-muted-foreground hover:text-destructive">
                          حذف تصویر
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}