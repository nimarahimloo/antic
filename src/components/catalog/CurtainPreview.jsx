/**
 * پیش‌نمایش کاتالوگ — یک مسیر با ادمین:
 * سایت: فقط install_image
 * ادمین: نصب یا قالب زنده
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
import { mediaUrl } from "@/lib/mediaUrl";

function WindowFrame({ children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[#c8b89a]/80 bg-[#1a1510] shadow-[inset_0_0_0_6px_#f5f0e6,0_12px_40px_rgba(0,0,0,0.18)]">
      <div className="h-3 bg-gradient-to-b from-[#efe6d6] to-[#d4c4a8]" />
      <div className="relative aspect-[4/3] bg-[#e8eef4]">{children}</div>
      <div className="h-4 bg-gradient-to-b from-[#d4c4a8] to-[#b8a888]" />
    </div>
  );
}

export default function CurtainPreview({ fabric, publicMode = false }) {
  const [mode, setMode] = useState("install");
  const templates = useRenderTemplates();

  const style = fabric ? resolveStyle(fabric) : "drape";
  const picked = fabric ? pickTemplateUrl(fabric, templates) : null;
  const templateUrl = picked?.url ? mediaUrl(picked.url) : null;
  const installSrc = fabric?.install_image ? mediaUrl(fabric.install_image) : null;
  const fabricSrc = fabric?.image ? mediaUrl(fabric.image) : null;
  const hasInstall = Boolean(installSrc);
  const hasPhoto = Boolean(templateUrl && fabricSrc);
  const styleLabel = MECHANISM_LABELS[style] || style;
  const tileScale = styleFabricScale(style);

  if (publicMode) {
    return (
      <div id="curtain-render-preview">
        <WindowFrame>
          {hasInstall ? (
            <img
              src={installSrc}
              alt={`نصب ${fabric.code || ""}`}
              className="h-full w-full object-cover"
            />
          ) : fabricSrc ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#dfe6ee] p-6">
              <img
                src={fabricSrc}
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

  const showInstall = (mode === "install" || !hasPhoto) && hasInstall;
  const showPhoto = mode === "photo" && hasPhoto;
  const fabricForPhoto = fabricSrc ? { ...fabric, image: fabricSrc } : fabric;

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
          <img src={installSrc} alt={`نصب ${fabric.code || ""}`} className="h-full w-full object-cover" />
        ) : showPhoto ? (
          <PhotoCurtain template={templateUrl} fabric={fabricForPhoto} scale={tileScale} styleKey={style} />
        ) : fabricSrc ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
            <img src={fabricSrc} alt="" className="max-h-[70%] max-w-[80%] object-contain" />
            <p className="text-center text-[11px] text-muted-foreground">
              نمونه نصب هنوز ساخته نشده — در داشبورد «تولید» را بزنید.
            </p>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">بدون مدل</div>
        )}
      </WindowFrame>
    </div>
  );
}
