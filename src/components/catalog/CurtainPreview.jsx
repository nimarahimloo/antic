import { useMemo, useState, useCallback } from "react";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import PhotoCurtain from "@/components/catalog/photo/PhotoCurtain";
import { resolveStyle } from "@/components/catalog/windowStyles";
import { useRenderTemplates } from "@/hooks/useRenderTemplates";

function controlLabel(style, categorySlug) {
  const raise = ["zebra", "shade", "double", "roman", "roller", "pleated-manual", "pleated-chain", "pleated-sheer"].includes(
    style
  );
  if (categorySlug === "zebra" || style === "zebra") return "بالا / پایین (کشیدن روی تصویر یا اسلایدر)";
  if (raise) return "بالا / پایین کردن پرده";
  return "باز / بسته کردن پرده";
}

export default function CurtainPreview({ fabric }) {
  const [open, setOpen] = useState(0.3);
  const [mode, setMode] = useState("auto");
  const templates = useRenderTemplates();
  const style = fabric ? resolveStyle(fabric) : "drape";
  const template = fabric && templates?.[style];
  const hasPhoto = !!template && !!fabric?.image;

  const effectiveMode = useMemo(() => {
    if (mode === "photo" && hasPhoto) return "photo";
    if (mode === "interactive") return "interactive";
    // Prefer interactive so drag works by default; photo is opt-in for static sample
    return "interactive";
  }, [mode, hasPhoto]);

  const onOpenChange = useCallback((v) => setOpen(v), []);
  const label = controlLabel(style, fabric?.category_slug);

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display font-bold text-primary">
          {effectiveMode === "photo" ? "نمونه واقعی (ثابت)" : "پنجره مجازی — قابل حرکت"}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode("interactive")}
            className={`rounded-full border px-2.5 py-1 text-[10px] ${
              effectiveMode === "interactive"
                ? "border-primary bg-primary/10 text-primary"
                : "border-secondary/60 text-muted-foreground"
            }`}
          >
            حرکت روی پنجره
          </button>
          {hasPhoto && (
            <button
              type="button"
              onClick={() => setMode("photo")}
              className={`rounded-full border px-2.5 py-1 text-[10px] ${
                effectiveMode === "photo"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/60 text-muted-foreground"
              }`}
            >
              نمونه واقعی
            </button>
          )}
        </div>
      </div>

      {effectiveMode === "photo" && template ? (
        <PhotoCurtain template={template} fabric={fabric} scale={0.65} />
      ) : (
        <VirtualWindow fabric={fabric} open={open} scale={0.65} onOpenChange={onOpenChange} />
      )}

      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
        {effectiveMode === "photo"
          ? "عکس پارچهٔ کاتالوگ روی قالب نصب — تصویر ثابت باکیفیت."
          : "روی پرده بکشید (لمسی یا موس). زبرا/شید: بالا‑پایین · کلاسیک: چپ‑راست. بافت از عکس پارچه مدل."}
      </p>

      {fabric && effectiveMode === "interactive" && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="font-body text-[11px] text-muted-foreground">{label}</label>
            <span className="font-mono text-[10px] text-primary" dir="ltr">
              {Math.round(open * 100)}%
            </span>
          </div>
          <input
            aria-label={label}
            type="range"
            min="0"
            max="0.9"
            step="0.01"
            value={open}
            onChange={(e) => setOpen(Number(e.target.value))}
            className="mt-3 block w-full accent-primary"
          />
        </div>
      )}

      {fabric && !fabric.image && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          این مدل عکس تکهٔ پارچه ندارد؛ از پنل ادمین عکس ورق کاتالوگ را بارگذاری کنید.
        </p>
      )}
    </div>
  );
}
