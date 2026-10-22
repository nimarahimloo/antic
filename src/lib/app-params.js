/**
 * App params without @base44/sdk.
 * Env vars are optional; local mock does not need a real app id.
 */
const isNode = typeof window === "undefined";

const isClearAccessTokenRequested = () =>
  !isNode && new URLSearchParams(window.location.search).get("clear_access_token") === "true";

const clearStoredAccessToken = () => {
  window.localStorage.removeItem("base44_access_token");
  window.localStorage.removeItem("token");
};

const getAppParams = () => {
  if (isClearAccessTokenRequested()) {
    clearStoredAccessToken();
  }
  return {
    appId: import.meta.env.VITE_APP_ID || "antic-local",
    token: null,
    functionsVersion: import.meta.env.VITE_FUNCTIONS_VERSION || "local",
    appBaseUrl: import.meta.env.VITE_APP_BASE_URL || (typeof window !== "undefined" ? window.location.origin : ""),
  };
};

export const appParams = {
  ...getAppParams(),
};
