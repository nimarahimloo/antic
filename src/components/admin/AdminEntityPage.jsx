import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, X, Loader2, Upload, Sparkles } from "lucide-react";
import { compressImage } from "@/lib/compressImage";
import { analyzeFabric } from "@/components/catalog/photo/fabricAnalyzer";
import { adminToast } from "@/lib/adminToast";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";
const WIDE_TYPES = ["textarea", "list", "sublist", "image", "gallery"];
const GALLERY_MAX = 20;

export default function AdminEntityPage({
  title,
  entity,
  fields,
  columns,
  options = {},
  sortBy = "-created_date",
  autoAnalyzeFabric = false,
}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [hint, setHint] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setTableError("");
    base44.entities[entity]
      .list(sortBy, 500)
      .then((data) => setRecords(data || []))
      .catch(() => setTableError("بارگذاری لیست ناموفق بود."))
      .finally(() => setLoading(false));
  }, [entity, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    const initial = {};
    fields.forEach((f) => {
      if (f.type === "boolean") initial[f.key] = f.default !== undefined ? !!f.default : false;
      else if (f.type === "gallery") initial[f.key] = [];
      else initial[f.key] = "";
    });
    setError("");
    setHint("");
    setForm(initial);
    setEditing({});
  }

  function openEdit(record) {
    const initial = {};
    fields.forEach((f) => {
      const v = record[f.key];
      if (f.type === "boolean") initial[f.key] = !!v;
      else if (f.type === "gallery") {
        if (Array.isArray(v)) initial[f.key] = v.slice(0, GALLERY_MAX);
        else if (typeof v === "string" && v.trim()) {
          try {
            const parsed = JSON.parse(v);
            initial[f.key] = (Array.isArray(parsed) ? parsed : []).slice(0, GALLERY_MAX);
          } catch {
            initial[f.key] = v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, GALLERY_MAX);
          }
        } else initial[f.key] = [];
      } else if (f.type === "list") initial[f.key] = Array.isArray(v) ? v.join(", ") : "";
      else if (f.type === "sublist")
        initial[f.key] = (Array.isArray(v) ? v : [])
          .map((s) => (s.slug && s.slug !== s.name ? `${s.name}:${s.slug}` : s.name))
          .join(", ");
      else initial[f.key] = v ?? "";
    });
    setError("");
    setHint("");
    setForm(initial);
    setEditing(record);
  }

  function closeModal() {
    setEditing(null);
    setError("");
    setHint("");
    setUploadingField(null);
  }

  async function submit(e) {
    e.preventDefault();
    const missing = fields.filter((f) => {
      if (!f.required) return false;
      if (f.type === "gallery") return !(Array.isArray(form[f.key]) && form[f.key].length);
      return !String(form[f.key] ?? "").trim();
    });
    if (missing.length) {
      setError("لطفاً فیلدهای الزامی را تکمیل کنید.");
      return;
    }
    const payload = {};
    fields.forEach((f) => {
      const v = form[f.key];
      if (f.type === "gallery") {
        payload[f.key] = (Array.isArray(v) ? v : []).filter(Boolean).slice(0, GALLERY_MAX);
      } else if (f.type === "list") {
        payload[f.key] = String(v || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (f.type === "sublist") {
        payload[f.key] = String(v || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((item) => {
            const [name, slug] = item.split(":").map((p) => p.trim());
            return slug
              ? { name, slug }
              : { name: item, slug: item.replace(/\s+/g, "-").toLowerCase() };
          });
      } else if (f.type === "number") {
        payload[f.key] = v === "" ? undefined : Number(v);
      } else if (f.type === "boolean") {
        payload[f.key] = !!v;
      } else {
        payload[f.key] = String(v ?? "").trim() === "" ? undefined : v;
      }
    });
    if (payload.code && !payload.name) payload.name = payload.code;
    setSaving(true);
    setError("");
    try {
      const isEdit = Boolean(editing?.id);
      if (isEdit) await base44.entities[entity].update(editing.id, payload);
      else await base44.entities[entity].create(payload);
      const detail = payload.name || payload.title || payload.code || payload.slug || "";
      adminToast(isEdit ? "update" : "create", title, detail);
      closeModal();
      load();
    } catch (err) {
      const msg = err?.data?.error || err?.message || "ذخیره ناموفق بود؛ دوباره تلاش کنید.";
      setError(msg);
      adminToast("error", title, msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(record) {
    const label = record[columns[0]?.key] ?? "این مورد";
    if (!window.confirm(`حذف «${label}»؟ این عمل بازگشت‌پذیر نیست.`)) return;
    try {
      await base44.entities[entity].delete(record.id);
      adminToast("delete", title, String(label));
      load();
    } catch {
      setTableError("حذف ناموفق بود.");
      adminToast("error", title, "حذف ناموفق بود.");
    }
  }

  async function applyFabricAnalysis(url) {
    if (!autoAnalyzeFabric || !url) return;
    setAnalyzing(true);
    try {
      const a = await analyzeFabric(url);
      if (!a) {
        setHint("تحلیل تصویر ممکن نشد؛ فیلدها را دستی پر کنید.");
        return;
      }
      setForm((f) => {
        const next = { ...f };
        if (a.material && !String(next.material || "").trim()) next.material = a.material;
        if (a.fabric && !String(next.fabric || "").trim()) next.fabric = a.fabric;
        if (a.texture && !String(next.texture || "").trim()) next.texture = a.texture;
        if (a.color && !String(next.color || "").trim()) next.color = a.color;
        if (a.colorHex && !a.isPatterned && !String(next.color_code || "").trim()) next.color_code = a.colorHex;
        if (a.isPatterned) next.color_code = "";
        if (next.code && !String(next.name || "").trim()) next.name = next.code;
        return next;
      });
      setHint(
        a.isPatterned
          ? `تشخیص: ${a.fabric} · ${a.texture} · ${a.color}`
          : `تشخیص: ${a.fabric} · ${a.texture} · ${a.color}${a.colorHex ? ` (${a.colorHex})` : ""}`
      );
    } catch {
      setHint("تحلیل تصویر ناموفق بود.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function uploadImage(fieldKey, file) {
    if (!file) return;
    setUploadingField(fieldKey);
    setError("");
    setHint("");
    try {
      const compressed = await compressImage(file);
      const res = await base44.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url;
      if (!url) throw new Error("آپلود پاسخ معتبری نداد");
      setForm((f) => ({ ...f, [fieldKey]: url }));
      if (fieldKey === "image" && autoAnalyzeFabric) await applyFabricAnalysis(url);
    } catch (err) {
      setError(err?.message || "آپلود تصویر ناموفق بود.");
    } finally {
      setUploadingField(null);
    }
  }

  async function uploadGallery(fieldKey, filesInput) {
    const files = Array.isArray(filesInput)
      ? filesInput.filter(Boolean)
      : Array.from(filesInput || []).filter(Boolean);
    if (!files.length) {
      setError("فایلی انتخاب نشد.");
      return;
    }
    setUploadingField(fieldKey);
    setError("");
    setHint("");
    try {
      const urls = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const uploader = base44?.integrations?.Core?.UploadPublicFile;
        if (typeof uploader !== "function") throw new Error("سرویس آپلود در دسترس نیست");
        const res = await uploader({ file: compressed });
        const url = res?.file_url || res?.url || res?.path;
        if (url) urls.push(url);
      }
      if (!urls.length) throw new Error("آپلود پاسخ معتبری نداد");
      setForm((f) => {
        const cur = Array.isArray(f[fieldKey]) ? f[fieldKey] : [];
        const next = [...cur, ...urls].slice(0, GALLERY_MAX);
        if (cur.length + urls.length > GALLERY_MAX) {
          setHint(`حداکثر ${GALLERY_MAX} تصویر؛ فقط ${next.length - cur.length} مورد اضافه شد.`);
        }
        return { ...f, [fieldKey]: next };
      });
    } catch (err) {
      setError(err?.message || "آپلود گالری ناموفق بود.");
    } finally {
      setUploadingField(null);
    }
  }

  const filtered = records.filter(
    (r) => !search.trim() || JSON.stringify(r).includes(search.trim())
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black text-foreground">{title}</h1>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            {loading ? "…" : `${records.length} مورد ثبت‌شده`}
          </p>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو…" className={`${inputCls} sm:w-56`} />
          <button type="button" onClick={openNew} className="btn-gold shrink-0">
            <Plus className="h-4 w-4" /> افزودن
          </button>
        </div>
      </div>

      {tableError && <p className="mb-4 font-body text-xs text-destructive">{tableError}</p>}

      <div className="overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-secondary/60">
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-right font-body text-xs text-muted-foreground">{c.label}</th>
                ))}
                <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center font-body text-sm text-muted-foreground">موردی یافت نشد.</td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr key={record.id} className="border-b border-secondary/40 last:border-0 hover:bg-background/40">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 align-middle font-body text-xs text-foreground">
                        {c.render ? c.render(record[c.key], record) : record[c.key] ?? "—"}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openEdit(record)} aria-label="ویرایش" className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => remove(record)} aria-label="حذف" className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4" onClick={closeModal}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="mx-auto my-8 w-full max-w-2xl rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8" noValidate>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-foreground">
                {editing?.id ? `ویرایش ${title}` : `افزودن ${title}`}
              </h3>
              <button type="button" onClick={closeModal} aria-label="بستن" className="flex h-9 w-9 items-center justify-center rounded-full border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={WIDE_TYPES.includes(f.type) ? "sm:col-span-2" : ""}>
                  <label className={labelCls}>
                    {f.label}
                    {f.required && <span className="text-primary"> *</span>}
                  </label>
                  {f.type === "select" ? (
                    <select
                      value={form[f.key] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((s) => {
                          const next = { ...s, [f.key]: val };
                          if (f.clearFields?.length) for (const k of f.clearFields) next[k] = "";
                          return next;
                        });
                      }}
                      className={inputCls}
                    >
                      <option value="">انتخاب کنید…</option>
                      {(typeof f.getOptions === "function" ? f.getOptions(form, options) : options[f.key] || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea rows={3} value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className={`${inputCls} resize-none`} />
                  ) : f.type === "boolean" ? (
                    <label className="flex cursor-pointer items-center gap-2.5 py-2">
                      <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.checked }))} className="h-4 w-4" style={{ accentColor: "#C9A227" }} />
                      <span className="font-body text-xs text-foreground">{f.placeholder || "فعال"}</span>
                    </label>
                  ) : f.type === "image" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
                        {form[f.key] ? <img src={form[f.key]} alt="" className="h-full w-full object-cover" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary">
                          {uploadingField === f.key || (f.key === "image" && analyzing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {uploadingField === f.key ? "آپلود…" : analyzing && f.key === "image" ? "تحلیل…" : form[f.key] ? "تعویض" : "انتخاب تصویر"}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={uploadingField === f.key || analyzing} onChange={(e) => { const file = e.target.files?.[0] || null; e.target.value = ""; if (file) uploadImage(f.key, file); }} />
                        </label>
                        {form[f.key] && (
                          <button type="button" onClick={() => setForm((s) => ({ ...s, [f.key]: "" }))} className="rounded-xl border border-secondary/70 px-3 py-2.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive">حذف</button>
                        )}
                      </div>
                    </div>
                  ) : f.type === "gallery" ? (
                    <div className="space-y-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary">
                        {uploadingField === f.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploadingField === f.key ? "آپلود…" : "افزودن تصاویر"}
                        <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingField === f.key} onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; if (files.length) uploadGallery(f.key, files); }} />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(form[f.key]) ? form[f.key] : []).map((url, i) => (
                          <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-secondary/60">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button type="button" className="absolute inset-0 bg-black/50 text-[10px] text-white opacity-0 hover:opacity-100" onClick={() => setForm((s) => ({ ...s, [f.key]: (s[f.key] || []).filter((_, j) => j !== i) }))}>حذف</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : f.type === "list" || f.type === "sublist" ? (
                    <input type="text" value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder || "با ویرگول جدا کنید"} className={inputCls} />
                  ) : (
                    <input type={f.type === "number" ? "number" : "text"} value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} className={inputCls} />
                  )}
                </div>
              ))}
            </div>

            {hint && (
              <p className="mt-4 flex items-center gap-2 font-body text-xs text-primary">
                <Sparkles className="h-3.5 w-3.5" /> {hint}
              </p>
            )}
            {error && <p className="mt-3 font-body text-xs text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="btn-ghost-gold">انصراف</button>
              <button type="submit" disabled={saving} className="btn-gold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing?.id ? "ذخیره تغییرات" : "ثبت"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
