import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

let cache = null;

export function useRenderTemplates() {
  const [templates, setTemplates] = useState(null);
  useEffect(() => {
    if (!cache) {
      cache = base44.entities.RenderTemplate.list("-updated_date", 50)
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : [];
          return Object.fromEntries(list.reverse().map((r) => [r.style, r.image]));
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
