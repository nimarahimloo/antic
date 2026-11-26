"use client";

import { useState, useCallback } from "react";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary" | "warning";
}

interface ConfirmationState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

/**
 * Hook for showing confirmation dialogs.
 * Returns a `confirm` function that shows a modal and resolves when user confirms or cancels.
 * Also returns the current dialog state for rendering the ConfirmationDialog component.
 *
 * Usage:
 *   const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirm({
 *       title: "حذف محصول",
 *       description: "آیا مطمئن هستید که می‌خواهید این محصول را حذف کنید؟ این عمل بازگشت‌پذیر نیست.",
 *       variant: "destructive",
 *     });
 *     if (confirmed) {
 *       await deleteProduct(id);
 *     }
 *   };
 *
 *   // In render:
 *   {dialogState.open && dialogState.options && (
 *     <ConfirmationDialog
 *       open={dialogState.open}
 *       onOpenChange={handleCancel}
 *       title={dialogState.options.title}
 *       description={dialogState.options.description}
 *       confirmLabel={dialogState.options.confirmLabel}
 *       cancelLabel={dialogState.options.cancelLabel}
 *       variant={dialogState.options.variant}
 *       onConfirm={handleConfirm}
 *       onCancel={handleCancel}
 *     />
 *   )}
 */
export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    open: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          options,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(true);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(false);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  return {
    confirm,
    dialogState: state,
    handleConfirm,
    handleCancel,
  };
}

/**
 * Simpler hook that just returns the confirm function and a single ConfirmationDialog
 * that manages its own state internally. Use this when you only need one confirmation at a time.
 */
export function useSimpleConfirmation() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: null,
    resolve: null,
  });

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setDialogState({
          open: true,
          options,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => {
      prev.resolve?.(true);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDialogState((prev) => {
      prev.resolve?.(false);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  return {
    confirm,
    dialogState,
    handleConfirm,
    handleCancel,
  };
}