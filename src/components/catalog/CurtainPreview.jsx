/**
 * پیش‌نمایش کاتالوگ — فقط عکس واقعی:
 * ۱) install_image (نمونه نصب از قالب سبز)
 * ۲) وگرنه عکس پارچه مدل
 * WebGL / پنجره مجازی حذف شد.
 */
import { mediaUrl } from "@/lib/mediaUrl";

function RoomShell({ children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-secondary/60 bg-[#cfc3b0] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
      {children}
    </div>
  );
}

export default function CurtainPreview({ fabric, publicMode = false }) {
  const installSrc = fabric?.install_image ? mediaUrl(fabric.install_image) : null;
  const fabricSrc = fabric?.image ? mediaUrl(fabric.image) : null;
  const src = installSrc || fabricSrc;
  const isInstall = Boolean(installSrc);

  return (
    <div id="curtain-render-preview">
      {!publicMode && (
        <p className="mb-2 font-display text-xs font-bold text-primary">
          {isInstall ? "نمونه نصب" : fabricSrc ? "عکس پارچه" : "بدون تصویر"}
        </p>
      )}
      <RoomShell>
        {src ? (
          <div className="aspect-[3/4] sm:aspect-[4/5]">
            <img
              src={src}
              alt={fabric?.code || fabric?.name || "پرده"}
              className="h-full w-full object-contain bg-[#d4c4b0]"
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center">
            <p className="font-body text-xs text-muted-foreground">تصویری برای نمایش نیست</p>
          </div>
        )}
      </RoomShell>
      <p className="mt-2 text-center text-[10px] leading-5 text-muted-foreground">
        {isInstall
          ? "نمونه نصب از قالب سبز و عکس پارچه"
          : fabricSrc
            ? "هنوز نمونه نصب ساخته نشده — قالب سبز را آپلود و رندر را اجرا کنید"
            : "مدل بدون تصویر"}
      </p>
    </div>
  );
}
