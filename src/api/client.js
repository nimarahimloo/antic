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
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "HTTP " + res.status);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && data.items && Array.isArray(data.items)) return data.items;
  return [];
}

function makeEntity(name) {
  return {
    async list(sortBy, limit) {
      if (typeof sortBy === "object" && sortBy !== null) {
        const opts = sortBy;
        sortBy = opts.sort || opts.sortBy || opts.sort_by;
        limit = opts.limit || 500;
      }
      if (limit === undefined) limit = 500;
      const q = new URLSearchParams({
        ...(sortBy ? { sort_by: String(sortBy) } : {}),
        limit: String(limit),
      });
      return normalizeList(await request(`/entities/${name}?${q}`));
    },
    async filter(filter, sortBy, limit) {
      if (typeof sortBy === "object" && sortBy !== null && !Array.isArray(sortBy)) {
        const opts = sortBy;
        sortBy = opts.sort || opts.sortBy;
        limit = opts.limit || 500;
      }
      if (limit === undefined) limit = 500;
      const q = new URLSearchParams({
        filter: JSON.stringify(filter || {}),
        ...(sortBy ? { sort_by: String(sortBy) } : {}),
        limit: String(limit),
      });
      return normalizeList(await request(`/entities/${name}?${q}`));
    },
    async get(id) {
      return request(`/entities/${name}/${id}`);
    },
    async create(data) {
      return request(`/entities/${name}`, { method: "POST", body: data });
    },
    async update(id, data) {
      return request(`/entities/${name}/${id}`, { method: "PUT", body: data });
    },
    async delete(id) {
      return request(`/entities/${name}/${id}`, { method: "DELETE" });
    },
  };
}

const ENTITY_NAMES = [
  "CurtainModel",
  "CurtainCategory",
  "PortfolioCategory",
  "Project",
  "ConsultationRequest",
  "RenderTemplate",
  "InstallReference",
  "SavedDesign",
  "VirtualWindowSetting",
  "User",
  "ShopCategory",
  "Product",
  "Order",
];

export const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, makeEntity(n)]));

export const api = {
  entities,
  auth: {
    async login(email, password) {
      const data = await request("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      if (data?.access_token) setToken(data.access_token);
      return data;
    },
    async me() {
      return request("/auth/me");
    },
    logout() {
      clearToken();
    },
  },
};

export default api;
