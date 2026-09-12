import { useMemo } from "react";
import { useShop, SORTS } from "@/hooks/useShop";
import ProductGrid from "@/components/ProductGrid";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Shop() {
  const s = useShop({ pageSize: 24 });
  const [sortKey, sortLabel] = useMemo(() => {
    const entry = Object.entries(SORTS).find(([k]) => k === s.sort) ?? ["featured", { label: "پیش‌فرض" }];
    return [entry[0], entry[1].label];
  }, [s.sort]);

  return (
    <div className="bg-background">
      {/* سربرگ */}
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">فروشگاه · اکسسوری پرده</span>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-5xl">
            اکسسوری <span className="text-gold-gradient">لوکس</span> پرده
          </h1>
          <p className="mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            حلقه، نوار نگهدارنده، فینیس و اکسسوری — قابل خرید مستقیم. برای پرده‌های شرکتی و پارچه، با ما تماس بگیرید.
          </p>
        </div>
      </section>

      {/* کنترل‌ها */}
      <section className="sticky top-20 z-30 border-b border-secondary/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => s.setActiveCategory(null)}
              className={`rounded-full border px-4 py-2 font-body text-xs transition-colors ${
                !s.activeCategory ? "border-primary bg-primary text-primary-foreground" : "border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              همه
            </button>
            {s.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => s.setActiveCategory(c)}
                className={`rounded-full border px-4 py-2 font-body text-xs transition-colors ${
                  s.activeCategory?.id === c.id ? "border-primary bg-primary text-primary-foreground" : "border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                value={s.filters.search ?? ""}
                onChange={(e) => s.setFilters({ search: e.target.value || undefined })}
                placeholder="جستجوی اکسسوری…"
                className="w-full rounded-full border border-secondary/70 bg-card py-2.5 pr-10 pl-4 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary sm:w-72"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortKey}
                onChange={(e) => s.setSort(e.target.value)}
                className="rounded-full border border-secondary/70 bg-card px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors focus:border-primary"
              >
                {Object.entries(SORTS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* شبکه محصول */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        {s.error ? (
          <div className="rounded-2xl border border-destructive/40 bg-card p-10 text-center">
            <p className="font-body text-sm text-muted-foreground">{s.error}</p>
            <button onClick={s.retry} className="btn-ghost-gold mt-5">تلاش دوباره</button>
          </div>
        ) : (
          <ProductGrid
            products={s.products}
            loading={s.loading}
            emptyMessage={s.error ? "" : "هنوز محصولی ثبت نشده است."}
            emptyHint={s.error ? "" : "به‌زودی محصولات اکسسوری اضافه می‌شوند."}
          />
        )}

        {s.hasMore && !s.error && (
          <div className="mt-12 flex justify-center">
            <button onClick={s.loadMore} disabled={s.loadingMore} className="btn-ghost-gold disabled:opacity-50">
              {s.loadingMore ? "در حال بارگذاری…" : "بیشتر"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}