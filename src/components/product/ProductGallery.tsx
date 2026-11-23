"use client";

import { useState, useEffect } from "react";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { mediaKey } from "@/lib/storeImage";
import { OptimizedImage, ProductImage } from "@/components/ui/image";
import { cn } from "@/lib/utils";

interface ImageItem {
  url: string;
  altText?: string;
}

interface ProductGalleryProps {
  images: ImageItem[];
  focusUrl: string | null | undefined;
  productName: string;
}

/** گالری محصول: تصویر اصلی + بندانگشتی‌ها همیشه زیر آن (موبایل و دسکتاپ) */
export default function ProductGallery({ images, focusUrl, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!focusUrl || images.length === 0) return;
    const idx = images.findIndex((img) => mediaKey(img.url) === mediaKey(focusUrl));
    if (idx >= 0) setActiveIndex(idx);
  }, [focusUrl, images]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
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
  const go = (delta: number) => setActiveIndex((i) => (i + delta + images.length) % images.length);

  const onMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <div
            className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border border-secondary/60 bg-card"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onMouseMove={onMove}
            onClick={() => setLightbox(true)}
          >
            <OptimizedImage
              src={current.url}
              alt={current.altText || productName}
              fill
              className={cn(
                "object-cover transition-transform duration-150",
                hovering ? "scale-190" : "scale-100"
              )}
              style={hovering ? { transformOrigin: `${origin.x}% ${origin.y}%` } : undefined}
              priority
              quality={90}
            />
            <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/70 px-3 py-1.5 backdrop-blur-md">
              <ZoomIn className="h-3.5 w-3.5 text-primary" />
              <span className="font-body text-[10px] text-foreground">برای بزرگ‌نمایی، اشاره کنید</span>
            </span>
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="تصویر قبلی"
                className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-primary hover:text-primary-foreground lg:hidden"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="تصویر بعدی"
                className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-md transition-colors hover:bg-primary hover:text-primary-foreground lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* گالری همیشه زیر تصویر اصلی — موبایل و دسکتاپ */}
        {images.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar sm:gap-3">
            {images.map((img, i) => (
              <button
                key={`${img.url}-${i}`}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`نمایش تصویر ${i + 1}`}
                className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border transition-all sm:w-20 ${
                  activeIndex === i
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-secondary/60 hover:border-primary/60"
                }`}
              >
                <OptimizedImage src={img.url} alt={img.altText || ""} fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="بستن"
            className="z-20 absolute top-5 left-5 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="تصویر قبلی"
            className="z-20 absolute top-1/2 right-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="تصویر بعدی"
            className="z-20 absolute top-1/2 left-4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-secondary/60 text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="relative max-w-[90vw] max-h-[78vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <OptimizedImage
              src={current.url}
              alt={current.altText || productName}
              fill
              className="rounded-xl object-contain"
              priority
              quality={90}
            />
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-opacity ${
                  activeIndex === i ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-90"
                }`}
                aria-label={`تصویر ${i + 1}`}
              >
                <OptimizedImage src={img.url} alt="" fill className="object-cover" sizes="56px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}