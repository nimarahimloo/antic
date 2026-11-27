import { request } from "./core";
import { EntityFilterOptions } from "./types";

function normalizeList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  return [];
}

export function createEntityApi<T = unknown>(name: string) {
  return {
    async list(sortBy = "-created_date", limit = 500): Promise<T[]> {
      const q = new URLSearchParams({ sort_by: String(sortBy), limit: String(limit) });
      return normalizeList(await request(`/entities/${name}?${q}`)) as T[];
    },

    async filter(filter: Record<string, unknown> = {}, options: EntityFilterOptions = {}): Promise<T[]> {
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
      const params = new URLSearchParams({ sort_by: String(sortBy), limit: String(limit), filter: JSON.stringify(clean) });
      if (searchStr) params.set("search", searchStr);
      return normalizeList(await request(`/entities/${name}?${params}`)) as T[];
    },

    async get(id: string): Promise<T> {
      return request(`/entities/${name}/${id}`);
    },
    async create(data: Record<string, unknown>): Promise<T> {
      return request(`/entities/${name}`, { method: "POST", body: data });
    },
    async update(id: string, data: Record<string, unknown>): Promise<T> {
      return request(`/entities/${name}/${id}`, { method: "PUT", body: data });
    },
    async delete(id: string): Promise<void> {
      return request(`/entities/${name}/${id}`, { method: "DELETE" });
    },
    async count(filter: Record<string, unknown> = {}): Promise<number> {
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
    async bulkCreate(records: Record<string, unknown>[]) {
      return request(`/entities/${name}/bulk`, { method: "POST", body: { records } });
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
  "Collection",
  "RenderTemplate",
  "SavedDesign",
  "SiteSetting",
  "User",
  "VirtualWindowSetting",
];

export const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, createEntityApi(n)]));
