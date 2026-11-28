"use client";

import { useCallback } from "react";
import { toast, type ExternalToast } from "sonner";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Confirmation hook using Sonner's custom toast with action buttons.
 * Returns a promise that resolves to true (confirmed) or false (cancelled).
 *
 * Usage:
 *   const confirm = useConfirmationToast();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirm({
 *       title: "حذف سفارش",
 *       description: "آیا مطمئن هستید که می‌خواهید این سفارش حذف شود؟",
 *       confirmLabel: "حذف",
 *       cancelLabel: "انصراف",
 *     });
 *     if (confirmed) {
 *       await deleteOrder(id);
 *     }
 *   };
 */
export function useConfirmationToast() {
  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        const confirmLabel = options.confirmLabel || "تأیید";
        const cancelLabel = options.cancelLabel || "انصراف";

        // Use a custom toast component for confirmation
        const _toastId = toast.custom((id: string | number) => (
          <div className="flex flex-col gap-3 p-4">
            <div>
              <p className="font-display text-sm font-bold">{options.title}</p>
              {options.description && (
                <p className="mt-1 text-sm text-muted-foreground">{options.description}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(false);
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.dismiss(id);
                  resolve(true);
                }}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        ), {
          duration: Infinity,
          id: `confirm-${Date.now()}`,
        } as ExternalToast);
      });
    },
    []
  );

  return { confirm };
}