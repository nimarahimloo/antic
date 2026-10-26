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

function createEntityApi(name) {
  return {
    async list(sortBy, limit) {
      if (sortBy === undefined) sortBy = "-created_date";
      if (limit === undefined) limit = 500;
      if (sortBy && typeof sortBy === "object") {
        const opts = sortBy;
        sortBy = opts.sort || opts.sort_by || "-created_date";
        limit = opts.limit || 500;
      }
      const q = new URLSearchParams({
        sort_by: String(sortBy),
        limit: String(limit),
      });
      return normalizeList(await request("/entities/" + name + "?" + q));
    },

    async filter(filter, sortBy, limit) {
      if (filter === undefined) filter = {};
      if (sortBy === undefined) sortBy = "-created_date";
      if (limit === undefined) limit = 500;
      let search = "";
      if (sortBy && typeof sortBy === "object") {
        const opts = sortBy;
        search = opts.search || opts.q || "";
        sortBy = opts.sort || opts.sort_by || "-created_date";
        limit = opts.limit || 500;
      }
      const clean = {};
      for (const [k, v] of Object.entries(filter || {})) {
        if (k.startsWith("$")) continue;
        if (v !== null && typeof v === "object") continue;
        if (v === undefined || v === "") continue;
        clean[k] = v;
      }
      const q = new URLSearchParams({
        sort_by: String(sortBy),
        limit: String(limit),
        filter: JSON.stringify(clean),
      });
      if (search) q.set("search", String(search));
      return normalizeList(await request("/entities/" + name + "?" + q));
    },

    async get(id) {
      return request("/entities/" + name + "/" + id);
    },
    async create(data) {
      return request("/entities/" + name, { method: "POST", body: data || {} });
    },
    async update(id, data) {
      return request("/entities/" + name + "/" + id, {
        method: "PUT",
        body: data || {},
      });
    },
    async delete(id) {
      return request("/entities/" + name + "/" + id, { method: "DELETE" });
    },
    async count(filter) {
      if (filter === undefined) filter = {};
      const clean = {};
      for (const [k, v] of Object.entries(filter || {})) {
        if (k.startsWith("$") || (v !== null && typeof v === "object")) continue;
        if (v === undefined || v === "") continue;
        clean[k] = v;
      }
      const q = new URLSearchParams({ filter: JSON.stringify(clean) });
      const res = await request("/entities/" + name + "/count?" + q);
      return typeof res === "number" ? res : res.count;
    },
  };
}

const ENTITY_NAMES = [
  "ConsultationRequest",
  "CurtainCategory",
  "CurtainModel",
  "PortfolioCategory",
  "InstallReference",
  "Project",
  "RenderTemplate",
  "SavedDesign",
  "User",
  "VirtualWindowSetting",
];

const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, createEntityApi(n)]));

const agents = {
  async createConversation(opts) {
    const agent_name = (opts && opts.agent_name) || "design_consultant";
    const metadata = opts && opts.metadata;
    return request("/agents/conversations", {
      method: "POST",
      body: { agent_name: agent_name, metadata: metadata },
      auth: true,
    });
  },
  async getConversation(id) {
    return request("/agents/conversations/" + id, { auth: true });
  },
  async addMessage(conversation, message) {
    const id = typeof conversation === "string" ? conversation : conversation.id;
    return request("/agents/conversations/" + id + "/messages", {
      method: "POST",
      body: message,
      auth: true,
    });
  },
  subscribeToConversation(id, onUpdate) {
    let stopped = false;
    let lastLen = -1;
    let timer = null;
    const tick = async () => {
      if (stopped) return;
      try {
        const conv = await agents.getConversation(id);
        const len = (conv.messages && conv.messages.length) || 0;
        if (len !== lastLen) {
          lastLen = len;
          onUpdate && onUpdate(conv);
        }
      } catch (e) {
        /* ignore poll errors */
      }
      if (!stopped) timer = setTimeout(tick, 2500);
    };
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  },
};

async function uploadFile(file, publicEndpoint) {
  const form = new FormData();
  form.append("file", file);
  const path = publicEndpoint ? "/upload/public" : "/upload";
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(API_BASE + path, { method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
}

export const api = {
  entities,
  agents,

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

  functions: {
    async invoke(name, payload) {
      return request("/functions/" + name, {
        method: "POST",
        body: payload || {},
      });
    },
  },

  render: {
    categoriesCoverage() {
      return request("/render/categories-coverage");
    },
    templateFromCategory(category_slug, mechanism) {
      return request("/render/template/from-category", {
        method: "POST",
        body: { category_slug, mechanism },
      });
    },
    templateAllCategories() {
      return request("/render/template/all-categories", { method: "POST", body: {} });
    },
    stats() {
      return request("/render/stats");
    },
    styles() {
      return request("/render/styles", { auth: false });
    },
  },

  integrations: {
    Core: {
      async UploadPublicFile(opts) {
        const file = opts && opts.file;
        try {
          if (getToken()) return await uploadFile(file, false);
        } catch (e) {
          /* fall through */
        }
        return uploadFile(file, true);
      },
    },
  },
};

/** @deprecated use `api` */
export const base44 = api;
