const pendingRequests = new Map<string, Promise<unknown>>();

export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Builds a param-aware dedupe key so that requests with different
 * parameters don't collide in the dedupe map.
 */
export function dedupeKey(
  base: string,
  params: Record<string, unknown> = {}
): string {
  const sorted = Object.entries(params).sort(([a], [b]) =>
    String(a).localeCompare(String(b))
  );
  const suffix = sorted.map(([k, v]) => `${k}=${String(v)}`).join("&");
  return suffix ? `${base}:${suffix}` : base;
}
