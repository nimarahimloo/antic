"use client";

import { useCallback, useEffect, useState } from "react";
import { Palette, Image as ImageIcon, Save, Upload, Loader2, Image as LibImage } from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToast, adminToasts } from "@/lib/adminToast";
import { OptimizedImage } from "@/components/ui/image";
import { RenderTemplateManager } from "@/components/admin/RenderTemplateManager";
import { InstallReferenceManager } from "@/components/admin/InstallReferenceManager";
import { InstallReviewManager } from "@/components/admin/InstallReviewManager";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface VirtualWindowSetting {
  id: string;
  wallColor?: string;
  frameColor?: string;
  railColor?: string;
  viewImage?: string;
  created_date?: string;
  updated_date?: string;
}

function emptySetting(): VirtualWindowSetting {
  return {
    id: "",
    wallColor: "#75634f",
    frameColor: "#3b352c",
    railColor: "#C9A227",
    viewImage: "",
  };
}

/** رنگ‌های ص  پنجره (دیوار، فریم، ریل) */
function WindowColorsPanel({
  setting,
  onUpdate,
  saving,
}: {
  setting: VirtualWindowSetting;
  onUpdate: (key: keyof VirtualWindowSetting, value: string) => void;
  saving: boolean;
}) {
  const fields = [
    { key: "wallColor" as keyof VirtualWindowSetting, label: "رنگ دیواره", defaultValue: "#75634f" },
    { key: "frameColor" as keyof VirtualWindowSetting, label: "رنگ فریم", defaultValue: "#3b352c" },
    { key: "railColor" as keyof VirtualWindowSetting, label: "رنگ ریل", defaultValue: "#C9A227" },
  ];

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
          <Palette className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-sm font-black text-foreground">رنگ‌های پنجره</h2>
          <p className="font-body text-xs text-muted-foreground">
            رنگ پیش‌فرض برای رندر مدل‌های پرده در نمای نصب
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {fields.map((field) => {
          const value = setting[field.key] || field.defaultValue;
          return (
            <div key={field.key} className="rounded-xl border border-secondary/60 bg-background p-4">
              <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                {field.label}
              </label>
              <div className="mt-2 relative">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => onUpdate(field.key, e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex h-10 w-full items-center justify-between rounded-xl border border-secondary bg-background/50 px-3 pr-10">
                  <span className="font-body text-xs font-medium text-foreground">{value}</span>
                  <div
                    className="h-6 w-6 rounded-sm border border-secondary/60"
                    style={{ backgroundColor: value }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** آپلود و مدیریت تصویر نمای (view) پنجره */
function ViewImagePanel({
  viewImage,
  onUpdate,
  uploading,
}: {
  viewImage: string;
  onUpdate: (value: string) => void;
  uploading: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      const media = await api.media.upload(compressed);
      const url = media.url;
      if (!url) throw new Error("آپلود پاسخ معتبری نداد");
      onUpdate(url);
    } catch (e) {
      const msg = apiErrorMessage(e);
      adminToast("error", "تصویر نمای", msg);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    e.target.value = "";
    if (f) handleUpload(f);
  };

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
          <ImageIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-sm font-black text-foreground">تصویر نمای (View)</h2>
          <p className="font-body text-xs text-muted-foreground">
            تصویر Background پنجره برای پیش‌نمایش مدل‌ها
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-secondary/60 bg-background p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex h-32 w-48 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background/50">
            {viewImage ? (
              <OptimizedImage src={viewImage} alt="نمای پنجره" fill className="object-cover" sizes="192px" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ImageIcon className="h-6 w-6 mb-2 opacity-50" />
                <span className="font-body text-[10px]">بدون تصویر</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary hover:bg-primary/10 transition-colors ${
                  uploading ? "disabled:opacity-50 disabled:cursor-not-allowed" : ""
                }`}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "آپلود…" : viewImage ? "تعویض تصویر" : "انتخاب تصویر"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={onFileChange}
                />
              </label>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-secondary/60 bg-secondary/5 px-2 py-2.5 font-body text-[10px] text-muted-foreground hover:border-primary/60 hover:text-primary"
                disabled={uploading}
              >
                <LibImage className="h-3 w-3" />
              </button>
            </div>
            {viewImage && (
              <button
                type="button"
                onClick={() => onUpdate("")}
                className="rounded-xl border border-secondary/70 px-3 py-2.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
              >
                حذف
              </button>
            )}
          </div>
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="single"
        onSelect={(selected) => {
          const media = Array.isArray(selected) ? selected[0] : selected;
          if (media) onUpdate(media.url);
        }}
        title="انتخاب تصویر نمای از کتابخانه"
      />
    </Card>
  );
}

export default function AdminWindowPage() {
  const [setting, setSetting] = useState<VirtualWindowSetting>(emptySetting());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  // Confirmation for save
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rows = (await api.entities.VirtualWindowSetting.list("-created_date", 1)) as VirtualWindowSetting[];
        if (cancelled) return;
        if (rows.length) {
          setSetting(rows[0]);
        } else {
          setSetting(emptySetting());
        }
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = useCallback(
    (key: keyof VirtualWindowSetting, value: string) => {
      setSetting((prev) => ({ ...prev, [key]: value }));
      setError("");
    },
    []
  );

  const handleSave = useCallback(async () => {
    const confirmed = await confirm({
      title: "ذخیره تنظیمات پنجره",
      description: "آیا می‌خواهید تغییرات رنگ‌های پنجره و تصویر نمای ذخیره شود؟",
      confirmLabel: "ذخیره",
      cancelLabel: "انصراف",
      variant: "primary",
    });
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setHint("");
    try {
      const payload = {
        wall_color: setting.wallColor || null,
        frame_color: setting.frameColor || null,
        rail_color: setting.railColor || null,
        view_image: setting.viewImage || null,
      };

      if (setting.id) {
        await api.entities.VirtualWindowSetting.update(setting.id, payload);
      } else {
        const created = (await api.entities.VirtualWindowSetting.create(payload)) as {
          id?: string;
        } | null;
        if (created?.id) {
          setSetting((prev) => ({ ...prev, id: String(created.id) }));
        }
      }

      setHint("تنظیمات پنجره ذخیره شد.");
      adminToasts.settingsSaved("تنظیمات پنجره");
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg);
      adminToast("error", "تنظیمات پنجره", msg);
    } finally {
      setSaving(false);
    }
  }, [setting]);

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">قالب نصب و تنظیمات پنجره</h1>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              تنظیم رنگ دیواره، فریم و ریل ص  پنجره + تصویر نمای (view) برای پیش‌نمایش مدل‌ها.
              قالب‌های رنگ سبز chroma و نمونه‌های نصب را مدیریت می‌کند.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "ذخیره…" : "ذخیره تنظیمات"}
          </button>
        </div>

        {(error || hint) && (
          <p className={`mb-6 font-body text-xs ${error ? "text-destructive" : "text-primary"}`}>
            {error || hint}
          </p>
        )}

        <WindowColorsPanel setting={setting} onUpdate={updateField} saving={saving} />
        <ViewImagePanel
          viewImage={setting.viewImage || ""}
          onUpdate={(value) => updateField("viewImage", value)}
          uploading={uploading}
        />

        {/* قالب‌های رنگ سبز (chroma templates) */}
        <RenderTemplateManager />

        {/* نمونه‌های نصب (install references) */}
        <InstallReferenceManager />

        {/* بازبینی نصب (install review) */}
        <InstallReviewManager />

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
      </div>
    </div>
  );
}