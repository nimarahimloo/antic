"use client";

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
import { isApiError, ApiError } from "@/api";

interface UseApiOptions<T> {
  immediate?: boolean;
  onError?: (err: ApiError | Error) => void;
}

interface UseApiReturn<T, Args extends unknown[]> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T, Args extends unknown[]>(
  apiFn: (...args: Args) => Promise<T>,
  { immediate = false, onError }: UseApiOptions<T> = {}
): UseApiReturn<T, Args> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const mounted = useRef(true);
  const apiFnRef = useRef(apiFn);
  
  useEffect(() => {
    apiFnRef.current = apiFn;
  }, [apiFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const execute = useCallback(
    async (...args: Args) => {
      if (!mounted.current) return null as T | null;
      setLoading(true);
      setError(null);
      try {
        const result = await apiFnRef.current(...args);
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
    [onError]
  );

  useEffect(() => {
    mounted.current = true;
    // `execute` is generic over Args; an immediate call passes no arguments.
    if (immediate) void execute(...([] as unknown as Args));
    return () => {
      mounted.current = false;
    };
  }, [immediate, execute]);

  return { data, loading, error, execute, reset };
}