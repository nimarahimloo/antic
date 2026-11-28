"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Media, MediaListResponse } from "@/api";
import { api } from "@/api";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToast } from "@/lib/adminToast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Image,
  Upload,
  Search,
  CheckCircle2,
  Circle,
  Loader2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { OptimizedImage } from "@/components/ui/image";

const PAGE_SIZE = 24;

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "multi";
  max?: number;
  onSelect: (media: Media | Media[]) => void;
  accept?: string;
  title?: string;
}

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

function mimeAcceptLabel(accept: string | undefined): string {
  if (!accept) return "همه تصاویر";
  return accept.split(",").map((a) => a.trim()).join("، ");
}

// Minimal UploadCloud icon inline
function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" x2="12" y1="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 0 0 4 16.05" />
      <path d="M16 11.37A4 4 0 0 1 12.63 8 4 4 0 0 0 8.63 14 5 5 0 0 1 12 20a5 5 0 0 0 5-5v-2.63" />
    </svg>
  );
}

export function MediaPicker({
  open,
  onOpenChange,
  mode = "single",
  max,
  onSelect,
  accept,
  title = "انتخاب تصویر",
}: MediaPickerProps) {
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [items, setItems] = useState<Media[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [mimeFilter, setMimeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMedia, setSelectedMedia] = useState<Media[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSelection = mode === "multi" ? (max ?? 10) : 1;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res: MediaListResponse = await api.media.list({
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
    (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => {
    if (mode === "single") {
      (async () => {
        setSelectedIds(new Set());
        setSelectedMedia([]);
      })();
    }
  }, [open, mode]);

  const isSelected = (id: string) => selectedIds.has(id);

  const toggleSelect = (media: Media) => {
    if (isSelected(media.id)) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(media.id);
        return next;
      });
      setSelectedMedia((prev) => prev.filter((m) => m.id !== media.id));
    } else {
      if (mode === "single") {
        setSelectedIds(new Set([media.id]));
        setSelectedMedia([media]);
      } else {
        if (selectedMedia.length >= maxSelection) {
          adminToast("error", "حداکثر انتخاب", `بیش از ${maxSelection} مورد قابل انتخاب نیست.`);
          return;
        }
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.add(media.id);
          return next;
        });
        setSelectedMedia((prev) => [...prev, media]);
      }
    }
  };

  const handleConfirm = useCallback(() => {
    if (selectedMedia.length === 0) {
      adminToast("error", "انتخاب نشده", "لطفاً حداقل یک تصویر انتخاب کنید.");
      return;
    }
    onSelect(mode === "single" ? selectedMedia[0] : selectedMedia);
    onOpenChange(false);
  }, [selectedMedia, mode, onSelect, onOpenChange]);

  const handleUpload = async (file: File) => {
    if (!file.type?.startsWith("image/")) {
      adminToast("error", "نوع فایل نامعتبر", "فقط فایل تصویری مجاز است.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const media = await api.media.upload(compressed);
      adminToast("create", "بارگذاری رسانه", media.originalName);
      setTab("library");
      setOffset(0);
      setSearch("");
      setMimeFilter("");
      await load();
      setSelectedIds(new Set([media.id]));
      setSelectedMedia([media]);
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg);
      adminToast("error", "بارگذاری ناموفق", msg);
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    e.target.value = "";
    if (f) void handleUpload(f);
  };

  const selectedCount = selectedMedia.length;

  const renderMediaItem = (media: Media) => {
    const sel = isSelected(media.id);
    return (
      <div
        key={media.id}
        className="relative group rounded-xl border border-secondary/60 overflow-hidden cursor-pointer hover:border-primary transition-colors"
        onClick={() => toggleSelect(media)}
      >
        <OptimizedImage
          src={media.url}
          alt={media.originalName}
          fill
          className="object-cover aspect-[4/3]"
          sizes="160px"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {mode === "single" ? (
            <Circle className="h-6 w-6" />
          ) : (
            <div
              className={`flex items-center justify-center h-6 w-6 rounded-full border-2 ${
                sel ? "bg-primary border-primary text-primary-foreground" : "bg-white border-white/60"
              }`}
            >
              {sel ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur text-xs text-white">
          {media.width}×{media.height}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <div className="truncate font-body text-xs text-white">
              {media.originalName || media.filename}
            </div>
            {sel && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                {mode === "multi" ? selectedMedia.findIndex((m) => m.id === media.id) + 1 : "1"}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="hidden" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px] max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "multi"
              ? `تاکنون ${selectedCount} از ${maxSelection} تصویر انتخاب شده است`
              : "یک تصویر را از کتابخانه انتخاب کنید یا تصویر جدید بارگذاری کنید."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-secondary/60">
            <button
              onClick={() => setTab("library")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
                tab === "library" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image className="h-4 w-4" aria-hidden="true" /> کتابخانه رسانه
            </button>
            <button
              onClick={() => setTab("upload")}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
                tab === "upload" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground"
              }`}
            >
              <Upload className="h-4 w-4" /> آپلود از دستگاه ({mimeAcceptLabel(accept)})
            </button>
          </div>

          {/* Library Tab */}
          {tab === "library" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-3 flex items-center gap-3 border-b border-secondary/60 bg-background/30">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={() => {}}
                    type="search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setOffset(0);
                      setSelectedIds(new Set());
                      setSelectedMedia([]);
                    }}
                    placeholder="جستجو در کتابخانه…"
                    className="w-full rounded-lg border border-secondary/60 bg-background px-3 py-2 pl-9 text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <select
                  value={mimeFilter}
                  onChange={(e) => {
                    setMimeFilter(e.target.value);
                    setOffset(0);
                    setSelectedIds(new Set());
                    setSelectedMedia([]);
                  }}
                  className="rounded-lg border border-secondary/60 bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">همه فرمت‌ها</option>
                  {ALLOWED_MIMES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {error && (
                  <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[10px] text-destructive">
                    {error}
                  </div>
                )}
                {!items.length && !loading && !error ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-body text-xs text-muted-foreground">
                      تصویر یافت نشد.{search.trim() ? " تلاش کنید با کلمات کلیدی دیگری جستجو کنید." : " کتابخانه خالی است. از برگه آپلود تصویر جدید اضافه کنید."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map(renderMediaItem)}
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-secondary/60 bg-background/50 flex items-center justify-between">
                <div className="font-body text-xs text-muted-foreground">
                  نمایش {offset + 1}–{Math.min(offset + items.length, total)} از {total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
                    disabled={offset === 0 || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/60 text-xs text-foreground hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setOffset((p) => p + PAGE_SIZE)}
                    disabled={offset + items.length >= total || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/60 text-xs text-foreground hover:bg-secondary/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {tab === "upload" && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-sm mx-auto">
                <div
                  className="rounded-2xl border-2 border-dashed border-secondary/60 bg-card/40 p-12 text-center transition-colors hover:border-primary/60 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-3" />
                  ) : (
                    <UploadCloudIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  )}
                  <p className="font-display text-sm font-bold text-foreground mb-1">
                    {uploading ? "در حال بارگذاری…" : "تصویر را اینجا بکشید یا کلیک کنید"}
                  </p>
                  <p className="font-body text-[11px] text-muted-foreground mb-4">
                    فرمت‌ها: {mimeAcceptLabel(accept)} — حداکثر ۱۲ مگابایت
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept || "image/*"}
                    className="hidden"
                    disabled={uploading}
                    onChange={onFileChange}
                  />
                </div>
                {error && (
                  <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[10px] text-destructive">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {tab === "library" && selectedCount > 0 && (
            <div className="flex items-center gap-2 font-body text-xs text-primary">
              <CheckCircle2 className="h-4 w-4" /> {selectedCount} تصویر انتخاب شده
            </div>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="btn-ghost-gold"
            disabled={tab === "upload" && uploading}
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0 || (tab === "upload" && uploading)}
            className="btn-gold"
          >
            {selectedCount === 0 ? "انتخاب نشده" : mode === "multi" ? "تایید انتخاب" : "انتخاب تصویر"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
