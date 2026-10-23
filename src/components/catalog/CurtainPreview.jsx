import { useMemo, useState } from "react";
import PhotoCurtain from "@/components/catalog/photo/PhotoCurtain";
import {
  resolveStyle,
  pickTemplateUrl,
  styleFabricScale,
  MECHANISM_LABELS,
} from "@/lib/curtainStyleResolve";
import { useRenderTemplates } from "@/hooks/useRenderTemplates";

/**
 * مسیر کاتالوگ عمومی — فقط با ادمین سینک:
 *  1) install_image (خروجی batch / ذخیره مدل)
 *  2) قالب chroma دسته + پارچه (زنده)
 * بدون استودیو، بدون WebGL کارتونی به‌عنوان پیش‌فرض.
 */
export default function CurtainPreview({ fabric, publicMode = false }) {
  const [mode, setMode] = useState("auto");
  const templates = useRenderTemplates();

  const style = fabric ? resolveStyle(fabric) : "drape";
  const picked = fabric ? pickTemplateUrl(fabric, templates) : null;
  const templateUrl = picked?.url || null;
  const hasPhoto = Boolean(templateUrl && fabric?.image);
  const hasInstall = Boolean(fabric?.install_image);
  const hasApproved =
    fabric?.install_status === "approved" && Boolean(fabric?.install_image);

  const effectiveMode = useMemo(() => {
    if (!publicMode) {
      if (mode === "install" && hasInstall) return "install";
      if (mode === "photo" && hasPhoto) return "photo";
    }
    if (hasApproved || hasInstall) return "install";
    if (hasPhoto) return "photo";
    return "empty";
  }, [mode, publicMode, hasPhoto, hasApproved, hasInstall]);

  const styleLabel = MECHANISM_LABELS[style] || style;
  const tileScale = styleFabricScale(style);

  return (
    <div id="curtain-render-preview">
      {!publicMode && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-display font-bold text-primary">
            {effectiveMode === "install"
              ? "نمونه نصب"
              : effectiveMode === "photo"
                ? `قالب زنده · ${styleLabel}`
                : "پیش‌نمایش"}
          </span>
          <div className="flex gap-1.5">
            {hasInstall && (
              <button
                type="button"
                onClick={() => setMode("install")}
                className={`rounded-full border px-2.5 py-1 text-[10px] ${
                  effectiveMode === "install"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-secondary/60 text-muted-foreground"
                }`}
              >
                نمونه نصب
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
                قالب زنده
              </button>
            )}
          </div>
        </div>
      )}

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
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-secondary/70 bg-card/50 px-6 text-center">
          {fabric?.image ? (
            <>
              <img
                src={fabric.image}
                alt={fabric.code || ""}
                className="h-24 w-32 rounded-lg object-cover opacity-90"
              />
              <p className="font-body text-xs text-muted-foreground">
                نمونه نصب این مدل هنوز ساخته نشده. از داشبورد ادمین «تولید» را بزنید یا مدل را دوباره ذخیره
                کنید.
              </p>
            </>
          ) : (
            <p className="font-body text-xs text-muted-foreground">مدلی انتخاب نشده یا عکس پارچه ندارد.</p>
          )}
        </div>
      )}

      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
        {effectiveMode === "install"
          ? "همان تصویر تولیدشده در پنل ادمین برای این مدل."
          : effectiveMode === "photo"
            ? "پیش‌نمایش زنده از قالب دسته + عکس پارچه (تا آماده شدن نمونه نصب)."
            : ""}
      </p>
    </div>
  );
}
