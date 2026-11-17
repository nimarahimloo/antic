import { Link } from "react-router-dom";
import { useProductCard } from "@/hooks/useProductCard";
import { useCart } from "@/context/CartContext";
import { storeImage } from "@/lib/storeImage";
import { ShoppingBag, Phone } from "lucide-react";
import { SITE_PHONE_HREF } from "@/lib/siteContact";

export default function ProductCard({ product }) {
  const { addToCart, loading } = useCart();
  const {
    isSoldOut,
    priceDisplay,
    compareAtDisplay,
    contactForPrice,
    colors,
    optionLabel,
    isQuickAddable,
    image,
    hoverImage,
  } = useProductCard(product);

  const hasOptions = product.modifiers?.some((m) => m.mandatory) || !isQuickAddable;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isQuickAddable && !hasOptions) addToCart(product.id);
  };

  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <article className="light-leak overflow-hidden rounded-2xl border border-secondary/60 bg-card transition-all duration-500 hover:border-primary/50">
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary/40">
          {image ? (
            <img
              src={storeImage(image)}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-body text-xs text-muted-foreground">بدون تصویر</div>
          )}
          {hoverImage && (
            <img
              src={storeImage(hoverImage)}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}
          {isSoldOut && (
            <span className="absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 font-display text-[10px] font-bold text-muted-foreground">
              ناموجود
            </span>
          )}
          {compareAtDisplay && !isSoldOut && (
            <span className="absolute right-3 top-3 rounded-full bg-royal-green px-3 py-1 font-display text-[10px] font-bold text-royal-green-foreground">
              تخفیف
            </span>
          )}
        </div>

        <div className="p-5">
          <h3 className="line-clamp-2 font-display text-base font-bold leading-7 text-foreground">{product.name}</h3>
          {optionLabel && (
            <p className="mt-1 font-body text-[11px] text-muted-foreground">{optionLabel}</p>
          )}

          {colors?.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              {colors.slice(0, 5).map((c, i) => (
                <span
                  key={i}
                  className="h-4 w-4 rounded-full border border-secondary/60"
                  style={{ backgroundColor: c }}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              {priceDisplay ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-bold text-primary">{priceDisplay}</span>
                  {compareAtDisplay && (
                    <span className="font-body text-xs text-muted-foreground line-through">{compareAtDisplay}</span>
                  )}
                </div>
              ) : (
                <span className="font-body text-xs text-muted-foreground">قیمت با ابعاد</span>
              )}
            </div>
            {contactForPrice ? (
              <a
                href={SITE_PHONE_HREF}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-display text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                <Phone className="h-3.5 w-3.5" />
                تماس بگیرید
              </a>
            ) : (
              <button
                onClick={handleAdd}
                disabled={loading || isSoldOut || !isQuickAddable || hasOptions}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="افزودن به سبد"
              >
                <ShoppingBag className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
