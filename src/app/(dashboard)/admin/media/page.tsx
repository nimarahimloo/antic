"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, Image as ImageIcon, Upload, Search, Filter, Plus } from "lucide-react";
import { api, type Media } from "@/api";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToast, adminToasts } from "@/lib/adminToast";
import { OptimizedImage } from "@/components/ui/image";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const PAGE_SIZE = 24;

export default function AdminMediaLibraryPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Confirmation dialogs for delete/force delete
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();

  const ALLOWED_MIMES: string[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/vnd.microsoft.icon",
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.media.list({
        limit: PAGE_SIZE,
        offset,
        search: search.trim() || undefined,
        mimeType: mimeFilter || undefined,
        sort_by: "-createdAt",
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [offset, search, mimeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = (media: Media | Media[]) => {
    const list = Array.isArray(media) ? media : [media];
    if (list.length === 0) return;
    adminToasts.uploaded("انتخاب از کتابخانه", `${list.length} تصویر انتخاب شد`);
    setPickerOpen(false);
    // Refresh to reflect any newly uploaded media
    setOffset(0);
    setSearch("");
    setMimeFilter("");
    void load();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "حذف رسانه",
      description: "این تصویر را حذف کنید؟ اگر در جای‌های دیگری استفاده شده باشد، حذف ممکن نیست (خطای ۴۰۹ دریافت خواهید کرد). برای حذف قوالی از دکمه «حذف قوالی» استفاده کنید.",
      confirmLabel: "حذف",
      cancelLabel: "انصراف",
      variant: "destructive",
    });
    if (!confirmed) return;

    setDeleting(id);
    try {
      await api.media.delete(id);
      adminToasts.deleted("رسانه", "");
      void load();
    } catch (e) {
      // 409 = in use
      const err = e as { status?: number; data?: { usages?: unknown[] }; message?: string };
      if (err.status === 409) {
        const usages = err.data?.usages || [];
        const list = Array.isArray(usages)
          ? usages
              .map((u: unknown) => {
                const ui = u as { entityType?: string; entityId?: string; fieldName?: string };
                return `${ui.entityType ?? ""}.${ui.fieldName ?? ""}`;
              })
              .join(", ")
          : String(err.message);
        setError(`نمی‌توان حذف کرد چون در جای‌های دیگری استفاده شده است: ${list}`);
      } else {
        setError(apiErrorMessage(e));
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleForceDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "حذف قوالی رسانه",
      description: "مطمئن هستید؟ این تصویر قوالی از همه جای‌های استفاده‌شده حذف می‌شود. این کار بازگشت‌پذیر نیست.",
      confirmLabel: "حذف قوالی",
      cancelLabel: "انصراف",
      variant: "destructive",
    });
    if (!confirmed) return;

    setDeleting(id);
    try {
      await api.media.delete(id, true);
      adminToasts.deleted("رسانه", "قوالی");
      void load();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdate = async (media: Media, field: "alt" | "caption" | "title", value: string) => {
    try {
      await api.media.update(media.id, { [field]: value });
      setItems((prev) => prev.map((m) => (m.id === media.id ? { ...m, [field]: value } : m)));
      adminToasts.updated("رسانه", media.originalName || media.filename);
    } catch (e) {
      adminToast("error", "به‌روزرسانی ناموفق", apiErrorMessage(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-foreground">کتابخانه رسانه</h1>
          <p className="font-body text-xs text-muted-foreground">
            تمام تصاویر آپلود‌شده در اینجا ذخیره می‌شوند و قابل استفاده مجدد در تمامی بخش‌های سایت هستند.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="btn-gold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> افزودن جدید
          </button>
          <MediaPicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            mode="multi"
            onSelect={handleSave}
            title="انتخاب تصویر از کتابخانه"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[10px] text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder="جستجو بر اساس نام فایل، توضیحات…"
            className="w-full rounded-lg border border-secondary/60 bg-background px-3 py-2 pl-9 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={mimeFilter}
          onChange={(e) => {
            setMimeFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-secondary/60 bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
        >
          <option value="">همه فرمت‌ها</option>
          {ALLOWED_MIMES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-secondary/60 bg-card overflow-hidden">
        {loading && (
          <div className="p-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-body text-xs text-muted-foreground">در حال بارگذاری…</p>
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-body text-xs text-muted-foreground">
              رسانه‌ای یافت نشد. تصویر جدید اضافه کنید.
            </p>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
            {items.map((media) => (
              <div
                key={media.id}
                className="relative rounded-xl border border-secondary/60 overflow-hidden group"
              >
                <OptimizedImage
                  src={media.url}
                  alt={media.originalName}
                  fill
                  className="object-cover aspect-[4/3]"
                  sizes="160px"
                />
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur text-xs text-white">
                  {media.width}×{media.height}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="flex items-center justify-between text-xs text-white">
                    <div className="truncate">{media.originalName || media.filename}</div>
                    <span>{Math.round((media.size || 0) / 1024)}KB</span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={media.alt || ""}
                      onChange={(e) => void handleUpdate(media, "alt", e.target.value)}
                      placeholder="متن جایگزین (alt)"
                      className="rounded border border-secondary/60 bg-background px-2 py-1 text-[10px] text-foreground focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(media.id)}
                        disabled={deleting === media.id}
                        className="flex h-6 w-6 items-center justify-center rounded border border-destructive/20 text-[10px] text-destructive hover:bg-destructive/5 disabled:opacity-40"
                        aria-label="حذف"
                      >
                        {deleting === media.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                      {(media.usageCount ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleForceDelete(media.id)}
                          className="flex h-6 w-6 items-center justify-center rounded border border-accent/20 text-[10px] text-accent hover:bg-accent/5"
                          aria-label="حذف قوالی"
                          title="این رسانه در جای‌های دیگری استفاده شده است"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">
                     {media.usageCount ?? 0} استفاده
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-secondary/60 bg-background/50">
          <div className="font-body text-xs text-muted-foreground">
            نمایش {offset + 1}–{Math.min(offset + items.length, total)} از {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
              disabled={offset === 0 || loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/60 text-xs text-foreground hover:bg-secondary/50 disabled:opacity-40"
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOffset((p) => p + PAGE_SIZE)}
              disabled={offset + items.length >= total || loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/60 text-xs text-foreground hover:bg-secondary/50 disabled:opacity-40"
            >
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {dialogState.open && dialogState.options && (
        <ConfirmationDialog
          open={dialogState.open}
          onOpenChange={handleCancel}
          title={dialogState.options.title}
          description={dialogState.options.description}
          confirmLabel={dialogState.options.confirmLabel}
          cancelLabel={dialogState.options.cancelLabel}
          variant={dialogState.options.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multi"
        onSelect={handleSave}
        title="انتخاب تصویر از کتابخانه"
      />
    </div>
  );
}