/**
 * HTTP client compatible with the former Base44 SDK surface.
 * Talks to our own backend at /api (proxied by Vite in dev).
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
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function createEntityApi(name) {
  return {
    async list(sortBy = "-created_date", limit = 100) {
      const q = new URLSearchParams({ sort_by: sortBy, limit: String(limit) });
      return request(`/entities/${name}?${q}`);
    },
    async filter(filter = {}, sortBy = "-created_date", limit = 100) {
      const q = new URLSearchParams({
        sort_by: sortBy,
        limit: String(limit),
        filter: JSON.stringify(filter),
      });
      return request(`/entities/${name}?${q}`);
    },
    async get(id) {
      return request(`/entities/${name}/${id}`);
    },
    async create(data = {}) {
      return request(`/entities/${name}`, { method: "POST", body: data });
    },
    async update(id, data = {}) {
      return request(`/entities/${name}/${id}`, { method: "PUT", body: data });
    },
    async delete(id) {
      return request(`/entities/${name}/${id}`, { method: "DELETE" });
    },
    async count(filter = {}) {
      const q = new URLSearchParams({ filter: JSON.stringify(filter) });
      const res = await request(`/entities/${name}/count?${q}`);
      return typeof res === "number" ? res : res.count;
    },
  };
}

const ENTITY_NAMES = [
  "ConsultationRequest",
  "CurtainCategory",
  "CurtainModel",
  "InstallReference",
  "Project",
  "RenderTemplate",
  "SavedDesign",
  "User",
  "VirtualWindowSetting",
];

const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, createEntityApi(n)]));

/** Local design consultant agent (no Base44) */
const agents = {
  async createConversation({ agent_name, metadata } = {}) {
    return request("/agents/conversations", {
      method: "POST",
      body: { agent_name: agent_name || "design_consultant", metadata },
      auth: false,
    });
  },
  async getConversation(id) {
    return request(`/agents/conversations/${id}`, { auth: false });
  },
  async addMessage(conversation, message) {
    const id = typeof conversation === "string" ? conversation : conversation.id;
    return request(`/agents/conversations/${id}/messages", {
      method: "POST",
      body: message,
      auth: false,
    });
  },
  /**
   * Poll-based subscribe (replaces Base44 realtime).
   * Calls onUpdate with full conversation whenever messages change.
   */
  subscribeToConversation(id, onUpdate) {
    let stopped = false;
    let lastLen = -1;
    const tick = async () => {
      if (stopped) return;
      try {
        const conv = await agents.getConversation(id);
        const len = conv.messages?.length ?? 0;
        if (len !== lastLen) {
          lastLen = len;
          onUpdate(conv);
        }
      } catch {
        /* ignore transient */
      }
      if (!stopped) timer = setTimeout(tick, 1200);
    };
    let timer = setTimeout(tick, 400);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  },
};

export const base44 = {
  entities,
  agents,

  auth: {
    async me() {
      return request("/auth/me");
    },
    async login(email, password) {
      const res = await request("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      if (res.token) setToken(res.token);
      return res;
    },
    async loginViaEmailPassword(email, password) {
      return this.login(email, password);
    },
    loginWithProvider(provider, returnTo) {
      console.warn("[antic] OAuth provider not configured:", provider);
      if (typeof window !== "undefined") {
        window.location.href =
          "/login" + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "");
      }
    },
    async register(emailOrOpts, password, full_name) {
      const body =
        typeof emailOrOpts === "object" && emailOrOpts !== null
          ? {
              email: emailOrOpts.email,
              password: emailOrOpts.password,
              full_name: emailOrOpts.full_name || emailOrOpts.fullName,
            }
          : { email: emailOrOpts, password, full_name };
      const res = await request("/auth/register", {
        method: "POST",
        body,
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
    setToken,
    logout(redirectUrl) {
      clearToken();
      request("/auth/logout", { method: "POST" }).catch(() => {});
      if (typeof window !== "undefined" && redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin(returnUrl) {
      if (typeof window === "undefined") return;
      const q = returnUrl ? `?returnTo=${encodeURIComponent(returnUrl)}` : "";
      window.location.href = `/login${q}`;
    },
  },

  app: {
    async getPublicSettings() {
      return request("/app/public-settings", { auth: false });
    },
  },

  functions: {
    async invoke(name, payload = {}) {
      return request(`/functions/${name}`, { method: "POST", body: payload });
    },
  },

  integrations: {
    Core: {
      async UploadPublicFile({ file }) {
        const token = getToken();
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.error || "Upload failed");
          err.status = res.status;
          throw err;
        }
        return data;
      },
    },
  },
};
