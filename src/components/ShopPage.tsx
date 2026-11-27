"use client";

import { useShop } from "@/hooks/useShop";
import ProductGrid from "@/components/ProductGrid";
import PageHero from "@/components/PageHero";
import { storeImage } from "@/lib/storeImage";
import { mediaUrl } from "@/lib/mediaUrl";
import { ThumbnailImage } from "@/components/ui/image";

interface ShopPageProps {
  initialCategories?: Array<{ id: string; name: string; slug: string; image: string | null; description?: string; visible?: boolean; order?: number }>;
  initialProducts?: Array<{ id: string; slug: string; name: string; description?: string; price: number; formattedPrice?: string; image?: string; categoryId?: string; visible?: boolean; inStock?: boolean; stock?: number; ribbon?: string; optionsJson?: string; variantsJson?: string; sortOrder?: number; createdAt?: string; updatedAt?: string }>;
}

export default function ShopPage({
  initialCategories,
  initialProducts,
}: ShopPageProps = {}) {
  const s = useShop({ pageSize: 24, initialCategories, initialProducts });

  return (
    <div className="bg-background">
      <PageHero
        pageKey="shop"
        eyebrow="فروشگاه"
        title="محصولات"
        description="محصولات فروشگاه — از یراق و اکسسوری تا مدل‌های آماده."
      />

      <section className="sticky top-16 md:top-20 z-30 border-b border-secondary/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 lg:px-10">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => s.setActiveCategory(null)}
              className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border text-center transition-colors ${
                !s.activeCategory
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/70 text-muted-foreground hover:border-primary/50"
              }`}
            >
              <span className="font-display text-[11px] font-bold">همه</span>
            </button>
            {s.categories.map((c) => {
              const active = s.activeCategory?.id === c.id;
              const imgSrc = mediaUrl(storeImage(c.image as string | { image?: { url: string }; url?: string } | undefined | null) || "");
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => s.setActiveCategory(c)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border transition-all ${
                    active
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-secondary/70 hover:border-primary/50"
                  }`}
                >
                  {imgSrc ? (
                    <ThumbnailImage src={imgSrc} alt={c.name} size={80} className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary/40 px-1">
                      <span className="font-display text-[10px] font-bold text-muted-foreground">{c.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <span className="absolute inset-x-0 bottom-1 px-1 text-center font-display text-[10px] font-bold text-foreground">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        {s.error ? (
          <div className="rounded-2xl border border-destructive/40 bg-card p-10 text-center">
            <p className="font-body text-sm text-muted-foreground">{s.error}</p>
            <button type="button" onClick={s.retry} className="btn-ghost-gold mt-5">
              تلاش دوباره
            </button>
          </div>
        ) : (
          <ProductGrid
            products={s.products ?? []}
            loading={s.loading}
            emptyMessage={s.error ? "" : "در حال حاضر محصولی برای نمایش نیست."}
            onLoadMore={s.hasMore ? s.loadMore : undefined}
            loadingMore={s.loadingMore}
          />
        )}
      </section>
    </div>
  );
}