/**
 * Local app params — optional runtime configuration for the MCP/OAuth flow.
 *
 * The project is fully self-hosted: there is no Base44/Wix app id. These
 * values are purely local defaults and can be overridden with
 * `NEXT_PUBLIC_*` env vars when a specific deployment needs them.
 */

const isNode = typeof window === "undefined";

const isClearAccessTokenRequested = () =>
  !isNode && new URLSearchParams(window.location.search).get("clear_access_token") === "true";

const clearStoredAccessToken = () => {
  window.localStorage.removeItem("antic_access_token");
  window.localStorage.removeItem("token");
};

export interface AppParams {
  appId: string;
  token: string | null;
  functionsVersion: string;
  appBaseUrl: string;
}

function getAppParams(): AppParams {
  if (isClearAccessTokenRequested()) {
    clearStoredAccessToken();
  }
  return {
    appId: process.env.NEXT_PUBLIC_APP_ID || "antic-local",
    token: null,
    functionsVersion: process.env.NEXT_PUBLIC_FUNCTIONS_VERSION || "local",
    appBaseUrl:
      process.env.NEXT_PUBLIC_APP_BASE_URL ||
      (typeof window !== "undefined" ? window.location.origin : ""),
  };
}

export const appParams: AppParams = getAppParams();
