"use client";

import { useEffect, useState } from "react";
import { Palette, Image as ImageIcon, Save, Upload, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToast } from "@/lib/adminToast";
import { OptimizedImage } from "@/components/ui/image";
import { RenderTemplateManager } from "@/components/admin/RenderTemplateManager";
import { InstallReferenceManager } from "@/components/admin/InstallReferenceManager";
import { InstallReviewManager } from "@/components/admin/InstallReviewManager";

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

export default function AdminWindowPage() {
  const [setting, setSetting] = useState<VirtualWindowSetting>(emptySetting());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

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

  async function uploadViewImage(file: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url || res?.path;
      if (!url) throw new Error("آپلود پاسخ معتبری نداد");
      setSetting((prev) => ({ ...prev, viewImage: url }));
      setHint("تصویر نمای آپلود شد؛ برای اعمال ذخیره کنید.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function updateField(key: keyof VirtualWindowSetting, value: string) {
    setSetting((prev) => ({ ...prev, [key]: value }));
    setError("");
  }

  async function save() {
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
        const created = (await api.entities.VirtualWindowSetting.create(payload)) as { id?: string } | null;
        if (created?.id) setSetting((prev) => ({ ...prev, id: String(created.id) }));
      }

      setHint("تنظیمات پنجره ذخیره شد.");
      adminToast("update", "تنظیمات پنجره", "رنگ دیواره، فریم، ریل و نمای");
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(msg);
      adminToast("error", "تنظیمات پنجره", msg);
    } finally {
      setSaving(false);
    }
  }

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
              تنظیم رنگ دیواره، فریم و ریل صdnهٔ پنجره + تصویر نمای (view) برای پیش‌نمایش مدل‌ها.
              قالب‌های رنگ سبز chroma و نمونه‌های اجراقعی را مدیریت می‌کند.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
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

        {/* Virtual Window Settings */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">رنگ‌های صdnهٔ پنجره</h2>
              <p className="font-body text-xs text-muted-foreground">ثبت رنگ پیش‌فرض برای رندر مدل‌های پرده</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { key: "wallColor" as keyof VirtualWindowSetting, label: "رنگ دیواره", value: setting.wallColor || "#75634f" },
              { key: "frameColor" as keyof VirtualWindowSetting, label: "رنگ فریم", value: setting.frameColor || "#3b352c" },
              { key: "railColor" as keyof VirtualWindowSetting, label: "رنگ ریل", value: setting.railColor || "#C9A227" },
            ].map((field) => (
              <div key={field.key} className="rounded-xl border border-secondary/60 bg-background p-4">
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">{field.label}</label>
                <div className="mt-2 relative">
                  <input
                    type="color"
                    value={field.value}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex h-10 w-full items-center justify-between rounded-xl border border-secondary bg-background/50 px-3 pr-10">
                    <span className="font-body text-xs font-medium text-foreground">{field.value}</span>
                    <div className="h-6 w-6 rounded-sm border border-secondary/60" style={{ backgroundColor: field.value }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* View Image */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-sm font-black text-foreground">تصویر نمای (View)</h2>
              <p className="font-body text-xs text-muted-foreground">تصویر نمای Background پنجره برای پیش‌نمایش.</p>
            </div>
          </div>

          <div className="rounded-xl border border-secondary/60 bg-background p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex h-32 w-48 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background/50">
                {setting.viewImage ? (
                  <OptimizedImage src={setting.viewImage} alt="نمای پنجره" fill className="object-cover" sizes="192px" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ImageIcon className="h-6 w-6 mb-2 opacity-50" />
                    <span className="font-body text-[10px]">بدون تصویر</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "آپلود…" : setting.viewImage ? "تعویض تصویر" : "انتخاب تصویر"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      e.target.value = "";
                      if (f) uploadViewImage(f);
                    }}
                  />
                </label>
                {setting.viewImage && (
                  <button
                    type="button"
                    onClick={() => updateField("viewImage", "")}
                    className="rounded-xl border border-secondary/70 px-3 py-2.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Chroma Templates */}
        <RenderTemplateManager />

        {/* Install References */}
        <InstallReferenceManager />

        {/* Install Review */}
        <InstallReviewManager />
      </div>
    </div>
  );
}
