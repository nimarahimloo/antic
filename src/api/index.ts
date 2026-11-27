/**
 * Main API barrel export.
 * Backward-compatible: `import { api } from "@/api"` works the same as
 * `import { api } from "@/api/client"` used to.
 */

// Core
export { request } from "./core";
export { deduplicateRequest, dedupeKey } from "./dedupe";
export { navigateTo } from "./navigation";

// Token
export { getToken, setToken, clearToken, getAccessToken } from "./token";

// Types (type-only re-exports required by isolatedModules)
export type {
  RequestOptions,
  PaginatedResponse,
  EntityFilterOptions,
} from "./types";
export { isApiError, ApiError } from "./types";

// Entities
import { createEntityApi, entities } from "./entities";
export { createEntityApi, entities };

// Media
import { mediaApi } from "./media";
export { mediaApi };
export type { Media, MediaListResponse } from "./media";

// Auth
import { authApi } from "./auth";
export { authApi };

// Account
import { accountApi } from "./account";
export { accountApi };

// App
import { appApi } from "./app";
export { appApi };

// Functions
import { functionsApi } from "./functions";
export { functionsApi };

// Render
import { renderApi } from "./render";
export { renderApi };

// Agents
import { agentsApi } from "./agents";
export { agentsApi };

// AI
import { aiApi } from "./ai";
export { aiApi };

// Integrations
import { integrationsApi } from "./integrations";
export { integrationsApi };

// AUTH_EVENT for backward compatibility
export { AUTH_EVENT } from "./constants";

// Default export for backward compatibility
export const api = {
  entities,
  agents: agentsApi,
  auth: authApi,
  app: appApi,
  account: accountApi,
  functions: functionsApi,
  render: renderApi,
  ai: aiApi,
  integrations: integrationsApi,
  media: mediaApi,
};
