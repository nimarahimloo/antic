import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

let cache = null;

/**
 * Merged map: style/slug → image URL.
 * InstallReference wins over RenderTemplate for the same key (real install photo > procedural chroma).
 */
export function useRenderTemplates() {
  const [templates, setTemplates] = useState(null);
  useEffect(() => {
    if (!cache) {
      cache = Promise.all([
        base44.entities.RenderTemplate.list("-updated_date", 80).catch(() => []),
        base44.entities.InstallReference.list("-updated_date", 80).catch(() => []),
      ])
        .then(([tplRows, refRows]) => {
          const map = {};
          for (const r of Array.isArray(tplRows) ? tplRows : []) {
            if (r?.style && r?.image) map[String(r.style).toLowerCase()] = r.image;
          }
          // references overwrite chroma for same key
          for (const r of Array.isArray(refRows) ? refRows : []) {
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
