"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import RenderCompareDialog from "@/components/admin/RenderCompareDialog";
import { api } from "@/api/client";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToasts } from "@/lib/adminToast";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const BADGE = {
  approved: ["تأییدشده", "border-primary/60 text-primary"],
  rejected: ["ردشده", "border-destructive/60 text-destructive"],
} as const;

interface CurtainModelRow {
  id: string;
  code: string;
  name: string;
  image?: string;
  install_image?: string;
  install_status?: string;
  install_score?: number | null;
  install_review?: string;
  category_slug?: string;
  categorySlug?: string;
  subcategory?: string;
  fabric?: string;
  mechanism?: string;
}

export function InstallReviewManager() {
  const [rows, setRows] = useState<CurtainModelRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [compare, setCompare] = useState<CurtainModelRow | null>(null);

  // Confirmation dialogs for approve/reject/regenerate
  const {
    confirm,
    dialogState: approveDialogState,
    handleConfirm: handleApproveConfirm,
    handleCancel: handleApproveCancel,
  } = useConfirmation();
  const {
    confirm: confirmReject,
    dialogState: rejectDialogState,
    handleConfirm: handleRejectConfirm,
    handleCancel: handleRejectCancel,
  } = useConfirmation();
  const {
    confirm: confirmRegenerate,
    dialogState: regenerateDialogState,
    handleConfirm: handleRegenerateConfirm,
    handleCancel: handleRegenerateCancel,
  } = useConfirmation();

  const reload = useCallback(() => {
    api.entities.CurtainModel.list("-updated_date", 200)
      .then((all) =>
        setRows(
          (Array.isArray(all) ? all : [])
            .map((x) => x as CurtainModelRow)
            .filter((m: CurtainModelRow) => Boolean(m.install_image))
        )
      )
      .catch((err) => console.error("Failed to load models:", apiErrorMessage(err)));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const act = useCallback(async (id: string, task: () => Promise<void>) => {
    setBusy(id);
    try {
      await task();
      await reload();
    } catch (err) {
      console.error("Action failed:", apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }, [reload]);

  const setStatus = (m: CurtainModelRow, install_status: string) =>
    act(m.id, () => api.entities.CurtainModel.update(m.id, { install_status }) as Promise<void>);

  const regenerate = (m: CurtainModelRow) =>
    act(m.id, () => api.functions.invoke("generateInstallImage", { model_id: m.id, regenerate: true }) as Promise<void>);

  const handleApprove = async (m: CurtainModelRow) => {
    const confirmed = await confirm({
      title: "تأیید نمای نصب",
      description: `آیا مطمئن هستید که می‌خواهید نمای نصب مدل «${m.code}» تأیید شود؟ این نما برای مشتریان قابل مشاهده خواهد بود.`,
      confirmLabel: "تأیید",
      cancelLabel: "انصراف",
      variant: "primary",
    });
    if (!confirmed) return;
    setStatus(m, "approved");
    adminToasts.approved("نمای نصب", m.code);
  };

  const handleReject = async (m: CurtainModelRow) => {
    const confirmed = await confirmReject({
      title: "رد نمای نصب",
      description: `آیا مطمئن هستید که می‌خواهید نمای نصب مدل «${m.code}» رد شود؟ این نما برای مشتریان مخفی می‌ماند.`,
      confirmLabel: "رد",
      cancelLabel: "انصراف",
      variant: "destructive",
    });
    if (!confirmed) return;
    setStatus(m, "rejected");
    adminToasts.rejected("نمای نصب", m.code);
  };

  const handleRegenerate = async (m: CurtainModelRow) => {
    const confirmed = await confirmRegenerate({
      title: "بازتولید نمای نصب",
      description: `آیا می‌خواهید نمای نصب مدل «${m.code}» مجدداً تولید شود؟ این کار می‌تواند چند لحظه طول بکشد.`,
      confirmLabel: "بازتولید",
      cancelLabel: "انصراف",
      variant: "warning",
    });
    if (!confirmed) return;
    regenerate(m);
    adminToasts.regenerated("نمای نصب", m.code);
  };

  if (!rows) {
    return (
      <div className="mt-6 flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
        <span className="eyebrow mb-2 block">بازبینی هوشمند نماهای واقعی</span>
        <p className="mb-4 text-xs leading-6 text-muted-foreground">
          هر نما قبل از نمایش با پارچهٔ اصلی و نمونه‌های اجراشدهٔ شما مقایسه می‌شود.
          فقط نماهای تأییدشده به مشتری نشان داده می‌شوند؛ تصمیم نهایی با شماست.
        </p>
        <p className="text-xs text-muted-foreground">هنوز نمایی ساخته نشده است.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <span className="eyebrow mb-2 block">بازبینی هوشمند نماهای واقعی</span>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">
        هر نما قبل از نمایش با پارچهٔ اصلی و نمونه‌های اجراشدهٔ شما مقایسه می‌شود (سازوکار، یراق‌آلات، تطابق پارچه، هم‌راستایی طرح، واقع‌گرایی).
        فقط نماهای تأییدشده به مشتری نشان داده می‌شوند؛ تصمیم نهایی با شماست.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m) => {
          const [label, cls] = BADGE[m.install_status as keyof typeof BADGE] || [
            "بازبینی‌نشده",
            "border-secondary text-muted-foreground",
          ];
          return (
            <div key={m.id} className="rounded-xl border border-secondary/60 bg-background p-2">
              <button
                type="button"
                onClick={() => setCompare(m)}
                className="flex w-full gap-2 text-right"
                title="مقایسه در کنار هم"
              >
                {m.install_image ? (
                  <img src={m.install_image} alt={m.code} className="aspect-[4/3] w-2/3 rounded-lg object-cover" />
                ) : (
                  <div className="aspect-[4/3] w-2/3 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {m.image && (
                  <img src={m.image} alt="پارچهٔ اصلی" className="aspect-square w-1/3 self-start rounded-lg object-cover" />
                )}
              </button>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">{m.code}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${cls}`}>
                  {label}{m.install_score != null && ` · ${m.install_score}/10`}
                </span>
              </div>
              {m.install_review && (
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{m.install_review}</p>
              )}
              <div className="mt-2 flex gap-1.5">
                {busy === m.id ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(m)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-primary/50 py-1.5 text-[10px] text-primary"
                    >
                      <Check className="h-3 w-3" /> تأیید
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(m)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-secondary/70 py-1.5 text-[10px] text-muted-foreground"
                    >
                      <X className="h-3 w-3" /> رد
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerate(m)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-secondary/70 py-1.5 text-[10px] text-muted-foreground"
                    >
                      <RefreshCw className="h-3 w-3" /> ساخت دوباره
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {approveDialogState.open && approveDialogState.options && (
        <ConfirmationDialog
          open={approveDialogState.open}
          onOpenChange={handleApproveCancel}
          title={approveDialogState.options.title}
          description={approveDialogState.options.description}
          confirmLabel={approveDialogState.options.confirmLabel}
          cancelLabel={approveDialogState.options.cancelLabel}
          variant={approveDialogState.options.variant}
          onConfirm={handleApproveConfirm}
          onCancel={handleApproveCancel}
        />
      )}

      {rejectDialogState.open && rejectDialogState.options && (
        <ConfirmationDialog
          open={rejectDialogState.open}
          onOpenChange={handleRejectCancel}
          title={rejectDialogState.options.title}
          description={rejectDialogState.options.description}
          confirmLabel={rejectDialogState.options.confirmLabel}
          cancelLabel={rejectDialogState.options.cancelLabel}
          variant={rejectDialogState.options.variant}
          onConfirm={handleRejectConfirm}
          onCancel={handleRejectCancel}
        />
      )}

      {regenerateDialogState.open && regenerateDialogState.options && (
        <ConfirmationDialog
          open={regenerateDialogState.open}
          onOpenChange={handleRegenerateCancel}
          title={regenerateDialogState.options.title}
          description={regenerateDialogState.options.description}
          confirmLabel={regenerateDialogState.options.confirmLabel}
          cancelLabel={regenerateDialogState.options.cancelLabel}
          variant={regenerateDialogState.options.variant}
          onConfirm={handleRegenerateConfirm}
          onCancel={handleRegenerateCancel}
        />
      )}

      <RenderCompareDialog model={compare} onClose={() => setCompare(null)} />
    </div>
  );
}