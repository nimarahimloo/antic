/** Local/public image helpers — no external CDN dependency. */

export const DEFAULT_TRANSFORM_WIDTH = 1024;

export const IMAGE_LOAD_MODE = {
  OPTIMIZED: "optimized",
  ORIGINAL: "original",
  FALLBACK: "fallback",
} as const;

export type LoadMode = (typeof IMAGE_LOAD_MODE)[keyof typeof IMAGE_LOAD_MODE];

/**
 * No remote transform CDN in this project — every image URL is used as-is.
 * Kept as a hook point so a local transform service can be plugged in later.
 */
export function parseMediaUrl(_src: string): null {
  return null;
}

export function buildTransformUrl(): string {
  return "";
}

export function buildSrcSet(): string {
  return "";
}

export function getOriginalImageUrl(src: string): string {
  return src;
}

export function nextImageLoadMode(mode: LoadMode): LoadMode {
  return mode === IMAGE_LOAD_MODE.OPTIMIZED
    ? IMAGE_LOAD_MODE.ORIGINAL
    : IMAGE_LOAD_MODE.FALLBACK;
}
