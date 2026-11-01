import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useShop } from "@/hooks/useShop";
import { storeImage } from "@/lib/storeImage";
import { mediaUrl } from "@/lib/mediaUrl";

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
          <h2 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
            یراق و اکسسوری
          </h2>
          <p className="mt-4 font-body text-sm leading-7 text-muted-foreground lg:text-base">
            محصولات آماده فروشگاه — دسته‌ها را مرور کنید و مدل مورد نظر را پیدا کنید.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative overflow-hidden rounded-3xl border border-secondary/60 bg-card">
            {heroImg ? (
              <Image
                src={mediaUrl(storeImage(heroImg) || "")}
                alt={featuredProduct?.name || featuredCat?.name || "فروشگاه"}
                className="aspect-[4/3] h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-secondary/30">
                <span className="font-display text-lg text-muted-foreground">فروشگاه</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="font-display text-lg font-bold text-foreground">
                {featuredProduct?.name || featuredCat?.name || "محصولات فروشگاه"}
              </p>
              <Link
                to="/shop"
                className="mt-3 inline-flex items-center gap-2 font-body text-sm font-medium text-primary hover:underline"
              >
                مشاهده همه
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(s.categories || []).slice(0, 4).map((c) => (
              <Link
                key={c.id}
                to="/shop"
                className="group overflow-hidden rounded-2xl border border-secondary/60 bg-card transition hover:border-primary/40"
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
                  {(() => {
                    const src = mediaUrl(storeImage(c.image) || "");
                    return src ? (
                      <img src={src} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        {c.name}
                      </div>
                    );
                  })()}
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
