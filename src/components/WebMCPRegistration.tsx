"use client";

import { useEffect } from "react";
import { api } from "@/api/client";

/* ------------------------------------------------------------------ */
/* WebMCP — expose site tools to AI agents via the browser            */
/* https://webmachinelearning.github.io/webmcp/                       */
/*                                                                    */
/* Tools are registered via navigator.modelContext.registerTool() on  */
/* page load. An AbortController is used to unregister them when the  */
/* component unmounts (or the page is navigated away from).           */
/* ------------------------------------------------------------------ */

declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (
        tool: WebMCPTool,
        options?: { signal?: AbortSignal }
      ) => Promise<void>;
    };
  }
}

interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    args: unknown,
    options: { signal: AbortSignal }
  ) => unknown | Promise<unknown>;
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function get(path: string, opts: { signal: AbortSignal; query?: Record<string, string> }): Promise<Json> {
  const url = new URL(path, window.location.origin);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      url.searchParams.set(k, v);
    }
  }
  return fetch(url.toString(), {
    signal: opts.signal,
    headers: { Accept: "application/json" },
    credentials: "include",
  }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as Json;
    return { status: res.status, body: await res.text() } as unknown as Json;
  });
}

const TOOLS: WebMCPTool[] = [
  {
    name: "searchCurtainCategories",
    description: "Search curtain categories in the site catalog",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for category names" },
        limit: { type: "number", description: "Maximum number of results", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    execute: async (args, { signal }) => {
      const { query, limit } = (args as { query?: string; limit?: number }) || {};
      return get("/api/entities/CurtainCategory", {
        signal,
        query: {
          ...(query ? { search: query } : {}),
          limit: String(limit ?? 50),
          sort_by: "order",
        },
      });
    },
  },
  {
    name: "getCurtainModels",
    description: "Get curtain models from the catalog",
    inputSchema: {
      type: "object",
      properties: {
        categorySlug: { type: "string", description: "Filter by curtain category slug" },
        limit: { type: "number", description: "Maximum number of results", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    execute: async (args, { signal: _signal }) => {
      const { categorySlug, limit } = (args as { categorySlug?: string; limit?: number }) || {};
      const filter: Record<string, unknown> = {};
      if (categorySlug) filter.categorySlug = categorySlug;
      return api.entities.CurtainModel.filter(filter, { limit: limit ?? 50, sort_by: "order" });
    },
  },
  {
    name: "searchShopProducts",
    description: "Search accessory products in the online shop",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for product names" },
        categoryId: { type: "string", description: "Filter by shop category ID" },
        limit: { type: "number", description: "Maximum number of results", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    execute: async (args, { signal }) => {
      const { query, categoryId, limit } = (args as {
        query?: string;
        categoryId?: string;
        limit?: number;
      }) || {};
      return get("/api/catalog/products", {
        signal,
        query: {
          ...(query ? { search: query } : {}),
          ...(categoryId ? { categoryId } : {}),
          limit: String(limit ?? 50),
        },
      });
    },
  },
  {
    name: "getPublicSettings",
    description: "Get public site settings (name, logo, hero slides, AI config)",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async (_args, { signal }) => {
      return get("/api/app/public-settings", { signal });
    },
  },
  {
    name: "navigateTo",
    description: "Navigate the browser to a page on this site",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative URL path to navigate to (e.g. /shop, /curtain/123)",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
    execute: async (args) => {
      const { path } = args as { path: string };
      if (typeof window === "undefined") return { ok: false };
      window.location.assign(path);
      return { ok: true, path };
    },
  },
];

export function WebMCPRegistration() {
  useEffect(() => {
    // Only run in the browser and only when the WebMCP API is available
    const modelContext = navigator.modelContext;
    if (typeof window === "undefined" || !modelContext?.registerTool) {
      return undefined;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const registerAll = async () => {
      for (const tool of TOOLS) {
        try {
          await modelContext.registerTool(tool, { signal });
          console.log(`[webmcp] registered tool: ${tool.name}`);
        } catch (err) {
          console.error(`[webmcp] failed to register ${tool.name}:`, err);
        }
      }
    };

    registerAll();

    // Unregister tools when the component unmounts by aborting the signal
    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
