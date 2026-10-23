/** Local/public image helpers — no external CDN dependency. */

export const DEFAULT_TRANSFORM_WIDTH = 1024
export const IMAGE_LOAD_MODE = {
  OPTIMIZED: "optimized",
  ORIGINAL: "original",
  FALLBACK: "fallback",
}

/** No remote transform CDN; always treat as plain URL. */
export function parseMediaUrl(_src) {
  return null
}

export function buildTransformUrl() {
  return ""
}

export function buildSrcSet() {
  return ""
}

export function getOriginalImageUrl(src) {
  return src
}

export function nextImageLoadMode(mode) {
  return mode === IMAGE_LOAD_MODE.OPTIMIZED
    ? IMAGE_LOAD_MODE.ORIGINAL
    : IMAGE_LOAD_MODE.FALLBACK
}
