"use client";

import Link from "next/link";
import { useProductCard } from "@/hooks/useProductCard";
import { storeImage } from "@/lib/storeImage";
import { Phone } from "lucide-react";
import { SITE_PHONE_HREF } from "@/lib/siteContact";

interface Product {
  id: string;
  slug: string;
  name: string;
  inventory?: { availabilityStatus?: string; preorderStatus?: string };
  actualPriceRange?: { minValue?: { amount: number; formattedAmount: string }; maxValue?: { formattedAmount: string } };
  compareAtPriceRange?: { minValue?: { formattedAmount: string } };
  ribbon?: { name?: string };
  options?: Array<{
    name: string;
    choicesSettings?: { choices?: Array<{ colorCode?: string; visible?: boolean }> };
  }>;
  modifiers?: Array<{
    mandatory?: boolean;
  }>;
  image?: string;
  [key: string]: unknown;
}

export default function ProductCard({ product }: { product: Product }) {
  const {
    isSoldOut,
    colors,
    optionLabel,
    isQuickAddable,
    image,
    hoverImage,
  } = useProductCard(product);

  const hasOptions = product.modifiers?.some((m: { mandatory?: boolean }) => m.mandatory) || !isQuickAddable;

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = SITE_PHONE_HREF;
  };

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <article className="light-leak overflow-hidden rounded-2xl border border-secondary/60 bg-card transition-all duration-500 hover:border-primary/50">
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary/40">
          {image ? (
            <img
              src={storeImage(image) ?? undefined}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-body text-xs text-muted-foreground">بدون تصویر</div>
          )}
          {hoverImage && (
            <img
              src={storeImage(hoverImage) ?? undefined}
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
              {isSoldOut ? (
                <span className="font-body text-xs text-muted-foreground">ناموجود</span>
              ) : (
                <span className="font-body text-xs text-muted-foreground">برای اطلاع از قیمت تماس بگیرید</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleContact}
              disabled={isSoldOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-display text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Phone className="h-3.5 w-3.5" />
              تماس بگیرید
            </button>
          </div>
        </div>
      </article>
    </Link>
  );
}