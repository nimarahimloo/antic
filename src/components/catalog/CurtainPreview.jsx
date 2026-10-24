/**
 * پیش‌نمایش کاتالوگ — یک مسیر ساده و هم‌تراز ادمین:
 *
 * سایت عمومی:
 *   فقط install_image همان مدلی که در پنل ساخته شده.
 *   اگر هنوز ساخته نشده → عکس پارچه داخل قاب پنجره ثابت (بدون رندر سبز/کارتونی).
 *
 * پنل ادمین (publicMode=false):
 *   می‌تواند بین نمونه نصب و پیش‌نمایش زنده قالب جابه‌جا شود.
 */
import { useState } from "react";
import PhotoCurtain from "@/components/catalog/photo/PhotoCurtain";
import {
  resolveStyle,
  pickTemplateUrl,
  styleFabricScale,
  MECHANISM_LABELS,
} from "@/lib/curtainStyleResolve";
import { useRenderTemplates } from "@/hooks/useRenderTemplates";

function WindowFrame({ children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#c8b89a]/80 bg-[#1a1510] shadow-[inset_0_0_0_6px_#f5f0e6,0_12px_40px_rgba(0,0,0,0.18)]">
      {/* نوار بالای قاب */}
      <div className="h-3 bg-gradient-to-b from-[#efe6d6] to-[#d4c4a8]" />
      <div className="relative aspect-[4/3] bg-[#e8eef4]">{children}</div>
      {/* لبه پایین قاب */}
      <div className="h-4 bg-gradient-to-b from-[#d4c4a8] to-[#b8a888]" />
    </div>
  );
}

export default function CurtainPreview({ fabric, publicMode = false }) {
  const [mode, setMode] = useState("install");
  const templates = useRenderTemplates();

  const style = fabric ? resolveStyle(fabric) : "drape";
  const picked = fabric ? pickTemplateUrl(fabric, templates) : null;
  const templateUrl = picked?.url || null;
  const hasInstall = Boolean(fabric?.install_image);
  const hasPhoto = Boolean(templateUrl && fabric?.image);
  const styleLabel = MECHANISM_LABELS[style] || style;
  const tileScale = styleFabricScale(style);

  // ── سایت عمومی: فقط همان چیزی که ادمین تولید کرده ──
  if (publicMode) {
    return (
      <div id="curtain-render-preview">
        <WindowFrame>
          {hasInstall ? (
            <img
              src={fabric.install_image}
              alt={`نصب ${fabric.code || ""}`}
              className="h-full w-full object-cover"
            />
          ) : fabric?.image ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#dfe6ee] p-6">
              <img
                src={fabric.image}
                alt={fabric.code || ""}
                className="max-h-[70%] max-w-[80%] rounded-lg object-contain shadow-md"
              />
              <p className="font-body text-[11px] text-muted-foreground">
                نمونه نصب این مدل هنوز از پنل ادمین ساخته نشده است.
              </p>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="font-body text-xs text-muted-foreground">مدلی انتخاب نشده</p>
            </div>
          )}
        </WindowFrame>
        {hasInstall && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            همان نمونه نصب تولیدشده در پنل ادمین برای این مدل
          </p>
        )}
      </div>
    );
  }

  // ── پنل / حالت غیرفعال عمومی: نصب یا زنده ──
  const showInstall = (mode === "install" || !hasPhoto) && hasInstall;
  const showPhoto = mode === "photo" && hasPhoto;

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display font-bold text-primary">
          {showInstall ? "نمونه نصب" : showPhoto ? `قالب زنده · ${styleLabel}` : "پیش‌نمایش"}
        </span>
        <div className="flex gap-1.5">
          {hasInstall && (
            <button
              type="button"
              onClick={() => setMode("install")}
              className={`rounded-full border px-2.5 py-1 text-[10px] ${
                showInstall
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
                showPhoto
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/60 text-muted-foreground"
              }`}
            >
              قالب زنده
            </button>
          )}
        </div>
      </div>

      <WindowFrame>
        {showInstall ? (
          <img
            src={fabric.install_image}
            alt={`نصب ${fabric.code || ""}`}
            className="h-full w-full object-cover"
          />
        ) : showPhoto ? (
          <PhotoCurtain template={templateUrl} fabric={fabric} scale={tileScale} styleKey={style} />
        ) : fabric?.image ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
            <img src={fabric.image} alt="" className="max-h-[70%] max-w-[80%] object-contain" />
            <p className="text-center text-[11px] text-muted-foreground">
              نمونه نصب هنوز ساخته نشده — در داشبورد «تولید» را بزنید.
            </p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            بدون مدل
          </div>
        )}
      </WindowFrame>
    </div>
  );
}
