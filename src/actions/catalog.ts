"use server";

import { cookies } from "next/headers";
import { API_BASE } from "@/api/constants";
import { ApiError } from "@/api/types";

const TOKEN_KEY = "antic_access_token";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body,
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    if (res.status === 401) {
      cookieStore.delete(TOKEN_KEY);
    }
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
    throw new ApiError(message, { status: res.status, data });
  }

  return data as T;
}

export async function getCurtainCategories(catalogOnly = true) {
  const params = new URLSearchParams({ catalog_only: String(catalogOnly) });
  return request<{ items: Array<{ id: string; name: string; slug: string; image: string | null; subcategories: unknown; parent_slug: string | null }> }>(
    `/entities/CurtainCategory?${params}`
  );
}

export async function getCurtainModels(params: {
  category?: string;
  subcategory?: string;
  search?: string;
  limit?: number;
  sort?: string;
} = {}) {
  const filter: Record<string, unknown> = {};
  if (params.category) filter.categorySlug = params.category;
  if (params.subcategory) filter.subcategory = params.subcategory;

  const searchParams = new URLSearchParams();
  if (Object.keys(filter).length) searchParams.set("filter", JSON.stringify(filter));
  if (params.search) searchParams.set("search", params.search);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.sort) searchParams.set("sort_by", params.sort);

  return request<{ count: number; items: unknown[] }>(
    `/entities/CurtainModel?${searchParams}`
  );
}

export async function getCategoryProjects(categorySlug: string) {
  return request<{ projects: unknown[] }>(`/entities/CurtainCategory/${encodeURIComponent(categorySlug)}/projects`);
}

export async function getRelatedProjects(modelId: string) {
  return request<{ projects: unknown[] }>(`/entities/CurtainModel/${encodeURIComponent(modelId)}/related-projects`);
}

export async function getCategoryCounts() {
  // Backend has no per-category count endpoint; return empty map so callers degrade gracefully.
  return {} as Record<string, number>;
}