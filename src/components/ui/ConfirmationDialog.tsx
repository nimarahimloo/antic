"use client";

import { useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary" | "warning";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

const variantStyles = {
  destructive: "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20",
  primary: "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20",
  warning: "border-amber/50 bg-amber/10 text-amber hover:bg-amber/20",
};

const variantIconStyles = {
  destructive: "text-destructive",
  primary: "text-primary",
  warning: "text-amber",
};

const variantLabels = {
  destructive: "دستورالعمل تخریبی",
  primary: "تأیید عملیات",
  warning: "هشدار",
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
      onOpenChange(false);
    }
  }, [onConfirm, onOpenChange]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        handleCancel();
      } else if (e.key === "Enter" && !isConfirming) {
        handleConfirm();
      }
    },
    [open, handleConfirm, handleCancel, isConfirming]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-secondary/60 bg-card p-6 shadow-xl animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="confirm-title" className="font-display text-lg font-black text-foreground">
              {variantLabels[variant]}
            </h3>
            <p id="confirm-desc" className="mt-1 font-body text-xs text-muted-foreground">
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isConfirming}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 font-body text-sm text-foreground">{description}</p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isConfirming}
            className="btn-ghost-gold px-4 py-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className={`inline-flex items-center gap-2 px-4 py-2 font-body text-sm font-medium rounded-lg border ${variantStyles[variant]}`}
          >
            {isConfirming ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                در حال انجام...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to body to avoid z-index issues
  if (typeof window !== "undefined") {
    return createPortal(dialogContent, document.body);
  }

  return null;
}