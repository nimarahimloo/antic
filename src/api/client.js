/**
 * HTTP client for the Antic backend (/api, proxied by Vite in dev).
 */

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const TOKEN_KEY = "antic_access_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  setToken(null);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { Accept: "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      (typeof data === "string" ? data : null) ||
      res.statusText ||
      "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function entitiesApi(entity) {
  return {
    async list(sort, limit) {
      const q = new URLSearchParams();
      if (sort) q.set("sort", sort);
      if (limit) q.set("limit", String(limit));
      const qs = q.toString();
      return request("/entities/" + entity + (qs ? "?" + qs : ""));
    },
    async filter(filter, sort, limit) {
      return request("/entities/" + entity + "/filter", {
        method: "POST",
        body: { filter: filter || {}, sort, limit },
      });
    },
    async get(id) {
      return request("/entities/" + entity + "/" + id);
    },
    async create(data) {
      return request("/entities/" + entity, { method: "POST", body: data });
    },
    async update(id, data) {
      return request("/entities/" + entity + "/" + id, { method: "PUT", body: data });
    },
    async delete(id) {
      return request("/entities/" + entity + "/" + id, { method: "DELETE" });
    },
  };
}

const ENTITY_NAMES = [
  "User",
  "CurtainModel",
  "CurtainCategory",
  "PortfolioCategory",
  "Project",
  "ConsultationRequest",
  "RenderTemplate",
  "InstallReference",
  "SavedDesign",
  "VirtualWindowSetting",
  "Product",
  "ShopCategory",
  "Order",
];

const entities = {};
for (const name of ENTITY_NAMES) entities[name] = entitiesApi(name);

export const api = {
  entities,
  agents: {
    async createConversation(agent_name, metadata) {
      return request("/agents/conversations", {
        method: "POST",
        body: { agent_name, metadata },
        auth: true,
      });
    },
    async getConversation(id) {
      return request("/agents/conversations/" + id, { auth: true });
    },
    async sendMessage(id, payload) {
      return request("/agents/conversations/" + id + "/messages", {
        method: "POST",
        body: payload,
        auth: true,
      });
    },
  },
  auth: {
    async me() {
      return request("/auth/me");
    },
    async login(identifier, password) {
      const body = { password: password };
      if (identifier && String(identifier).includes("@")) body.email = identifier;
      else if (identifier) body.phone = identifier;
      body.identifier = identifier;
      const res = await request("/auth/login", {
        method: "POST",
        body: body,
        auth: false,
      });
      if (res.token) setToken(res.token);
      return res;
    },
    async loginViaEmailPassword(email, password) {
      return this.login(email, password);
    },
    loginWithProvider(provider, returnTo) {
      if (typeof window === "undefined") return;
      if (provider === "google") {
        const base = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
        const q = returnTo ? "?returnTo=" + encodeURIComponent(returnTo) : "";
        window.location.href = base + "/auth/google" + q;
        return;
      }
      window.location.href =
        "/login" + (returnTo ? "?returnTo=" + encodeURIComponent(returnTo) : "");
    },
    async register(emailOrOpts, password, full_name) {
      var body;
      if (typeof emailOrOpts === "object" && emailOrOpts !== null) {
        body = {
          email: emailOrOpts.email || undefined,
          phone: emailOrOpts.phone || undefined,
          password: emailOrOpts.password,
          full_name: emailOrOpts.full_name || emailOrOpts.fullName,
        };
      } else {
        body = { email: emailOrOpts, password: password, full_name: full_name };
      }
      const res = await request("/auth/register", {
        method: "POST",
        body: body,
        auth: false,
      });
      if (res.token) setToken(res.token);
      return res;
    },
    async verifyOtp() {
      return { access_token: getToken() };
    },
    async resendOtp() {
      return { ok: true };
    },
    setToken: setToken,
    logout(redirectUrl) {
      clearToken();
      request("/auth/logout", { method: "POST" }).catch(function () {});
      if (typeof window !== "undefined" && redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin(returnUrl) {
      if (typeof window === "undefined") return;
      const q = returnUrl ? "?returnTo=" + encodeURIComponent(returnUrl) : "";
      window.location.href = "/login" + q;
    },
  },
  app: {
    async getPublicSettings() {
      return request("/app/public-settings", { auth: false });
    },
  },
};

export const base44 = api;
export default api;
