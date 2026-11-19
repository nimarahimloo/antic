/**
 * HTTP client for the Antic backend (/api).
 * Works in both client and server components.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const TOKEN_KEY = "antic_access_token";

export const AUTH_EVENT = "antic:auth:unauthorized";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  setToken(null);
}

/**
 * Normalised error thrown by every API call.
 */
export class ApiError extends Error {
  status: number;
  data: unknown;
  isNetworkError: boolean;
  isAuthError: boolean;

  constructor(message: string, { status = 0, data, isNetworkError = false }: { status?: number; data?: unknown; isNetworkError?: boolean } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? 0;
    this.data = data;
    this.isNetworkError = isNetworkError ?? false;
    this.isAuthError = (status ?? 0) === 401 || (status ?? 0) === 403;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/**
 * Perform a fetch request and normalise the result.
 */
async function request(
  path: string,
  { method = "GET", body, auth = true }: { method?: string; body?: unknown; auth?: boolean } = {}
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch (fetchErr) {
    throw new ApiError("شبکه در دسترس نیست. لطفاً اتصال اینترنت را بررسی کنید.", {
      status: 0,
      data: null,
      isNetworkError: true,
    });
  }

  if (res.status === 204) return undefined;

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    let message: string;
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as Record<string, unknown>).error === "string"
    ) {
      message = (data as Record<string, unknown>).error as string;
    } else {
      message = `HTTP ${res.status}`;
    }

    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_EVENT));
      }
    }

    throw new ApiError(message, { status: res.status, data });
  }

  return data;
}

function normalizeList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  return [];
}

interface EntityFilterOptions {
  filter?: Record<string, unknown>;
  sort?: string;
  sort_by?: string;
  limit?: number;
  search?: string;
  q?: string;
}

function createEntityApi(name: string) {
  return {
    async list(sortBy = "-created_date", limit = 500) {
      const q = new URLSearchParams({
        sort_by: String(sortBy),
        limit: String(limit),
      });
      return normalizeList(await request(`/entities/${name}?${q}`));
    },

    async filter(filter: Record<string, unknown> = {}, options: EntityFilterOptions = {}): Promise<unknown[]> {
      const { sort, sort_by, limit = 500, search, q: searchQ } = options;
      const sortBy = String(sort || sort_by || "-created_date");
      const searchStr = String(search || searchQ || "");
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(filter || {})) {
        if (k.startsWith("$")) continue;
        if (v !== null && typeof v === "object") continue;
        if (v === undefined || v === "") continue;
        clean[k] = v;
      }
      const params = new URLSearchParams({
        sort_by: String(sortBy),
        limit: String(limit),
        filter: JSON.stringify(clean),
      });
      if (searchStr) params.set("search", searchStr);
      return normalizeList(await request(`/entities/${name}?${params}`));
    },

    async get(id: string) {
      return request(`/entities/${name}/${id}`);
    },
    async create(data: Record<string, unknown>) {
      return request(`/entities/${name}`, { method: "POST", body: data });
    },
    async update(id: string, data: Record<string, unknown>) {
      return request(`/entities/${name}/${id}`, { method: "PUT", body: data });
    },
    async delete(id: string) {
      return request(`/entities/${name}/${id}`, { method: "DELETE" });
    },
    async count(filter: Record<string, unknown> = {}) {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(filter || {})) {
        if (k.startsWith("$") || (v !== null && typeof v === "object")) continue;
        if (v === undefined || v === "") continue;
        clean[k] = v;
      }
      const q = new URLSearchParams({ filter: JSON.stringify(clean) });
      const res = await request(`/entities/${name}/count?${q}`);
      return typeof res === "number" ? res : (res as { count: number }).count;
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
  "SiteSetting",
  "User",
  "VirtualWindowSetting",
];

/** ناوبری کامل (full page load) با URL مطلق — سازگار با App Router */
function navigateTo(path: string) {
  if (typeof window === "undefined") return;
  window.location.assign(new URL(path, window.location.origin).toString());
}

const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, createEntityApi(n)]));

interface Conversation {
  id: string;
  agent_name: string;
  metadata: Record<string, unknown>;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
}

const agents = {
  async createConversation(opts: { agent_name?: string; metadata?: Record<string, unknown> } = {}): Promise<Conversation> {
    const agent_name = opts.agent_name || "design_consultant";
    const metadata = opts.metadata;
    return request("/agents/conversations", {
      method: "POST",
      body: { agent_name, metadata },
      auth: true,
    }) as Promise<Conversation>;
  },
  async getConversation(id: string): Promise<Conversation> {
    return request(`/agents/conversations/${id}`, { auth: true }) as Promise<Conversation>;
  },
  async addMessage(conversation: string | { id: string }, message: unknown): Promise<Conversation> {
    const id = typeof conversation === "string" ? conversation : conversation.id;
    return request(`/agents/conversations/${id}/messages`, {
      method: "POST",
      body: message,
      auth: true,
    }) as Promise<Conversation>;
  },
  subscribeToConversation(id: string, onUpdate: (conv: Conversation) => void) {
    let stopped = false;
    let lastLen = -1;
    let timer: NodeJS.Timeout | null = null;
    const tick = async () => {
      if (stopped) return;
      try {
        const conv = await agents.getConversation(id);
        const len = (conv as { messages?: unknown[] }).messages?.length || 0;
        if (len !== lastLen) {
          lastLen = len;
          onUpdate?.(conv);
        }
      } catch {
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

async function uploadFile(file: File, publicEndpoint: boolean) {
  const form = new FormData();
  form.append("file", file);
  const path = publicEndpoint ? "/upload/public" : "/upload";
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Upload failed", { status: res.status, data });
  return data;
}

export const api = {
  entities,

  agents,

  auth: {
    async me() {
      return request("/auth/me");
    },
    async login(identifier: string, password: string) {
      const body: Record<string, unknown> = { password };
      if (identifier.includes("@")) body.email = identifier;
      else body.phone = identifier;
      body.identifier = identifier;
      const res = await request("/auth/login", {
        method: "POST",
        body,
        auth: false,
      });
      if (res && typeof res === "object" && "token" in res) setToken((res as { token: string }).token);
      return res;
    },
    async loginViaEmailPassword(email: string, password: string) {
      return this.login(email, password);
    },
    loginWithProvider(provider: string, returnTo?: string) {
      if (typeof window === "undefined") return;
      if (provider === "google") {
        const base = (process.env.NEXT_PUBLIC_API_BASE || "/api").replace(/\/$/, "");
        const q = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
        navigateTo(`${base}/auth/google${q}`);
        return;
      }
      navigateTo(`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
    },
    async register(emailOrOpts: string | Record<string, unknown>, password: string, full_name: string) {
      let body: Record<string, unknown>;
      if (typeof emailOrOpts === "object" && emailOrOpts !== null) {
        body = {
          email: emailOrOpts.email || undefined,
          phone: emailOrOpts.phone || undefined,
          password: emailOrOpts.password,
          full_name: emailOrOpts.full_name || emailOrOpts.fullName,
        };
      } else {
        body = { email: emailOrOpts, password, full_name };
      }
      const res = await request("/auth/register", {
        method: "POST",
        body,
        auth: false,
      });
      if (res && typeof res === "object" && "token" in res) setToken((res as { token: string }).token);
      return res;
    },
    async verifyOtp() {
      return { access_token: getToken() };
    },
    async resendOtp() {
      return { ok: true };
    },
    /** Request a password-reset link. The backend never reveals if the email exists. */
    async requestPasswordReset(email: string) {
      return request("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      });
    },
    /** Redeem a single-use reset token and set the new password. */
    async resetPassword(token: string, newPassword: string) {
      return request("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword },
        auth: false,
      });
    },
    setToken,
    logout(redirectUrl?: string) {
      clearToken();
      request("/auth/logout", { method: "POST" }).catch(() => {});
      if (typeof window !== "undefined" && redirectUrl) {
        navigateTo(redirectUrl);
      }
    },
    redirectToLogin(returnUrl?: string) {
      if (typeof window === "undefined") return;
      const q = returnUrl ? `?returnTo=${encodeURIComponent(returnUrl)}` : "";
      navigateTo(`/login${q}`);
    },
  },

  app: {
    async getPublicSettings() {
      return request("/app/public-settings", { auth: false });
    },
  },

  account: {
    overview() {
      return request("/account/overview");
    },
    updateProfile(body: Record<string, unknown>) {
      return request("/account/profile", { method: "PATCH", body });
    },
    changePassword(body: Record<string, unknown>) {
      return request("/account/password", { method: "POST", body });
    },
    orders() {
      return request("/account/orders");
    },
    order(id: string) {
      return request(`/account/orders/${id}`);
    },
    addresses() {
      return request("/account/addresses");
    },
    createAddress(body: Record<string, unknown>) {
      return request("/account/addresses", { method: "POST", body });
    },
    updateAddress(id: string, body: Record<string, unknown>) {
      return request(`/account/addresses/${id}`, { method: "PUT", body });
    },
    deleteAddress(id: string) {
      return request(`/account/addresses/${id}`, { method: "DELETE" });
    },
    requests() {
      return request("/account/requests");
    },
  },

  functions: {
    async invoke(name: string, payload: Record<string, unknown>) {
      return request(`/functions/${name}`, {
        method: "POST",
        body: payload,
      });
    },
  },

  render: {
    categoriesCoverage() {
      return request("/render/categories-coverage");
    },
    templateFromCategory(category_slug: string, mechanism: string) {
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
      async UploadPublicFile(opts: { file: File }) {
        const file = opts?.file;
        try {
          if (getToken()) return await uploadFile(file, false);
        } catch {
          /* fall through */
        }
        return uploadFile(file, true);
      },
    },
  },
};