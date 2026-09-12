import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import VirtualWindow from "@/components/catalog/VirtualWindow";
import { Loader2, Upload, X } from "lucide-react";

const PREVIEW_FABRIC = { id: "preview", category_slug: "silk", color_code: "#DCC9A4" };
const DEFAULTS = { wall_color: "#75634f", frame_color: "#3b352c", rail_color: "#C9A227", view_image: "" };

export default function AdminWindowSettings() {
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    base44.entities.VirtualWindowSetting
      .list("-created_date", 5)
      .then((data) => {
        const rec = data?.[0];
        if (rec) {
          setRecord(rec);
          setForm({
            wall_color: rec.wall_color || DEFAULTS.wall_color,
            frame_color: rec.frame_color || DEFAULTS.frame_color,
            rail_color: rec.rail_color || DEFAULTS.rail_color,
            view_image: rec.view_image || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function uploadView(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      set("view_image", file_url);
    } catch {
      setError("آپلود تصویر ناموفق بود.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (record?.id) {
        await base44.entities.VirtualWindowSetting.update(record.id, form);
      } else {
        const created = await base44.entities.VirtualWindowSetting.create(form);
        setRecord(created);
      }
      setMessage("تنظیمات ذخیره شد و روی پنجرهٔ مجازی کل سایت اعمال می‌شود.");
    } catch {
      setError("ذخیره ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">پنجرهٔ مجازی</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">
        رنگ دیوار، چهارچوب، میلهٔ پرده و چشم‌انداز صحنه را مدیریت کنید؛ تغییرات بلافاصله در کاتالوگ اعمال می‌شود.
      </p>

      {/* پیش‌نمایش زنده */}
      <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
        <span className="eyebrow mb-3 block">پیش‌نمایش زنده</span>
        <VirtualWindow fabric={PREVIEW_FABRIC} settings={form} />
      </div>

      <form onSubmit={save} className="mt-6 rounded-2xl border border-secondary/60 bg-card p-6 lg:p-8">
        <div className="grid gap-5 sm:grid-cols-3">
          <ColorField label="رنگ دیوار" value={form.wall_color} onChange={(v) => set("wall_color", v)} />
          <ColorField label="رنگ چهارچوب پنجره" value={form.frame_color} onChange={(v) => set("frame_color", v)} />
          <ColorField label="رنگ ریل و میلهٔ پرده" value={form.rail_color} onChange={(v) => set("rail_color", v)} />
        </div>

        <div className="mt-6">
          <label className="mb-1.5 block font-body text-xs text-muted-foreground">چشم‌انداز پشت پنجره</label>
          <div className="flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
              {form.view_image ? (
                <img src={form.view_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.view_image}
                  onChange={(e) => set("view_image", e.target.value)}
                  placeholder="آدرس تصویر چشم‌انداز یا آپلود…"
                  className="w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-xs text-foreground outline-none focus:border-primary"
                />
                {form.view_image && (
                  <button
                    type="button"
                    onClick={() => set("view_image", "")}
                    aria-label="حذف تصویر"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-secondary/70 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-secondary/70 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "در حال آپلود…" : "آپلود چشم‌انداز"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadView(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        </div>

        {message && <p className="mt-5 font-body text-xs text-primary">{message}</p>}
        {error && <p className="mt-5 font-body text-xs text-destructive">{error}</p>}

        <button type="submit" disabled={saving || uploading} className="btn-gold mt-6 w-full justify-center disabled:opacity-60 sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره تنظیمات"}
        </button>
      </form>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block font-body text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-secondary bg-transparent p-1"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          className="w-full rounded-xl border border-secondary bg-background px-3 py-2.5 font-body text-xs text-foreground outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}