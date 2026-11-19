"use client";

import { useMemo } from "react";
import { productImage, productGallery } from "@/lib/storeImage";

interface Product {
  id?: string;
  name?: string;
  image?: string;
  media?: {
    main?: { image?: { url: string } };
    itemsInfo?: { items?: Array<{ altText?: string; image?: { url: string } }> };
  };
  inventory?: { availabilityStatus?: string; preorderStatus?: string };
  actualPriceRange?: {
    minValue?: { amount?: number; formattedAmount: string };
    maxValue?: { amount?: number; formattedAmount: string };
  };
  compareAtPriceRange?: { minValue?: { amount?: number; formattedAmount: string } };
  ribbon?: { name?: string };
  options?: Array<{
    name: string;
    choicesSettings?: { choices?: Array<{ colorCode?: string; visible?: boolean }> };
  }>;
  modifiers?: Array<{
    mandatory?: boolean;
  }>;
}

function discountPercent(product: Product): number | null {
  const now = Number(product?.actualPriceRange?.minValue?.amount);
  const was = Number(product?.compareAtPriceRange?.minValue?.amount);
  if (!now || !was || was <= now) return null;
  return Math.round(((was - now) / was) * 100);
}

interface UseProductCardReturn {
  isSoldOut: boolean;
  isPreorder: boolean;
  isPartiallyOutOfStock: boolean;
  leftBadges: Array<{ type: string; label: string }>;
  promoBadge: { type: string; label: string } | null;
  priceDisplay: string | null;
  compareAtDisplay: string | null;
  contactForPrice: boolean;
  colors: string[];
  optionLabel: string;
  isQuickAddable: boolean;
  image: string | null;
  hoverImage: string | null;
}

export function useProductCard(product: Product): UseProductCardReturn {
  return useMemo(() => {
    const status = product?.inventory?.availabilityStatus;
    const isSoldOut = status === "OUT_OF_STOCK";
    const isPreorder = isSoldOut && product?.inventory?.preorderStatus === "ENABLED";
    const isPartiallyOutOfStock = status === "PARTIALLY_OUT_OF_STOCK";

    const leftBadges = [];
    if (isPreorder) leftBadges.push({ type: "pre-order", label: "Pre-order" });
    else if (isSoldOut) leftBadges.push({ type: "sold-out", label: "Sold out" });
    if (isPartiallyOutOfStock) leftBadges.push({ type: "limited-stock", label: "Limited stock" });

    const discount = discountPercent(product);
    const ribbon = product?.ribbon?.name;
    const promoBadge = discount
      ? { type: "discount", label: `-${discount}%` }
      : ribbon
        ? { type: "ribbon", label: ribbon }
        : null;

    const amountMin = Number(product?.actualPriceRange?.minValue?.amount);
    const hasPrice = Number.isFinite(amountMin) && amountMin > 0;
    const priceMin = product?.actualPriceRange?.minValue?.formattedAmount || null;
    const priceMax = product?.actualPriceRange?.maxValue?.formattedAmount || null;
    const compareAt = product?.compareAtPriceRange?.minValue?.formattedAmount || null;
    const priceDisplay = !hasPrice
      ? null
      : priceMax && priceMax !== priceMin
        ? `${priceMin} – ${priceMax}`
        : priceMin;
    const compareAtDisplay = hasPrice && compareAt && compareAt !== priceMin ? compareAt : null;
    const contactForPrice = !hasPrice;

    const labels: string[] = [];
    const colors: string[] = [];
    for (const o of product?.options || []) {
      const choices = (o.choicesSettings?.choices || []).filter((c) => c.visible !== false);
      if (!choices.length) continue;
      const swatches = choices
        .map((c) => c.colorCode)
        .filter((c): c is string => typeof c === "string" && c.length > 0);
      if (swatches.length) {
        colors.push(...swatches);
        continue;
      }
      const n = o.name.toLowerCase();
      labels.push(`${choices.length} ${choices.length === 1 || n.endsWith("s") ? n : `${n}s`}`);
    }
    const optionLabel = labels.join(" · ");
    const hasOptions = (product?.options?.length || 0) > 0;
    const isQuickAddable = !hasOptions && !isSoldOut && hasPrice;

    const image = productImage(product);
    const hoverImage = productGallery(product)[1]?.url || null;

    return {
      isSoldOut,
      isPreorder,
      isPartiallyOutOfStock,
      leftBadges,
      promoBadge,
      priceDisplay,
      compareAtDisplay,
      contactForPrice,
      colors,
      optionLabel,
      isQuickAddable,
      image,
      hoverImage,
    };
  }, [product]);
}