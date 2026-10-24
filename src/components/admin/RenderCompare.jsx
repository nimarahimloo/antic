import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { resolveStyle, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";

/**
 * مقایسه کنارهم: رندر تولیدشده · پارچه · عکس‌های مرجع واقعی همان دسته/سازوکار
 */
export default function RenderCompare({ model, onClose }) {
  const [refs, setRefs] = useState(null);

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

  const styleLabel = MECHANISM_LABELS[style] || style;
  const catSlug = String(model?.category_slug || model?.categorySlug || "").toLowerCase();

  useEffect(() => {
    if (!model) return;
    setRefs(null);
    (async () => {
      const keys = [...new Set([catSlug, style].filter(Boolean))];
      const all = [];
      for (const k of keys) {
        try {
          const rows = await base44.entities.InstallReference.filter({ style: k }, "-created_date", 8);
          if (Array.isArray(rows)) all.push(...rows);
        } catch {
          /* ignore */
        }
      }
      // یکتا بر اساس id و حذف تصاویر صرفاً سبز (اشتباهی به‌جای مرجع واقعی)
      const seen = new Set();
      const unique = [];
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
              <img
                src={model.install_image}
                alt={`رندر ${model.code}`}
                className="aspect-[4/3] w-full rounded-lg object-cover"
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
              <img
                src={model.image}
                alt="پارچهٔ اصلی"
                className="aspect-[4/3] w-full rounded-lg object-cover"
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
                <img
                  src={r.image}
                  alt={r.note || style}
                  className="aspect-[4/3] w-full rounded-lg border border-secondary/60 object-cover"
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
