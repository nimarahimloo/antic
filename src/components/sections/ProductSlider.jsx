import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Phone, ShoppingBag } from "lucide-react";
import { searchProducts } from "@/rest/store-catalog";
import { productImage } from "@/lib/storeImage";
import { SITE_PHONE_HREF } from "@/lib/siteContact";

function hasPriced(product) {
  const amt = Number(product?.actualPriceRange?.minValue?.amount);
  return Number.isFinite(amt) && amt > 0;
}

export default function ProductSlider() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, pointerId: null });
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    searchProducts({ limit: 16 })
      .then((res) => {
        if (alive) setProducts(Array.isArray(res?.products) ? res.products : []);
      })
      .catch(() => {
        if (alive) setProducts([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const pauseAuto = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 2800);
  }, []);

  useEffect(() => () => resumeTimer.current && clearTimeout(resumeTimer.current), []);

  useEffect(() => {
    if (!products.length || paused) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el || dragRef.current.active) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 4) return;
      if (el.scrollLeft >= max - 2) el.scrollLeft = 0;
      else el.scrollLeft += 0.85;
    }, 28);
    return () => clearInterval(id);
  }, [products.length, paused]);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    pauseAuto();
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const onPointerDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      pointerId: e.pointerId,
    };
    el.setPointerCapture?.(e.pointerId);
    pauseAuto();
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = dragRef.current.scrollLeft - (e.clientX - dragRef.current.startX);
  };
  const onPointerUp = () => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    el?.releasePointerCapture?.(dragRef.current.pointerId);
    dragRef.current.active = false;
  };

  if (!loading && !products.length) return null;

  return (
    <section className="border-t border-secondary/40 bg-card/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-3 block">فروشگاه</span>
            <h2 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
              محصولات <span className="text-gold-gradient">منتخب</span>
            </h2>
            <p className="mt-3 max-w-lg font-body text-sm leading-7 text-muted-foreground">
              اکسسوری و مدل‌های پرده — برای پرده‌هایی که قیمت وابسته به ابعاد است، دکمه تماس
              نمایش داده می‌شود.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary text-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="قبلی"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary text-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="بعدی"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Link
              to="/shop"
              className="mr-2 inline-flex items-center gap-2 font-display text-sm font-bold text-primary"
            >
              همه محصولات
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex cursor-grab gap-5 overflow-x-auto pb-2 no-scrollbar active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={pauseAuto}
        >
          {loading &&
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-72 w-56 shrink-0 animate-pulse rounded-2xl bg-secondary/30 sm:w-64"
              />
            ))}
          {!loading &&
            products.map((p) => {
              const img = productImage(p);
              const priced = hasPriced(p);
              const priceLabel = p?.actualPriceRange?.minValue?.formattedAmount;
              return (
                <article
                  key={p.id}
                  className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-secondary/60 bg-card sm:w-64"
                >
                  <Link to={`/product/${p.slug}`} className="relative aspect-[4/5] overflow-hidden bg-secondary/20">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-body text-xs text-muted-foreground">
                        بدون تصویر
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <Link to={`/product/${p.slug}`}>
                      <h3 className="line-clamp-2 font-display text-sm font-bold leading-6 text-foreground">
                        {p.name}
                      </h3>
                    </Link>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      {priced ? (
                        <span className="font-display text-sm font-bold text-primary">{priceLabel}</span>
                      ) : (
                        <span className="font-body text-xs text-muted-foreground">قیمت با ابعاد</span>
                      )}
                      {priced ? (
                        <Link
                          to={`/product/${p.slug}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          aria-label="مشاهده محصول"
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </Link>
                      ) : (
                        <a
                          href={SITE_PHONE_HREF}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-display text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          تماس بگیرید
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </div>
    </section>
  );
}
