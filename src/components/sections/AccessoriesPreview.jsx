import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useShop } from "@/hooks/useShop";

export default function AccessoriesPreview() {
  const s = useShop({ pageSize: 8 });
  const featuredProduct = s.products?.[0];
  const featuredCat = s.activeCategory || s.categories?.[0];
  const heroImg =
    featuredProduct?.image?.url ||
    (typeof featuredProduct?.image === "string" ? featuredProduct.image : null) ||
    featuredCat?.image?.url ||
    (typeof featuredCat?.image === "string" ? featuredCat.image : null);

  return (
    <section className="border-t border-secondary/40 bg-card/40 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-14 max-w-2xl">
          <span className="eyebrow mb-4 block">فروشگاه</span>
          <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
            محصولات <span className="text-gold-gradient">قابل خرید</span>
          </h2>
          <p className="mt-5 font-body text-sm leading-7 text-muted-foreground">
            یراق و اکسسوری پرده برای تکمیل سفارش — مستقیم از فروشگاه قابل خرید است.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <article className="group light-leak relative overflow-hidden rounded-3xl border border-primary/30 bg-card">
            <div className="relative aspect-[16/10] overflow-hidden">
              {heroImg ? (
                <Image
                  src={heroImg}
                  alt={featuredProduct?.name || featuredCat?.name || "فروشگاه"}
                  className="h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                  fittingType="fill"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/40">
                  <span className="font-display text-sm text-muted-foreground">فروشگاه اکسسوری</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            </div>
            <div className="p-6">
              <h3 className="font-display text-xl font-bold text-foreground">
                {featuredProduct?.name || featuredCat?.name || "اکسسوری پرده"}
              </h3>
              <p className="mt-2 font-body text-xs leading-6 text-muted-foreground">
                برای مشاهده همه اقلام به فروشگاه بروید.
              </p>
              <Link to="/shop" className="btn-ghost-gold mt-4 inline-flex">
                ورود به فروشگاه
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            {(s.categories || []).slice(0, 4).map((c) => (
              <Link
                key={c.id}
                to="/shop"
                className="group overflow-hidden rounded-2xl border border-secondary/60 bg-card transition hover:border-primary/40"
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      {c.name}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-display text-sm font-bold text-foreground">{c.name}</p>
                </div>
              </Link>
            ))}
            {!s.categories?.length && (
              <p className="font-body text-sm text-muted-foreground sm:col-span-2">
                دسته‌های فروشگاه به‌زودی در این بخش نمایش داده می‌شوند.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
