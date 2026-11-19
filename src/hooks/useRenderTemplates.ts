"use client";

import { useEffect, useState } from "react";
import { api } from "@/api/client";

let cache: Promise<Record<string, string>> | null = null;

/**
 * Map style/slug → chroma template URL for live fabric mapping.
 * Only RenderTemplate (green chroma). InstallReference is NOT merged here —
 * finished product photos without green break PhotoCurtain and force 3D fallback.
 * Server-side install_image already used InstallReference when appropriate.
 */
export function useRenderTemplates(): Record<string, string> | null {
  const [templates, setTemplates] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    if (!cache) {
      cache = api.entities.RenderTemplate.list("-updated_date", 120)
        .then((tplRows) => {
          const map: Record<string, string> = {};
          for (const r of Array.isArray(tplRows) ? tplRows : []) {
            const row = (r || {}) as Record<string, unknown>;
            if (row.style && row.image) map[String(row.style).toLowerCase()] = String(row.image);
          }
          return map;
        })
        .catch((err) => {
          console.error("Failed to load render templates:", err);
          return {};
        });
    }
    cache.then(setTemplates);
  }, []);
  return templates;
}

export function refreshRenderTemplates() {
  cache = null;
}