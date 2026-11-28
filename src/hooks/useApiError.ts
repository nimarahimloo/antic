"use client";

import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { errorInfo, type ErrorInfo } from "@/lib/apiError";
import { api } from "@/api";

/**
 * Hook for handling API errors consistently across the frontend.
 * - Shows a sonner toast with the Persian error message
 * - On 401/403 auth errors: calls `onAuthError` (if provided) and does NOT
 *   redirect — the caller (e.g. admin layout with login modal) handles the
 *   redirect/modal logic. If `onAuthError` is not provided, redirects to login.
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
                      if (!opts?.onAuthError) {
                        api.auth.redirectToLogin(window.location.href);
                      }
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
        if (!opts?.onAuthError) {
          api.auth.redirectToLogin(window.location.href);
        }
      }

      return info;
    },
    [showToast, opts],
  );

  return { handle, errorInfo };
}
