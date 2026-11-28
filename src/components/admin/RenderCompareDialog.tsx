"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/api";
import { resolveStyle, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";
import { OptimizedImage } from "@/components/ui/image";

interface CurtainModelRow {
  id: string;
  code: string;
  name: string;
  image?: string;
  install_image?: string;
  install_status?: string;
  install_score?: number | null;
  install_review?: string;
  category_slug?: string;
  categorySlug?: string;
  subcategory?: string;
  fabric?: string;
  mechanism?: string;
}

interface InstallReferenceRow {
  id: string;
  style: string;
  image: string;
  note?: string;
  created_date?: string;
}

interface RenderCompareDialogProps {
  model: CurtainModelRow | null;
  onClose: () => void;
}

export default function RenderCompareDialog({ model, onClose }: RenderCompareDialogProps) {
  const [refs, setRefs] = useState<InstallReferenceRow[] | null>(null);

  const style = useMemo(() => {
    if (!model) return "drape";
    return resolveStyle({
      category_slug: model.category_slug || model.categorySlug,
      subcategory: model.subcategory,
      name: model.name,
      code: model.code,
      fabric: model.fabric,
      mechanism: model.mechanism,
    });
  }, [model]);

  const styleLabel = (MECHANISM_LABELS as Record<string, string>)[style] || style;
  const catSlug = String(model?.category_slug || model?.categorySlug || "").toLowerCase();

  useEffect(() => {
    if (!model) return;
    (async () => {
      setRefs(null);
      const keys = [...new Set([catSlug, style].filter(Boolean))];
      const all: InstallReferenceRow[] = [];
      for (const k of keys) {
        try {
          const rows = await api.entities.InstallReference.filter({ style: k }, { sort: "-created_date", limit: 8 });
          if (Array.isArray(rows)) all.push(...(rows as InstallReferenceRow[]));
        } catch {
          /* ignore */
        }
      }
      // یکتا بر اساس id
      const seen = new Set<string>();
      const unique: InstallReferenceRow[] = [];
      for (const r of all) {
        if (!r?.id || seen.has(r.id)) continue;
        seen.add(r.id);
        unique.push(r);
      }
      setRefs(unique);
    })();
  }, [model, style, catSlug]);

  if (!model) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-secondary/60 bg-card p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="eyebrow">
            مقایسهٔ مدل {model.code} · {model.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            بستن
          </button>
        </div>

        <p className="mb-3 font-body text-[11px] text-muted-foreground">
          دسته: <strong>{catSlug || "—"}</strong> · سازوکار تشخیص‌داده‌شده:{" "}
          <strong>{styleLabel}</strong> ({style})
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <figure className="rounded-xl border border-primary/40 bg-background p-2">
            <figcaption className="mb-1.5 text-[11px] font-bold text-primary">
              نمای تولیدشده (رندر هوشمند)
            </figcaption>
            {model.install_image ? (
              <OptimizedImage
                src={model.install_image}
                alt={`رندر ${model.code}`}
                fill
                className="object-cover"
                sizes="400px"
              />
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">رندر ندارد</p>
            )}
          </figure>
          {model.image && (
            <figure className="rounded-xl border border-secondary/60 bg-background p-2">
              <figcaption className="mb-1.5 text-[11px] font-bold text-foreground">
                نمونهٔ اصلی پارچه
              </figcaption>
              <OptimizedImage
                src={model.image}
                alt="پارچهٔ اصلی"
                fill
                className="object-cover"
                sizes="400px"
              />
            </figure>
          )}
        </div>

        <p className="mb-2 mt-4 text-[11px] font-bold text-foreground">
          عکس‌های واقعی مرجع (InstallReference) برای این دسته / سازوکار
        </p>
        {!refs ? (
          <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />
        ) : refs.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {refs.map((r) => (
              <div key={r.id} className="relative">
                <OptimizedImage
                  src={r.image}
                  alt={r.note || style}
                  fill
                  className="object-cover"
                  sizes="200px"
                />
                <span className="mt-1 block font-mono text-[9px] text-muted-foreground" dir="ltr">
                  style={r.style}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-6 text-muted-foreground">
            برای دسته «{catSlug || styleLabel}» هنوز <strong>عکس پروژهٔ واقعی</strong> آپلود
            نکرده‌اید. قالب سبز chroma کافی نیست — در بخش «نمونه‌های اجرای واقعی» یک عکس محصول واقعی
            بگذارید تا بازبینی دقیق‌تر شود.
          </p>
        )}

        {model.install_review && (
          <p className="mt-4 rounded-xl border border-secondary/60 bg-background p-3 text-xs leading-6 text-muted-foreground">
            گزارش بازبین: {model.install_review}
            {model.install_score != null && ` · امتیاز ${model.install_score} از ۱۰`}
          </p>
        )}
      </div>
    </div>
  );
}
