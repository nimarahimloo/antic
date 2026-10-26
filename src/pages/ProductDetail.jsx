import { SITE_PHONE_HREF } from "@/lib/siteContact";
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useProductDetail } from "@/hooks/useProductDetail";
import { useVariantOptions } from "@/hooks/useVariantOptions";
import { useCart } from "@/context/CartContext";
import { productGallery, storeImage } from "@/lib/storeImage";
import ProductGallery from "@/components/product/ProductGallery";
import ProductSpecs from "@/components/product/ProductSpecs";
import { ArrowRight, ShoppingBag, Minus, Plus, Check, Truck, ShieldCheck, Headphones, Store, BadgeCheck, Phone } from "lucide-react";

export default function ProductDetail() {
  const { slug } = useParams();
  const d = useProductDetail(slug);
  const { checkout, loading: cartLoading } = useCart();
  const { optionGroups, modifierGroups } = useVariantOptions(
    d.options, d.modifiers, d.selectedOptions, d.modifierValues
  );

  const images = useMemo(
    () => (d.product ? productGallery(d.product).map((img) => ({ url: storeImage(img.url), altText: img.altText })) : []),
    [d.product]
  );
  const focusUrl = d.focusMediaUrl ? storeImage(d.focusMediaUrl) : null;
  const contactOnly = !d.price;

  async function buyNow() {
    if (contactOnly || !d.product || !d.canAdd || d.adding || cartLoading) return;
    const result = await d.submit();
    if (result === null) return;
    await checkout();
  }

  if (d.error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <p className="font-body text-sm text-muted-foreground">{d.error}</p>
        <button onClick={d.retry} className="btn-ghost-gold mt-5">تلاش دوباره</button>
      </div>
    );
  }
  if (d.notFound) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-black text-foreground">محصول پیدا نشد</h1>
        <Link to="/shop" className="btn-gold mt-6">بازگشت به فروشگاه</Link>
      </div>
    );
  }
  if (!d.product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const specRows = [
    { key: "برند", value: "پرده آنتیک" },
    { key: "نام محصول", value: d.product.name },
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
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex items-center gap-2 font-body text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-primary">خانه</Link>
          <ArrowRight className="h-3 w-3" />
          <Link to="/shop" className="transition-colors hover:text-primary">فروشگاه</Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{d.product.name}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
          <div className="lg:col-span-2 lg:sticky lg:top-28 lg:self-start">
            <ProductGallery images={images} focusUrl={focusUrl} productName={d.product.name} />
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <span className="font-display text-xs font-bold text-primary">فروشگاه رسمی پرده آنتیک</span>
                <BadgeCheck className="h-4 w-4 text-primary" />
              </div>
              <h1 className="mt-3 font-display text-2xl font-black leading-snug text-foreground lg:text-3xl">
                {d.product.name}
              </h1>

              <div className="mt-6 rounded-2xl border border-secondary/60 bg-background p-5">
                <span className="font-body text-xs text-muted-foreground">قیمت</span>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                  {d.price ? (
                    <span className="font-display text-2xl font-black text-primary">{d.price}</span>
                  ) : (
                    <a href={SITE_PHONE_HREF} className="btn-gold mt-1 inline-flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      تماس بگیرید
                    </a>
                  )}
                  {d.compareAtPrice && d.compareAtPrice !== d.price && (
                    <span className="font-body text-sm text-muted-foreground line-through">{d.compareAtPrice}</span>
                  )}
                </div>
              </div>

              {d.product.plainDescription && (
                <div
                  className="mt-6 font-body text-sm leading-8 text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: d.product.plainDescription }}
                />
              )}

              {optionGroups.map((group) => (
                <div key={group.id} className="mt-7">
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
                <div key={m.key} className="mt-7">
                  <h3 className="mb-3 font-display text-sm font-bold text-foreground">
                    {m.name}{m.mandatory && <span className="text-primary"> *</span>}
                  </h3>
                  {m.type === "choices" ? (
                    <div className="flex flex-wrap gap-3">
                      {m.choices.map((c) => (
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
                <p className="mt-5 font-body text-xs text-primary">برای ادامه، گزینه‌ها را انتخاب کنید.</p>
              )}

              {contactOnly ? (
                <a href={SITE_PHONE_HREF} className="btn-gold mt-8 w-full justify-center" style={{ minHeight: 48 }}>
                  <Phone className="h-4 w-4" />
                  تماس بگیرید
                </a>
              ) : (
                <>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="flex items-center rounded-full border border-secondary/70 bg-background">
                      <button onClick={() => d.setQuantity(Math.max(1, (Number(d.quantity) || 1) - 1))} className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-primary" aria-label="کاهش">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-display text-sm font-bold text-foreground">{d.quantity || 1}</span>
                      <button onClick={() => d.setQuantity((Number(d.quantity) || 1) + 1)} className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-primary" aria-label="افزایش">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={d.submit}
                      disabled={!d.canAdd || d.adding}
                      className="btn-ghost-gold flex-1 justify-center disabled:opacity-50"
                      style={{ minHeight: 48 }}
                    >
                      <ShoppingBag className="h-4 w-4" /> افزودن به سبد
                    </button>
                  </div>

                  <button
                    onClick={buyNow}
                    disabled={!d.canAdd || d.adding || cartLoading}
                    className="btn-gold mt-3 w-full justify-center disabled:opacity-50"
                    style={{ minHeight: 48 }}
                  >
                    خرید آنی
                  </button>
                </>
              )}

              {d.inStock && d.variant && !contactOnly && (
                <p className="mt-4 flex items-center gap-2 font-body text-xs text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" /> موجود و آماده ارسال
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

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:col-span-2 lg:p-8">
            <h2 className="font-display text-lg font-black text-foreground">معرفی محصول</h2>
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
          <div className="lg:col-span-1">
            <ProductSpecs rows={specRows} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Trust({ icon, title }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 text-primary">{icon}</span>
      <span className="font-display text-[11px] font-bold text-foreground">{title}</span>
    </div>
  );
}
