"use client";

import { SITE_PHONE_HREF } from "@/lib/siteContact";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProductDetail } from "@/hooks/useProductDetail";
import { useVariantOptions } from "@/hooks/useVariantOptions";
import { productGallery, storeImage } from "@/lib/storeImage";
import ProductGallery from "@/components/product/ProductGallery";
import ProductSpecs from "@/components/product/ProductSpecs";
import RelatedProjects from "@/components/RelatedProjects";
import ProductCard from "@/components/ProductCard";
import { searchProducts } from "@/rest/store-catalog";
import { ArrowRight, Phone, Truck, ShieldCheck, Headphones, Store, BadgeCheck, Loader2 } from "lucide-react";

export default function ProductDetailPage({ slug }: { slug: string }) {
  const d = useProductDetail(slug);
  const { optionGroups, modifierGroups } = useVariantOptions(
    d.options, d.modifiers, d.selectedOptions, d.modifierValues
  );

  // Similar products: same category, excluding current, published only
  const [similarProducts, setSimilarProducts] = useState<Array<{ id: string; slug: string; name: string; image?: string }>>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);

  useEffect(() => {
    if (!d.product?.categoryId) {
      setSimilarProducts([]);
      return;
    }
    let cancelled = false;
    setSimilarLoading(true);
    setSimilarError(null);

    searchProducts({
      categoryId: d.product.categoryId,
      limit: 6,
    })
      .then((res) => {
        if (cancelled) return;
        const products = (res?.products || [])
          .filter((p) => p.id !== d.product!.id && p.visible !== false)
          .map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            image: (p as { media?: { main?: { image?: { url: string } } } }).media?.main?.image?.url || p.image,
          }));
        setSimilarProducts(products);
      })
      .catch((err) => {
        if (cancelled) return;
        setSimilarError(err.message || "خطا در بارگذاری محصولات مشابه");
      })
      .finally(() => {
        if (cancelled) return;
        setSimilarLoading(false);
      });

    return () => { cancelled = true; };
  }, [d.product?.categoryId, d.product?.id]);

  const images = useMemo(
    () =>
      d.product
        ? productGallery(d.product)
            .map((img) => ({ url: storeImage(img.url), altText: img.altText }))
            .filter((img): img is { url: string; altText: string } => img.url !== null)
        : [],
    [d.product]
  );
  const focusUrl = d.focusMediaUrl ? (storeImage(d.focusMediaUrl) ?? "") : "";

  const handleContact = () => {
    window.location.href = SITE_PHONE_HREF;
  };

  if (d.error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-6 w-6 text-destructive" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="font-body text-sm text-muted-foreground">{d.error}</p>
          <button onClick={d.retry} className="btn-ghost-gold">تلاش دوباره</button>
        </div>
      </div>
    );
  }
  if (d.notFound) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-2xl font-black text-foreground">محصول پیدا نشد</h1>
          <p className="font-body text-sm text-muted-foreground">محصول مورد نظر در دسترس نیست.</p>
          <Link href="/shop" className="btn-gold">بازگشت به فروشگاه</Link>
        </div>
      </div>
    );
  }
  if (!d.product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="font-body text-xs text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  const specRows = [
    { key: "برند", value: "پرده آنتیک" },
    { key: "نام محصول", value: d.product?.name ?? "" },
  ];
  optionGroups.forEach((g) => {
    const selected = g.choices.find((c) => c.selected);
    if (selected) specRows.push({ key: g.name, value: selected.name });
  });
  modifierGroups.forEach((m) => {
    if (m.value) specRows.push({ key: m.name, value: m.value });
  });
  specRows.push({
    key: "وضعیت موجودی",
    value: d.inStock ? "موجود و آماده ارسال" : "ناموجود",
  });

  return (
    <div className="bg-background pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10 lg:pt-12">
        <nav className="flex items-center gap-2 font-body text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">
            خانه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link href="/shop" className="transition-colors hover:text-primary">
            فروشگاه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{d.product.name}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Gallery - RTL: right side on desktop, top on mobile */}
          <div className="lg:col-span-5 lg:order-2">
            <ProductGallery images={images} focusUrl={focusUrl} productName={d.product?.name ?? ""} />
          </div>

          {/* Details - RTL: left side on desktop, bottom on mobile */}
          <div className="lg:col-span-7 lg:order-1">
            <div className="rounded-2xl border border-secondary/60 bg-card p-6 lg:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Store className="h-4 w-4 text-primary" />
                <span className="font-display text-xs font-bold text-primary">فروشگاه رسمی پرده آنتیک</span>
                <BadgeCheck className="h-4 w-4 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-black leading-snug text-foreground lg:text-3xl">
                {d.product.name}
              </h1>

              <div className="mt-6 rounded-xl border border-secondary/60 bg-background p-5">
                <span className="font-body text-xs text-muted-foreground block mb-1">قیمت</span>
                <button type="button" onClick={handleContact} className="btn-gold w-full justify-center">
                  <Phone className="h-4 w-4" />
                  تماس بگیرید
                </button>
              </div>

              {d.product.plainDescription && (
                <div
                  className="mt-7 font-body text-sm leading-8 text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: d.product.plainDescription }}
                />
              )}

              {optionGroups.map((group) => (
                <div key={group.id} className="mt-8">
                  <h3 className="mb-3 font-display text-sm font-bold text-foreground">{group.name}</h3>
                  <div className="flex flex-wrap gap-3">
                    {group.choices.map((choice) => (
                      <button
                        key={choice.choiceId}
                        onClick={() => d.selectOption(group.id, choice.choiceId)}
                        disabled={!choice.inStock}
                        className={`flex items-center gap-2.5 rounded-full border px-4 py-2.5 font-body text-xs transition-all disabled:opacity-40 ${
                          choice.selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-secondary/70 text-foreground hover:border-primary"
                        }`}
                      >
                        {choice.isColorSwatch && choice.colorCode && (
                          <span
                            className={`h-5 w-5 rounded-full border ${choice.selected ? "border-primary" : "border-secondary/60"}`}
                            style={{ backgroundColor: choice.colorCode }}
                          />
                        )}
                        {choice.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {modifierGroups.map((m) => (
                <div key={m.key} className="mt-8">
                  <h3 className="mb-3 font-display text-sm font-bold text-foreground">
                    {m.name}{m.mandatory && <span className="text-primary"> *</span>}
                  </h3>
                  {m.type === "choices" ? (
                    <div className="flex flex-wrap gap-3">
                      {m.choices && m.choices.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => d.setModifier(m.key, c.key)}
                          className={`rounded-full border px-4 py-2.5 font-body text-xs transition-colors ${
                            c.selected ? "border-primary bg-primary/10 text-primary" : "border-secondary/70 text-foreground hover:border-primary"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={m.value ?? ""}
                      onChange={(e) => d.setModifier(m.key, e.target.value)}
                      className="w-full rounded-xl border border-secondary bg-card px-4 py-3 font-body text-sm text-foreground outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}

              {d.options.length > 0 && !d.variant && (
                <p className="mt-6 font-body text-xs text-primary">برای ادامه، گزینه‌ها را انتخاب کنید.</p>
              )}

              <button
                type="button"
                onClick={handleContact}
                className="btn-gold mt-8 w-full justify-center"
                style={{ minHeight: 48 }}
              >
                <Phone className="h-4 w-4" />
                تماس بگیرید
              </button>

              {d.inStock && d.variant && (
                <p className="mt-5 flex items-center gap-2 font-body text-xs text-muted-foreground">
                  <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  موجود و آماده ارسال
                </p>
              )}

              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-secondary/60 pt-6">
                <Trust icon={<Truck className="h-5 w-5" />} title="ارسال سریع" />
                <Trust icon={<ShieldCheck className="h-5 w-5" />} title="ضمانت اصالت" />
                <Trust icon={<Headphones className="h-5 w-5" />} title="پشتیبانی" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-secondary/60 bg-card p-6 lg:p-8">
              <h2 className="font-display text-lg font-black text-foreground mb-4">معرفی محصول</h2>
              <div className="gold-rule my-5 w-16" />
              {d.product.plainDescription ? (
                <div
                  className="font-body text-sm leading-8 text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: d.product.plainDescription }}
                />
              ) : (
                <p className="font-body text-sm text-muted-foreground">معرفی این محصول به‌زودی تکمیل می‌شود.</p>
              )}
            </div>
          </div>
          <div className="lg:col-span-4">
            <ProductSpecs rows={specRows} />
          </div>
        </div>
      </div>

      {/* Related Projects Section */}
      <RelatedProjects
        productId={d.product?.id ?? ""}
        productCategorySlug={d.product?.categoryId ? undefined : undefined}
        limit={6}
      />

      {/* Similar Products Section */}
      <section className="border-t border-secondary/60 bg-background pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">
              محصولات مشابه
            </h2>
          </div>

          {similarLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-secondary/50 bg-card/40 p-5">
                  <div className="aspect-[4/5] rounded-xl bg-secondary/30 mb-3" />
                  <div className="h-4 w-3/4 rounded bg-secondary/30 mb-1.5" />
                  <div className="h-3 w-1/2 rounded bg-secondary/30" />
                </div>
              ))}
            </div>
          ) : similarError ? (
            <p className="font-body text-sm text-destructive text-center py-8">
              {similarError}
              <button
                onClick={() => {
                  setSimilarError(null);
                  setSimilarLoading(true);
                  searchProducts({ categoryId: d.product?.categoryId || "", limit: 6 })
                    .then((res) => {
                      const products = (res?.products || [])
                        .filter((p) => p.id !== d.product!.id && p.visible !== false)
                        .map((p) => ({
                          id: p.id,
                          slug: p.slug,
                          name: p.name,
                          image: (p as { media?: { main?: { image?: { url: string } } } }).media?.main?.image?.url || p.image,
                        }));
                      setSimilarProducts(products);
                    })
                    .finally(() => setSimilarLoading(false));
                }}
                className="mt-2 text-xs text-primary underline hover:text-primary"
              >
                تلاش دوباره
              </button>
            </p>
          ) : similarProducts.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-8">
              محصول مشابهی در این دسته ثبت نشده است.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similarProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p as { id: string; slug: string; name: string; image?: string; [key: string]: unknown }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Trust({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 text-primary">{icon}</span>
      <span className="font-display text-[11px] font-bold text-foreground">{title}</span>
    </div>
  );
}
