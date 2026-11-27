import { API_BASE } from "./constants";
import { getToken } from "./token";
import { request } from "./core";
import { ApiError } from "./types";
export type { Media, MediaListResponse } from "@/types/media";
import type { Media, MediaListResponse } from "@/types/media";

export const mediaApi = {
  async list(opts?: { limit?: number; offset?: number; search?: string; mimeType?: string; sort_by?: string }): Promise<MediaListResponse> {
    const q = new URLSearchParams();
    if (opts?.limit) q.set("limit", String(opts.limit));
    if (opts?.offset !== undefined) q.set("offset", String(opts.offset));
    if (opts?.search) q.set("search", opts.search);
    if (opts?.mimeType) q.set("mimeType", opts.mimeType);
    if (opts?.sort_by) q.set("sort_by", opts.sort_by);
    return request(`/media?${q}`, { auth: false }) as Promise<MediaListResponse>;
  },

  async upload(file: File): Promise<Media> {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/media`, { method: "POST", headers, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || "آپلود رسانه ناموفق بود", { status: res.status, data });
    return data.media as Media;
  },

  async get(id: string): Promise<Media> {
    return request(`/media/${encodeURIComponent(id)}`, { auth: false }) as Promise<Media>;
  },

  async update(id: string, body: { alt?: string; caption?: string; title?: string }): Promise<Media> {
    return request(`/media/${encodeURIComponent(id)}`, { method: "PATCH", body }) as Promise<Media>;
  },

  async delete(id: string, force = false): Promise<void> {
    await request(`/media/${encodeURIComponent(id)}?${force ? "force=true" : ""}`, { method: "DELETE" });
  },

  async registerUsage(body: {
    mediaId: string;
    entityType: string;
    entityId: string;
    fieldName: string;
  }): Promise<{ usage: { id: string; mediaId: string; entityType: string; entityId: string; fieldName: string; createdAt: string } }> {
    return request("/media/usages", { method: "POST", body }) as Promise<{
      usage: { id: string; mediaId: string; entityType: string; entityId: string; fieldName: string; createdAt: string };
    }>;
  },
};
