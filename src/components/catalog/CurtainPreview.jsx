/**
 * پیش‌نمایش کاتالوگ:
 * سایت = نمونه نصب از عکس واقعی محصول (قالب‌های PNF1210 / Roman80 / …)
 * اگر هنوز ساخته نشده = پنجره مجازی موقت
 */
import { useState } from "react";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import PhotoCurtain from "@/components/catalog/photo/PhotoCurtain";
import {
  resolveStyle,
  pickTemplateUrl,
  styleFabricScale,
  MECHANISM_LABELS,
} from "@/lib/curtainStyleResolve";
import { useRenderTemplates } from "@/hooks/useRenderTemplates";
import { mediaUrl } from "@/lib/mediaUrl";

function RoomShell({ children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-secondary/60 bg-[#cfc3b0] shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      {children}
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
  const fabricNorm = fabric ? { ...fabric, image: fabricSrc || fabric.image } : null;

  if (publicMode) {
    return (
      <div id="curtain-render-preview">
        <RoomShell>
          {hasInstall ? (
            <div className="aspect-[3/4] sm:aspect-[4/5]">
              <img
                src={installSrc}
                alt={`نصب ${fabric?.code || ""}`}
                className="h-full w-full object-contain bg-[#d4c4b0]"
              />
            </div>
          ) : fabricNorm ? (
            <VirtualWindow fabric={fabricNorm} open={0.28} scale={0.72} />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center">
              <p className="font-body text-xs text-muted-foreground">مدلی انتخاب نشده</p>
            </div>
          )}
        </RoomShell>
        <p className="mt-2 text-center text-[10px] leading-5 text-muted-foreground">
          {hasInstall
            ? "نمونه نصب واقعی · پارچهٔ همین مدل روی قالب محصول"
            : "هنوز نمونه نصب ساخته نشده — در ادمین عکس واقعی محصول را به‌عنوان مرجع آپلود و batch بزنید"}
        </p>
      </div>
    );
  }

  const showInstall = (mode === "install" || !hasPhoto) && hasInstall;
  const showPhoto = mode === "photo" && hasPhoto;
  const showWindow = mode === "window" || (!hasInstall && !hasPhoto);

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display font-bold text-primary">
          {showInstall
            ? "نمونه نصب (عکس واقعی + پارچه)"
            : showPhoto
              ? `قالب chroma · ${styleLabel}`
              : "پنجره مجازی (موقت)"}
        </span>
        <div className="flex flex-wrap gap-1.5">
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
          <button
            type="button"
            onClick={() => setMode("window")}
            className={`rounded-full border px-2.5 py-1 text-[10px] ${
              showWindow
                ? "border-primary bg-primary/10 text-primary"
                : "border-secondary/60 text-muted-foreground"
            }`}
          >
            پنجره
          </button>
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
              chroma
            </button>
          )}
        </div>
      </div>

      <RoomShell>
        {showInstall ? (
          <div className="aspect-[3/4]">
            <img src={installSrc} alt="" className="h-full w-full object-contain bg-[#d4c4b0]" />
          </div>
        ) : showWindow && fabricNorm ? (
          <VirtualWindow fabric={fabricNorm} open={0.28} scale={0.72} />
        ) : showPhoto ? (
          <div className="aspect-[4/3]">
            <PhotoCurtain
              template={templateUrl}
              fabric={fabricNorm}
              scale={tileScale}
              styleKey={style}
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-xs text-muted-foreground">
            بدون مدل
          </div>
        )}
      </RoomShell>

      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
        قالب اصلی = عکس واقعی محصول (مثل Roman80، PNF1210، PX2607). در بخش «نمونه‌های اجرای
        واقعی» با style برابر slug دسته آپلود کنید، بعد batch بزنید.
      </p>
    </div>
  );
}
