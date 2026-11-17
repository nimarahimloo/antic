/** Resolve product / cart image URLs (local or absolute). */

export function storeImage(value) {
  const url = typeof value === "string" ? value : value?.image?.url || value?.url;
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

export function wixMediaUrl(mediaId) {
  if (!mediaId || typeof mediaId !== "string") return null;
  if (mediaId.startsWith("http") || mediaId.startsWith("//") || mediaId.startsWith("/")) {
    return storeImage(mediaId);
  }
  // legacy Wix media ids are no longer used
  return null;
}

export function wixMediaId(url) {
  return typeof url === "string" ? url : null;
}

export function choiceImage(choice) {
  const mediaId = choice?.media?.items?.[0]?.mediaId;
  if (mediaId) return wixMediaUrl(mediaId);
  return storeImage(choice?.media?.items?.[0]) || storeImage(choice?.image);
}

export function variantImage(variant) {
  const m = variant?.media;
  if (!m) return null;
  return storeImage(m.image?.url) || storeImage(m) || storeImage(m.thumbnail?.url);
}

export function productImage(product) {
  return storeImage(product?.media?.main?.image?.url) || storeImage(product?.image);
}

export function productGallery(product) {
  const items = product?.media?.itemsInfo?.items || [];
  const urls = [productImage(product), ...items.map((i) => storeImage(i))];
  const seen = new Set();
  return urls
    .map((url, i) => ({ url, altText: items[i - 1]?.altText || product?.name || "" }))
    .filter(({ url }) => url && !seen.has(url) && seen.add(url));
}
