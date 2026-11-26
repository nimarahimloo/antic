"use client";

/**
 * DEPRECATED: This hook is no longer used.
 * Install images are now included directly in CurtainModel data from the API.
 * CurtainPreview reads fabric.install_image directly from props.
 *
 * Kept for reference only - do not import or use.
 */
export function useInstallImage(_fabric: unknown) {
  return { url: "", loading: false };
}