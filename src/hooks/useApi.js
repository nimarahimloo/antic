/**
 * useApi — consistent error / loading state for API calls.
 *
 *   const { data, loading, error, execute, reset } = useApi(apiFn, {
 *     immediate: false,   // set true to run on mount
 *     onError: (err) => toast.error(apiErrorMessage(err)), // optional custom handler
 *   });
 *
 *   await execute();   // manually trigger
 *
 * Errors are stored in `error` (an ApiError or plain Error). Use `apiErrorMessage`
 * to render a user-facing string.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/api/client";

export function useApi(apiFn, { immediate = false, onError } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mounted = useRef(true);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const execute = useCallback(
    async (...args) => {
      if (!mounted.current) return;
      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(...args);
        if (!mounted.current) return result;
        setData(result);
        return result;
      } catch (err) {
        if (!mounted.current) return null;
        const normalized = isApiError(err) ? err : new Error(String(err));
        setError(normalized);
        if (onError) onError(normalized);
        return null;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [apiFn, onError]
  );

  useEffect(() => {
    mounted.current = true;
    if (immediate) execute();
    return () => {
      mounted.current = false;
    };
  }, [immediate, execute]);

  return { data, loading, error, execute, reset };
}
