import { TOKEN_KEY } from "./constants";

/**
 * Browser-only access to the current application JWT stored in localStorage.
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Browser-only access to the current application JWT for non-JSON transports. */
export function getAccessToken(): string | null {
  return getToken();
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  setToken(null);
}
