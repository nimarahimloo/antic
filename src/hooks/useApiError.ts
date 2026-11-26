"use client";

import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { errorInfo, type ErrorInfo } from "@/lib/apiError";
import { api } from "@/api/client";

/**
 * Hook for handling API errors consistently across the frontend.
 * - Shows a sonner toast with the Persian error message
 * - Redirects to login on 401/403 auth errors
 * - Returns a structured ErrorInfo for inline display
 */
export function useApiError(opts?: { onAuthError?: () => void; showToast?: boolean }) {
  const showToast = opts?.showToast ?? true;

  const handle = useCallback(
    (err: unknown): ErrorInfo => {
      const info = errorInfo(err);

      if (showToast) {
        try {
          sonnerToast(info.isAuthError ? "خطای احراز هویت" : "خطا", {
            description: info.message,
            ...(info.isAuthError
              ? {
                  action: {
                    label: "ورود دوباره",
                    onClick: () => {
                      opts?.onAuthError?.();
                      api.auth.redirectToLogin(window.location.href);
                    },
                  },
                }
              : {}),
          });
        } catch {
          /* sonner may not be available in SSR; ignore */
        }
      }

      if (info.isAuthError) {
        opts?.onAuthError?.();
        api.auth.redirectToLogin(window.location.href);
      }

      return info;
    },
    [showToast, opts],
  );

  return { handle, errorInfo };
}
