/**
 * Legacy stub — Wix integration was removed. Use /api/catalog and /api/orders.
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
