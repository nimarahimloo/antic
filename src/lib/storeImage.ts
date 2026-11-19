/** Resolve product / cart image URLs (local or absolute). */

/** Accepts a URL string or any object that may carry an image reference. */
export function storeImage(value: unknown): string | null {
  let url: string | undefined;
  if (typeof value === "string") {
    url = value;
  } else if (value && typeof value === "object") {
    const v = value as { image?: unknown; url?: unknown };
    if (typeof v.image === "string") {
      url = v.image;
    } else if (v.image && typeof v.image === "object") {
      const nested = (v.image as { url?: unknown }).url;
      if (typeof nested === "string") url = nested;
    }
    if (!url && typeof v.url === "string") url = v.url;
  }
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

/** Normalises a media reference that may be a path, an absolute URL, or a media id. */
export function mediaUrlFromId(mediaId: string | undefined | null): string | null {
  if (!mediaId || typeof mediaId !== "string") return null;
  if (mediaId.startsWith("http") || mediaId.startsWith("//") || mediaId.startsWith("/")) {
    return storeImage(mediaId);
  }
  // opaque media ids are not used in the local catalog
  return null;
}

/** Identity helper kept for callers that need a stable media key. */
export function mediaKey(url: string | undefined | null): string | null {
  return typeof url === "string" ? url : null;
}

export function choiceImage(choice: { media?: { items?: Array<{ mediaId?: string }> }; image?: string } | undefined | null): string | null {
  const mediaId = choice?.media?.items?.[0]?.mediaId;
  if (mediaId) return mediaUrlFromId(mediaId);
  return storeImage(choice?.media?.items?.[0]) || storeImage(choice?.image);
}

export function variantImage(variant: { media?: { image?: { url: string }; thumbnail?: { url: string } } } | undefined | null): string | null {
  const m = variant?.media;
  if (!m) return null;
  return storeImage(m.image?.url) || storeImage(m) || storeImage(m.thumbnail?.url);
}

export function productImage(product: { media?: { main?: { image?: { url: string } } }; image?: string } | undefined | null): string | null {
  return storeImage(product?.media?.main?.image?.url) || storeImage(product?.image);
}

export function productGallery(product: { media?: { main?: { image?: { url: string } }; itemsInfo?: { items?: Array<{ altText?: string }> } }; name?: string } | undefined | null): Array<{ url: string; altText: string }> {
  const items = product?.media?.itemsInfo?.items || [];
  const urls = [productImage(product), ...items.map((i) => storeImage(i))];
  const seen = new Set<string>();
  return urls
    .map((url, i) => ({ url: url || "", altText: items[i - 1]?.altText || product?.name || "" }))
    .filter(({ url }) => url && !seen.has(url) && seen.add(url));
}