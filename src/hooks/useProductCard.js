import { useMemo } from "react";
import { productImage, productGallery } from "@/lib/storeImage";

function discountPercent(product) {
  const now = Number(product?.actualPriceRange?.minValue?.amount);
  const was = Number(product?.compareAtPriceRange?.minValue?.amount);
  if (!now || !was || was <= now) return null;
  return Math.round(((was - now) / was) * 100);
}

export function useProductCard(product) {
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
    const priceMin = product?.actualPriceRange?.minValue?.formattedAmount;
    const priceMax = product?.actualPriceRange?.maxValue?.formattedAmount;
    const compareAt = product?.compareAtPriceRange?.minValue?.formattedAmount;
    const priceDisplay = !hasPrice
      ? null
      : priceMax && priceMax !== priceMin
        ? `${priceMin} – ${priceMax}`
        : priceMin;
    const compareAtDisplay = hasPrice && compareAt && compareAt !== priceMin ? compareAt : null;
    const contactForPrice = !hasPrice;

    const labels = [],
      colors = [];
    for (const o of product?.options || []) {
      const choices = (o.choicesSettings?.choices || []).filter((c) => c.visible !== false);
      if (!choices.length) continue;
      const swatches = choices.map((c) => c.colorCode).filter(Boolean);
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
    const hoverImage = productGallery(product)[1]?.url ?? null;

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
