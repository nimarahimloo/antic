import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, Tag } from "lucide-react";
import { Image } from "@/components/ui/image";
import { queryCategories, searchProducts } from "@/rest/store-catalog";

function productImage(p) {
  return p?.media?.main?.image?.url || p?.media?.itemsInfo?.items?.[0]?.image?.url || null;
}

export default function AccessoriesPreview() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      queryCategories({ limit: 12 }).catch(() => ({ categories: [] })),
      searchProducts({ limit: 4, sort: "newest" }).catch(() => ({ products: [] })),
    ])
      .then(([catRes, prodRes]) => {
        if (!alive) return;
        setCategories(catRes?.categories || []);
        setProducts(prodRes?.products || []);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="border-t border-secondary/40 bg-card/40 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="h-8 w-72 animate-pulse rounded bg-secondary/40" />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="h-72 animate-pulse rounded-3xl bg-secondary/30" />
            <div className="h-72 animate-pulse rounded-3xl bg-secondary/30" />
          </div>
        </div>
      </section>
    );
  }

  // اگر داده فروشگاه خالی است، سکشن را نشان نده
  if (!categories.length && !products.length) return null;

  const featuredProduct = products[0];
  const featuredCat = categories[0];
  const heroImg =
    productImage(featuredProduct) ||
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
            دسته‌ها و محصولات از کاتالوگ فروشگاه (پنل ادمین / API) بارگذاری می‌شوند.
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
                  <span className="font-display text-lg font-bold text-muted-foreground">فروشگاه</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
              <span className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-display text-[11px] font-bold text-primary-foreground">
                <Tag className="h-3 w-3" /> فروشگاه
              </span>
            </div>
            <div className="p-8">
              <h3 className="font-display text-2xl font-bold text-foreground">
                {featuredProduct?.name || featuredCat?.name || "محصولات فروشگاه"}
              </h3>
              <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">
                {featuredProduct?.plainDescription ||
                  featuredCat?.description ||
                  `${products.length} محصول و ${categories.length} دسته در فروشگاه`}
              </p>
              <Link to="/shop" className="btn-gold mt-6 w-full justify-center sm:w-auto">
                مشاهده و خرید <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="group light-leak relative overflow-hidden rounded-3xl border border-secondary/60 bg-card">
            <div className="p-8">
              <h3 className="font-display text-2xl font-bold text-foreground">دسته‌های فروشگاه</h3>
              <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">
                از پنل ادمین مدیریت می‌شوند.
              </p>
              <ul className="mt-6 space-y-2">
                {categories.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/shop"
                      className="flex items-center justify-between rounded-xl border border-secondary/50 px-4 py-3 font-body text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <span>{c.name}</span>
                      <ArrowLeft className="h-3.5 w-3.5 opacity-60" />
                    </Link>
                  </li>
                ))}
                {!categories.length && (
                  <li className="font-body text-sm text-muted-foreground">هنوز دسته‌ای ثبت نشده است.</li>
                )}
              </ul>
              <a href="tel:02112345678" className="btn-ghost-gold mt-6 w-full justify-center sm:w-auto">
                <Phone className="h-4 w-4" /> مشاوره سفارشی
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
