/**
 * پیش‌نمایش یکپارچه:
 * - سایت: اگر نمونه نصب (قالب+پارچه) باشد همان را نشان بده — این «قالب روی پنجره» است
 *   وگرنه پنجره مجازی WebGL با پارچهٔ مدل
 * - ادمین: تب‌ها برای مقایسه؛ پیش‌فرض پنجره
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
    <div
      className="relative overflow-hidden rounded-2xl border border-[#2a241c]/80 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
      style={{ background: "#75634f" }}
    >
      {children}
    </div>
  );
}

export default function CurtainPreview({ fabric, publicMode = false }) {
  const [mode, setMode] = useState("window");
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
  const fabricNorm = fabric
    ? {
        ...fabric,
        image: fabricSrc || fabric.image,
        // sheer از فیلد پارچه هم تشخیص داده شود
        fabric: fabric.fabric,
        material: fabric.material,
      }
    : null;

  // ── سایت عمومی ──
  // اولویت: نمونه نصب = خروجی موتور قالب+پارچه (همان مسیر ادمین)
  // اگر نبود: پنجره مجازی با پارچه زنده
  if (publicMode) {
    return (
      <div id="curtain-render-preview">
        <RoomShell>
          {hasInstall ? (
            <div className="aspect-[4/3]">
              <img
                src={installSrc}
                alt={`نصب ${fabric?.code || ""}`}
                className="h-full w-full object-cover"
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
            ? "نمونه نصب از قالب دسته + پارچهٔ همین مدل (مسیر ادمین)"
            : "پنجره مجازی · پارچه از مدل · بکشید تا باز/بالا شود"}
        </p>
      </div>
    );
  }

  // ── ادمین ──
  const showWindow = mode === "window";
  const showInstall = mode === "install" && hasInstall;
  const showPhoto = mode === "photo" && hasPhoto;

  return (
    <div id="curtain-render-preview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-display font-bold text-primary">
          {showWindow
            ? "پنجره مجازی"
            : showInstall
              ? "نمونه نصب (= قالب + پارچه روی سرور)"
              : showPhoto
                ? `قالب زنده · ${styleLabel}`
                : "پیش‌نمایش"}
        </span>
        <div className="flex flex-wrap gap-1.5">
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

      <RoomShell>
        {showWindow && fabricNorm ? (
          <VirtualWindow fabric={fabricNorm} open={0.28} scale={0.72} />
        ) : showInstall ? (
          <div className="aspect-[4/3]">
            <img src={installSrc} alt="" className="h-full w-full object-cover" />
          </div>
        ) : showPhoto ? (
          <div className="aspect-[4/3]">
            <PhotoCurtain
              template={templateUrl}
              fabric={fabricNorm}
              scale={tileScale}
              styleKey={style}
            />
          </div>
        ) : fabricSrc ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 p-6">
            <img src={fabricSrc} alt="" className="max-h-[70%] max-w-[80%] object-contain" />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-xs text-muted-foreground">
            بدون مدل
          </div>
        )}
      </RoomShell>

      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
        «نمونه نصب» و «قالب زنده» همان موتور chroma هستند. «پنجره» رندر تعاملی سه‌بعدی است.
        برای یکی شدن ظاهر، قالب دسته را بسازید و batch بزنید.
      </p>
    </div>
  );
}
