import { useMemo, useState, useCallback } from "react";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import PhotoCurtain from "@/components/catalog/photo/PhotoCurtain";
import { resolveStyle, pickTemplateUrl, styleFabricScale, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";
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
 * Catalog preview priority (product-shot quality path first):
 *  1) approved server install_image
 *  2) live chroma/photo composite from admin template for this mechanism
 *  3) interactive WebGL (optional)
 */
export default function CurtainPreview({ fabric }) {
  const [open, setOpen] = useState(0.3);
  const [mode, setMode] = useState("auto");
  const templates = useRenderTemplates();

  const style = fabric ? resolveStyle(fabric) : "drape";
  const picked = fabric ? pickTemplateUrl(fabric, templates) : null;
  const templateUrl = picked?.url || null;
  const hasPhoto = Boolean(templateUrl && fabric?.image);
  const hasApprovedInstall =
    fabric?.install_status === "approved" && Boolean(fabric?.install_image);

  const effectiveMode = useMemo(() => {
    if (mode === "install" && hasApprovedInstall) return "install";
    if (mode === "photo" && hasPhoto) return "photo";
    if (mode === "interactive") return "interactive";
    // auto: product-shot path first
    if (hasApprovedInstall) return "install";
    if (hasPhoto) return "photo";
    return "interactive";
  }, [mode, hasPhoto, hasApprovedInstall]);

  const onOpenChange = useCallback((v) => setOpen(v), []);
  const label = controlLabel(style, fabric?.category_slug);
  const styleLabel = MECHANISM_LABELS[style] || style;
  const tileScale = styleFabricScale(style);

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display font-bold text-primary">
          {effectiveMode === "install"
            ? "نمونه نصب تأییدشده"
            : effectiveMode === "photo"
              ? `نصب واقعی · ${styleLabel}`
              : `پنجره مجازی · ${styleLabel}`}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {hasApprovedInstall && (
            <button
              type="button"
              onClick={() => setMode("install")}
              className={`rounded-full border px-2.5 py-1 text-[10px] ${
                effectiveMode === "install"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/60 text-muted-foreground"
              }`}
            >
              نصب تأییدشده
            </button>
          )}
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
              قالب نصب
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
            حرکت تعاملی
          </button>
        </div>
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

      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
        {effectiveMode === "install"
          ? "تصویر تولیدشده روی سرور از قالب نصب این سبک + عکس پارچه مدل — همان مسیری که برای کاتالوگ تأیید می‌شود."
          : effectiveMode === "photo"
            ? "عکس پارچهٔ ورق کاتالوگ روی قالب نصب این سازوکار (رومن / پلیسه / شید / …). اسکیل بافت برای هر سبک جدا تنظیم شده است."
            : "رندر سه‌بعدی تعاملی. برای نزدیک‌ترین کیفیت به عکس محصول، قالب chroma یا نمونه نصب را در ادمین برای این سبک آپلود کنید."}
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

      {fabric?.image && !hasPhoto && !hasApprovedInstall && templates && (
        <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
          برای سبک «{styleLabel}» هنوز قالب نصب در ادمین ثبت نشده. از پنجره مجازی → قالب‌های نصب، یک عکس
          نصب واقعی با ناحیهٔ سبز (یا نمونه اجرا) برای این سازوکار آپلود کنید تا خروجی شبیه عکس محصول شود.
        </p>
      )}
    </div>
  );
}
