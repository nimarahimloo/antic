import { useMemo, useState } from "react";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import PhotoCurtain from "@/components/catalog/photo/PhotoCurtain";
import { resolveStyle } from "@/components/catalog/windowStyles";
import { useRenderTemplates } from "@/hooks/useRenderTemplates";

/** Styles that primarily raise/lower (chain/cassette) vs side-open */
function controlLabel(style, categorySlug) {
  const raise = ["zebra", "shade", "double", "roman", "roller", "pleated-manual", "pleated-chain", "pleated-sheer"].includes(
    style
  );
  if (categorySlug === "zebra" || style === "zebra") return "بالا / پایین کردن نوارها (مثل زنجیر زبرا)";
  if (raise) return "بالا / پایین کردن پرده";
  return "باز / بسته کردن پرده (چپ و راست)";
}

export default function CurtainPreview({ fabric }) {
  const [open, setOpen] = useState(0.3);
  const [mode, setMode] = useState("auto"); // auto | photo | interactive
  const templates = useRenderTemplates();
  const style = fabric ? resolveStyle(fabric) : "drape";
  const template = fabric && templates?.[style];
  const hasPhoto = !!template && !!fabric?.image;

  const effectiveMode = useMemo(() => {
    if (mode === "photo" && hasPhoto) return "photo";
    if (mode === "interactive") return "interactive";
    // auto: prefer photo sample when available, else interactive
    return hasPhoto ? "photo" : "interactive";
  }, [mode, hasPhoto]);

  const label = controlLabel(style, fabric?.category_slug);

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display font-bold text-primary">
          {effectiveMode === "photo" ? "نمونه واقعی (عکس کاتالوگ روی نصب)" : "پنجره مجازی تعاملی"}
        </span>
        <div className="flex gap-1.5">
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
        </div>
      </div>

      {effectiveMode === "photo" && template ? (
        <PhotoCurtain template={template} fabric={fabric} scale={0.65} />
      ) : (
        <VirtualWindow fabric={fabric} open={open} scale={0.65} />
      )}

      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
        {effectiveMode === "photo"
          ? "عکس تکهٔ پارچهٔ کاتالوگ (همان رنگ و طرح) روی عکس نصب واقعی با پارچه سبز قرار می‌گیرد — بافت و نقش پارچه حفظ می‌شود."
          : "در این حالت می‌توانید پرده را باز/بسته یا بالا/پایین کنید. بافت از عکس پارچه مدل خوانده می‌شود."}
      </p>

      {/* کنترل حرکت — فقط در حالت تعاملی */}
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
          <p className="mt-2 text-[10px] text-muted-foreground">
            {style === "zebra"
              ? "مثل کشیدن زنجیر زبرا: مقدار کمتر = بسته‌تر / نوارها هم‌پوشان‌تر"
              : ["shade", "double", "roman", "roller", "pleated-manual", "pleated-chain", "pleated-sheer"].includes(
                    style
                  )
                ? "مقدار بیشتر = پرده بالاتر جمع می‌شود"
                : "مقدار بیشتر = دو پنل بیشتر به طرفین باز می‌شوند"}
          </p>
        </div>
      )}

      {fabric && !fabric.image && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          این مدل هنوز عکس تکهٔ پارچه ندارد. از پنل ادمین عکس ورق کاتالوگ فیزیکی را برای این کد محصول بارگذاری کنید.
        </p>
      )}
    </div>
  );
}
