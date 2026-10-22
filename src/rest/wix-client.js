/**
 * Wix client removed — project is fully self-hosted.
 * Kept as a no-op module so any leftover import does not break the build.
 */
export const WIX_CLIENT_ID = "";
export const WIX_API_BASE = "";

export async function wixApiRequest() {
  throw new Error("Wix integration removed. Use /api/catalog instead.");
}

export function setSessionTokens() {}
export function clearSession() {}
export function isMember() {
  return false;
}
