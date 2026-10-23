import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

let cache = null;

/**
 * Map style/slug → chroma template URL for live fabric mapping.
 * Only RenderTemplate (green chroma). InstallReference is NOT merged here —
 * finished product photos without green break PhotoCurtain and force 3D fallback.
 * Server-side install_image already used InstallReference when appropriate.
 */
export function useRenderTemplates() {
  const [templates, setTemplates] = useState(null);
  useEffect(() => {
    if (!cache) {
      cache = base44.entities.RenderTemplate.list("-updated_date", 120)
        .then((tplRows) => {
          const map = {};
          for (const r of Array.isArray(tplRows) ? tplRows : []) {
            if (r?.style && r?.image) map[String(r.style).toLowerCase()] = r.image;
          }
          return map;
        })
        .catch(() => ({}));
    }
    cache.then(setTemplates);
  }, []);
  return templates;
}

export function refreshRenderTemplates() {
  cache = null;
}
