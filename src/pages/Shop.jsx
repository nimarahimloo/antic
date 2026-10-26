import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useShop } from "@/hooks/useShop";
import ProductCard from "@/components/ProductCard";
import { formatPrice } from "@/rest/catalog";

export default function Shop() {
  const s = useShop();

  const sortLabel = useMemo(() => {
    const entry = Object.entries(s.sortOptions || {}).find(([k]) => k === s.sort);
    if (!entry) return "";
    return entry[1]?.label || entry[0];
  }, [s.sort, s.sortOptions]);

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">فروشگاه</span>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-5xl">
            محصولات
          </h1>
          <p className="mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            محصولات فروشگاه — از یراق و اکسسوری تا مدل‌های آماده. هر محصولی که در ادمین اضافه شود
            اینجا نمایش داده می‌شود. برای سفارش سفارشی پرده از کاتالوگ یا تماس استفاده کنید.
          </p>
        </div>
      </section>

      <section className="sticky top-20 z-30 border-b border-secondary/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:px-10">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => s.setCategory(null)}
              className={`shrink-0 rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
                !s.category
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/60 text-muted-foreground hover:border-primary/50"
              }`}
            >
              همه
            </button>
            {(s.categories || []).map((c) => (
              <button
                type="button"
                key={c.id || c.slug}
                onClick={() => s.setCategory(c.slug)}
                className={`shrink-0 rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
                  s.category === c.slug
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-secondary/60 text-muted-foreground hover:border-primary/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={s.query || ""}
              onChange={(e) => s.setQuery?.(e.target.value)}
              placeholder="جستجو در محصولات…"
              className="w-full rounded-xl border border-secondary/60 bg-background px-4 py-2 font-body text-sm text-foreground/90 outline-none placeholder:text-muted-foreground/60 focus:border-primary sm:w-72"
            />
            {s.sortOptions && (
              <select
                value={s.sort}
                onChange={(e) => s.setSort?.(e.target.value)}
                className="rounded-xl border border-secondary/60 bg-background px-3 py-2 font-body text-xs text-foreground"
                aria-label="مرتب‌سازی"
              >
                {Object.entries(s.sortOptions).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label || k}
                  </option>
                ))}
              </select>
            )}
            {sortLabel ? (
              <span className="font-body text-[11px] text-muted-foreground">{sortLabel}</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        {s.loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-secondary/30" />
            ))}
          </div>
        ) : !(s.products || []).length ? (
          <p className="py-20 text-center font-body text-sm text-muted-foreground">
            محصولی در این دسته نیست.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(s.products || []).map((p) => (
              <ProductCard key={p.id || p.slug} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
