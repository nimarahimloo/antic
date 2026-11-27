"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError, ApiError } from "@/api";

interface UseQueryOptions<T> {
  immediate?: boolean;
  onError?: (error: ApiError) => void;
  onSuccess?: (data: T) => void;
  retry?: number;
  retryDelay?: number;
}

interface UseQueryReturn<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  execute: () => Promise<T | null>;
  reset: () => void;
  refetch: () => Promise<T | null>;
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  options: UseQueryOptions<T> = {}
): UseQueryReturn<T> {
  const { immediate = false, onError, onSuccess, retry = 0, retryDelay = 1000 } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const mounted = useRef(true);
  const attemptRef = useRef(0);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    attemptRef.current = 0;
  }, []);

  const execute = useCallback(async (): Promise<T | null> => {
    if (!mounted.current) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current();
      if (!mounted.current) return result;

      setData(result);
      onSuccess?.(result);
      attemptRef.current = 0;
      return result;
    } catch (err) {
      if (!mounted.current) return null;

      const normalized = isApiError(err) ? err : new Error(String(err)) as unknown as ApiError;
      setError(normalized);

      // Retry logic
      if (attemptRef.current < retry) {
        attemptRef.current++;
        await new Promise((r) => setTimeout(r, retryDelay * attemptRef.current));
        return execute();
      }

      onError?.(normalized);
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [onSuccess, retry, retryDelay]);

  const refetch = useCallback(() => execute(), [execute]);

  useEffect(() => {
    mounted.current = true;
    if (immediate) execute();
    return () => {
      mounted.current = false;
    };
  }, [immediate, execute]);

  return { data, loading, error, execute, reset, refetch };
}
