import { useMemo, useState, useCallback } from "react";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import PhotoCurtain from "@/components/catalog/photo/PhotoCurtain";
import {
  resolveStyle,
  pickTemplateUrl,
  styleFabricScale,
  MECHANISM_LABELS,
} from "@/lib/curtainStyleResolve";
import { useRenderTemplates } from "@/hooks/useRenderTemplates";

function controlLabel(style, categorySlug) {
  const raise = [
    "zebra",
    "shade",
    "double",
    "roman",
    "roller",
    "pleated-manual",
    "pleated-chain",
    "pleated-sheer",
  ].includes(style);
  if (categorySlug === "zebra" || style === "zebra") return "بالا / پایین (کشیدن روی تصویر یا اسلایدر)";
  if (raise) return "بالا / پایین کردن پرده";
  return "باز / بسته کردن پرده";
}

/**
 * مسیر درست کاتالوگ (به ترتیب):
 *  1) install_image تأییدشده روی سرور  ← همان چیزی که مشتری باید ببیند
 *  2) قالب chroma سبز + عکس پارچه (زنده در مرورگر)
 *  3) WebGL تعاملی فقط وقتی هیچ‌کدام نیست
 *
 * publicMode: بدون تب‌های گیج‌کننده و بدون پیام «به ادمین برو»
 */
export default function CurtainPreview({ fabric, publicMode = false }) {
  const [open, setOpen] = useState(0.3);
  const [mode, setMode] = useState("auto");
  const templates = useRenderTemplates();

  const style = fabric ? resolveStyle(fabric) : "drape";
  const picked = fabric ? pickTemplateUrl(fabric, templates) : null;
  const templateUrl = picked?.url || null;
  const hasPhoto = Boolean(templateUrl && fabric?.image);
  const hasApprovedInstall =
    fabric?.install_status === "approved" && Boolean(fabric?.install_image);
  // هر install ذخیره‌شده (حتی pending) بهتر از 3D سفید است
  const hasAnyInstall = Boolean(fabric?.install_image);

  const effectiveMode = useMemo(() => {
    if (mode === "install" && hasAnyInstall) return "install";
    if (mode === "photo" && hasPhoto) return "photo";
    if (mode === "interactive") return "interactive";
    // auto priority
    if (hasApprovedInstall || hasAnyInstall) return "install";
    if (hasPhoto) return "photo";
    return "interactive";
  }, [mode, hasPhoto, hasApprovedInstall, hasAnyInstall]);

  const onOpenChange = useCallback((v) => setOpen(v), []);
  const label = controlLabel(style, fabric?.category_slug);
  const styleLabel = MECHANISM_LABELS[style] || style;
  const tileScale = styleFabricScale(style);

  const title =
    effectiveMode === "install"
      ? "نمونه نصب"
      : effectiveMode === "photo"
        ? `نصب · ${styleLabel}`
        : `پیش‌نمایش · ${styleLabel}`;

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display font-bold text-primary">{title}</span>
        {!publicMode && (
          <div className="flex flex-wrap gap-1.5">
            {hasAnyInstall && (
              <ModeBtn active={effectiveMode === "install"} onClick={() => setMode("install")}>
                نمونه نصب
              </ModeBtn>
            )}
            {hasPhoto && (
              <ModeBtn active={effectiveMode === "photo"} onClick={() => setMode("photo")}>
                قالب زنده
              </ModeBtn>
            )}
            <ModeBtn active={effectiveMode === "interactive"} onClick={() => setMode("interactive")}>
              حرکت تعاملی
            </ModeBtn>
          </div>
        )}
      </div>

      {effectiveMode === "install" && fabric?.install_image ? (
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={fabric.install_image}
            alt={`نصب ${fabric.code || ""}`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : effectiveMode === "photo" && templateUrl ? (
        <PhotoCurtain template={templateUrl} fabric={fabric} scale={tileScale} styleKey={style} />
      ) : (
        <VirtualWindow fabric={fabric} open={open} scale={0.65} onOpenChange={onOpenChange} />
      )}

      {publicMode ? (
        <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
          {effectiveMode === "install"
            ? "تصویر نصب تولیدشده برای همین مدل از روی قالب دسته و عکس پارچه."
            : effectiveMode === "photo"
              ? "پیش‌نمایش زنده: پارچهٔ ورق روی قالب نصب این دسته."
              : fabric?.image
                ? "نمونه نصب این مدل هنوز آماده نیست؛ پیش‌نمایش تقریبی نشان داده می‌شود."
                : "برای این مدل عکس پارچه ثبت نشده است."}
        </p>
      ) : (
        <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
          {effectiveMode === "install"
            ? "تصویر سرور (قالب دسته + پارچه مدل)."
            : effectiveMode === "photo"
              ? "قالب chroma + پارچه در مرورگر."
              : "رندر سه‌بعدی موقت — برای کیفیت نهایی قالب سبز یا batch نصب بسازید."}
        </p>
      )}

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
    </div>
  );
}

function ModeBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[10px] ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-secondary/60 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}
