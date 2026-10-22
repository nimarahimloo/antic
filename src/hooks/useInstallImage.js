import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const cache = {};
const pending = {};

// Returns the AI-generated real installation image for a model; generates it once on first view.
export function useInstallImage(fabric) {
  const id = fabric?.id;
  const approved = fabric?.install_status === 'approved' ? fabric.install_image : '';
  const [url, setUrl] = useState(approved || cache[id] || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const known = approved || cache[id];
    setUrl(known || '');
    // rejected images stay hidden; only unreviewed models trigger generation + review
    if (known || cache[id] === '' || fabric?.install_status === 'rejected' || !id || !fabric?.image) return;
    let alive = true;
    setLoading(true);
    pending[id] ||= base44.functions.invoke('generateInstallImage', { model_id: id }).then(r => (cache[id] = r.data?.install_image || ''));
    pending[id].then(u => alive && setUrl(u)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id, approved, fabric?.install_status, fabric?.image]);

  return { url, loading };
}