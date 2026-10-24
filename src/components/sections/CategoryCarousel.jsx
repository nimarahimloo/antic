import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";

/**
 * اسلایدر دسته‌های کاتالوگ زیر هیرو:
 * - کشیدن با ماوس/لمس
 * - دکمه‌های چپ و راست
 * - حرکت خودکار آهسته (با توقف هنگام تعامل)
 */
export default function CategoryCarousel() {
  const { categories, loading } = useCurtainCategories();
  const scrollerRef = useRef(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    pointerId: null,
  });
  const resumeTimer = useRef(null);
  const [paused, setPaused] = useState(false);

  const pauseAuto = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  // حرکت خودکار افقی
  useEffect(() => {
    if (!categories.length || paused) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el || dragRef.current.active) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;
      if (el.scrollLeft >= max - 2) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += 0.75;
      }
    }, 24);
    return () => clearInterval(id);
  }, [categories.length, paused]);

  const scrollByDir = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    pauseAuto();
    const card = el.querySelector("[data-card]");
    const step = (card?.offsetWidth || 176) + 20;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const onPointerDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    // فقط دکمه اصلی ماوس / لمس
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
      pointerId: e.pointerId,
    };
    pauseAuto();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 5) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  const endDrag = (e) => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    if (el && dragRef.current.pointerId != null) {
      try {
        el.releasePointerCapture(dragRef.current.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current.active = false;
    pauseAuto();
  };

  const onClickCapture = (e) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  if (loading && categories.length === 0) {
    return (
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary/40" />
          <div className="mt-8 flex gap-5 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-44 w-44 shrink-0 animate-pulse rounded-2xl bg-secondary/30 lg:h-56 lg:w-56"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories.length) return null;

  return (
    <section className="relative bg-background py-16 lg:py-20">
      <div className="mx-auto mb-8 flex max-w-7xl items-end justify-between gap-4 px-5 lg:px-10">
        <div>
          <span className="eyebrow mb-3 block">دسته‌بندی پرده</span>
          <h2 className="font-display text-2xl font-black text-foreground lg:text-3xl">
            انواع <span className="text-gold-gradient">پرده</span> و کالکشن
          </h2>
          <p className="mt-2 font-body text-xs text-muted-foreground">
            بکشید یا با دکمه‌ها جابه‌جا کنید
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            aria-label="قبلی"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-card text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            aria-label="بعدی"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-card text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* dir=ltr برای رفتار یکنواخت scrollLeft در درگ */}
      <div
        ref={scrollerRef}
        dir="ltr"
        className="flex cursor-grab gap-5 overflow-x-auto no-scrollbar px-5 active:cursor-grabbing lg:gap-6 lg:px-10"
        style={{ scrollBehavior: dragRef.current.active ? "auto" : undefined, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            data-card
            to={`/catalog?category=${cat.slug}`}
            className="group relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-secondary/60 bg-card transition-all duration-500 hover:border-primary lg:h-56 lg:w-56"
            dir="rtl"
            draggable={false}
          >
            {cat.image ? (
              <img
                src={cat.image}
                alt={cat.name}
                className="pointer-events-none h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                draggable={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary/40">
                <span className="font-display text-sm font-bold text-muted-foreground">{cat.name}</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-center">
              <h3 className="font-display text-sm font-bold text-foreground lg:text-lg">{cat.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
