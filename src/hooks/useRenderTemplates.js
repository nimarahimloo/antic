import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

let cache = null;

export function useRenderTemplates() {
  const [templates, setTemplates] = useState(null);
  useEffect(() => {
    cache = cache || base44.entities.RenderTemplate.list('-updated_date', 50)
      .then(rows => Object.fromEntries(rows.reverse().map(r => [r.style, r.image])));
    cache.then(setTemplates);
  }, []);
  return templates;
}

export function refreshRenderTemplates() { cache = null; }