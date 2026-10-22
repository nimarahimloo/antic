/**
 * Local mock of the former Base44 SDK client.
 * Phase 1: zero runtime dependency on @base44/* so the frontend
 * runs with plain `npm run dev`. Data lives in memory (and optional
 * localStorage) and is wiped on hard refresh unless persisted.
 *
 * Surface matches what the app already calls:
 *   base44.entities.<Name>.list|filter|get|create|update|delete|count
 *   base44.auth.me|logout|redirectToLogin
 *   base44.app.getPublicSettings
 *   base44.functions.invoke
 *   base44.integrations.Core.UploadPublicFile
 *
 * Phase 2 will swap this file for a real HTTP client against our own API.
 */

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

const STORAGE_PREFIX = "antic-mock-";

function uid() {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadStore(name) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + name);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStore(name, rows) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

function matchFilter(row, filter = {}) {
  return Object.entries(filter).every(([k, v]) => {
    if (v === undefined) return true;
    return row[k] === v;
  });
}

function sortRows(rows, sortBy) {
  if (!sortBy) return rows;
  const desc = sortBy.startsWith("-");
  const key = desc ? sortBy.slice(1) : sortBy;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : 1;
    return desc ? -cmp : cmp;
  });
}

function createEntityApi(name) {
  return {
    async list(sortBy = "-created_date", limit = 100) {
      const rows = sortRows(loadStore(name), sortBy);
      return rows.slice(0, limit);
    },
    async filter(filter = {}, sortBy = "-created_date", limit = 100) {
      const rows = sortRows(loadStore(name).filter((r) => matchFilter(r, filter)), sortBy);
      return rows.slice(0, limit);
    },
    async get(id) {
      const row = loadStore(name).find((r) => r.id === id);
      if (!row) {
        const err = new Error(`Not found: ${name}/${id}`);
        err.status = 404;
        throw err;
      }
      return row;
    },
    async create(data = {}) {
      const now = new Date().toISOString();
      const row = {
        ...data,
        id: data.id || uid(),
        created_date: data.created_date || now,
        updated_date: now,
      };
      const rows = loadStore(name);
      rows.unshift(row);
      saveStore(name, rows);
      return row;
    },
    async update(id, data = {}) {
      const rows = loadStore(name);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) {
        const err = new Error(`Not found: ${name}/${id}`);
        err.status = 404;
        throw err;
      }
      const updated = {
        ...rows[idx],
        ...data,
        id,
        updated_date: new Date().toISOString(),
      };
      rows[idx] = updated;
      saveStore(name, rows);
      return updated;
    },
    async delete(id) {
      const rows = loadStore(name).filter((r) => r.id !== id);
      saveStore(name, rows);
      return { id };
    },
    async count(filter = {}) {
      return loadStore(name).filter((r) => matchFilter(r, filter)).length;
    },
  };
}

const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, createEntityApi(n)]));

const DEV_USER = {
  id: "dev-user",
  email: "dev@antic.local",
  full_name: "توسعه‌دهنده محلی",
  role: "admin",
};

export const base44 = {
  entities,

  auth: {
    async me() {
      return DEV_USER;
    },
    logout(redirectUrl) {
      if (typeof window !== "undefined" && redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin(returnUrl) {
      if (typeof window !== "undefined") {
        console.info("[antic mock] redirectToLogin skipped — local auth is always on.", returnUrl);
      }
    },
  },

  app: {
    async getPublicSettings() {
      return {
        id: "antic-local",
        public_settings: {
          app_name: "پرده آنتیک",
          locale: "fa",
        },
      };
    },
  },

  functions: {
    async invoke(name, payload = {}) {
      console.info("[antic mock] functions.invoke", name, payload);
      if (name === "generateInstallImage") {
        return { data: { install_image: "" } };
      }
      if (name === "generateRenderTemplate") {
        return { data: { image: "" } };
      }
      return { data: null };
    },
  },

  integrations: {
    Core: {
      async UploadPublicFile({ file }) {
        // Local: turn File/Blob into an object URL so admin image fields still work.
        if (typeof window === "undefined" || !file) {
          return { file_url: "" };
        }
        const url = URL.createObjectURL(file);
        return { file_url: url };
      },
    },
  },
};
