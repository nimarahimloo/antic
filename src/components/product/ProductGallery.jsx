import { useState, useEffect } from "react";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { wixMediaId } from "@/lib/storeImage";

export default function ProductGallery({ images, focusUrl, productName }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  // وقتی کاربر رنگ/گزینه را عوض می‌کند، گالری روی تصویر همان انتخاب می‌رود.
  useEffect(() => {
    if (!focusUrl || images.length === 0) return;
    const idx = images.findIndex((img) => wixMediaId(img.url) === wixMediaId(focusUrl));
    if (idx >= 0) setActiveIndex(idx);
  }, [focusUrl, images]);

  // کنترل با کیبورد + قفل اسکرول در حالت تمام‌صفحه
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowRight") setActiveIndex((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-secondary/60 bg-card font-body text-sm text-muted-foreground">
        بدون تصویر
      </div>
    );
  }

  const current = images[Math.min(activeIndex, images.length - 1)];
  const go = (delta) => setActiveIndex((i) => (i + delta + images.length) % images.length);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <>
      <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
        {/* نوار تصاویر کوچک — عمودی در دسکتاپ، افقی در موبایل */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar lg:max-h-[560px] lg:w-[72px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`تصویر ${i + 1}`}
                className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border transition-all lg:w-full ${
                  activeIndex === i ? "border-primary ring-2 ring-primary/40" : "border-secondary/60 hover:border-primary/60"
                }`}
              >
                <img src={img.url} alt={img.altText || ""} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* تصویر اصلی با بزرگ‌نمایی */}
        <div className="relative flex-1">
          <div
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-secondary/60 bg-card"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onMouseMove={onMove}
            onClick={() => setLightbox(true)}
          >
            <img
              src={current.url}
              alt={current.altText || productName}
              className="h-full w-full object-cover transition-transform duration-150"
              style={hovering ? { transform: "scale(1.9)", transformOrigin: `${origin.x}% ${origin.y}%` } : undefined}
            />
            <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 backdrop-blur-md">
              <ZoomIn className="h-3.5 w-3.5 text-primary" />
              <span className="font-body text-[10px] text-foreground">برای بزرگ‌نمایی، اشاره کنید</span>
            </span>
          </div>

          {/* فلش‌های موبایل */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                aria-label="تصویر قبلی"
                className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-primary hover:text-primary-foreground lg:hidden"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => go(1)}
                aria-label="تصویر بعدی"
                className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-primary hover:text-primary-foreground lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* نمایش تمام‌صفحه */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            aria-label="بستن"
            className="absolute top-5 left-5 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label="تصویر قبلی"
            className="absolute top-1/2 right-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label="تصویر بعدی"
            className="absolute top-1/2 left-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <img
            src={current.url}
            alt={current.altText || productName}
            className="max-h-[78vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity ${
                  activeIndex === i ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-90"
                }`}
                aria-label={`تصویر ${i + 1}`}
              >
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}