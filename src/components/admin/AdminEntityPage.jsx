import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, X, Loader2, Upload } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";
const WIDE_TYPES = ["textarea", "list", "sublist", "image"];

/**
 * AdminEntityPage — CRUD عمومی برای موجودیت‌های دیتابیس.
 * fields: [{ key, label, type, required, placeholder, help }]
 *  انواع پشتیبانی‌شده: text (پیش‌فرض)، textarea، number، date، boolean، image (با آپلود)،
 *  list (آرایه از متن با کاما)، sublist (آرایه آبجکت {name,slug})، select (با options)
 * columns: [{ key, label, render? }]
 */
export default function AdminEntityPage({ title, entity, fields, columns, options = {}, sortBy = "-created_date" }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setTableError("");
    base44.entities[entity]
      .list(sortBy, 500)
      .then((data) => setRecords(data || []))
      .catch(() => setTableError("بارگذاری لیست ناموفق بود."))
      .finally(() => setLoading(false));
  }, [entity, sortBy]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    const initial = {};
    fields.forEach((f) => {
      if (f.type === "boolean") initial[f.key] = false;
      else if (f.type === "select") initial[f.key] = options[f.key]?.[0]?.value ?? "";
      else initial[f.key] = "";
    });
    setError("");
    setForm(initial);
    setEditing({});
  }

  function openEdit(record) {
    const initial = {};
    fields.forEach((f) => {
      const v = record[f.key];
      if (f.type === "boolean") initial[f.key] = !!v;
      else if (f.type === "list") initial[f.key] = Array.isArray(v) ? v.join(", ") : "";
      else if (f.type === "sublist")
        initial[f.key] = (Array.isArray(v) ? v : [])
          .map((s) => (s.slug && s.slug !== s.name ? `${s.name}:${s.slug}` : s.name))
          .join(", ");
      else initial[f.key] = v ?? "";
    });
    setError("");
    setForm(initial);
    setEditing(record);
  }

  function closeModal() {
    setEditing(null);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    const missing = fields.filter((f) => f.required && !String(form[f.key] ?? "").trim());
    if (missing.length) {
      setError("لطفاً فیلدهای الزامی را تکمیل کنید.");
      return;
    }
    const payload = {};
    fields.forEach((f) => {
      const v = form[f.key];
      if (f.type === "list") {
        payload[f.key] = String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
      } else if (f.type === "sublist") {
        payload[f.key] = String(v || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((item) => {
            const [name, slug] = item.split(":").map((p) => p.trim());
            return slug ? { name, slug } : { name: item, slug: item.replace(/\s+/g, "-").toLowerCase() };
          });
      } else if (f.type === "number") {
        payload[f.key] = v === "" ? undefined : Number(v);
      } else if (f.type === "boolean") {
        payload[f.key] = !!v;
      } else {
        payload[f.key] = String(v ?? "").trim() === "" ? undefined : v;
      }
    });
    setSaving(true);
    setError("");
    try {
      if (editing?.id) await base44.entities[entity].update(editing.id, payload);
      else await base44.entities[entity].create(payload);
      closeModal();
      load();
    } catch {
      setError("ذخیره ناموفق بود؛ دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(record) {
    if (!window.confirm(`حذف «${record[columns[0].key] ?? "این مورد"}»؟ این عمل بازگشت‌پذیر نیست.`)) return;
    try {
      await base44.entities[entity].delete(record.id);
      load();
    } catch {
      setTableError("حذف ناموفق بود.");
    }
  }

  async function uploadImage(fieldKey, file) {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: compressed });
      setForm((f) => ({ ...f, [fieldKey]: file_url }));
    } catch {
      setError("آپلود تصویر ناموفق بود. عکس را بررسی و دوباره تلاش کنید.");
    } finally {
      setUploading(false);
    }
  }

  const filtered = records.filter((r) => !search.trim() || JSON.stringify(r).includes(search.trim()));

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
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو…"
            className={`${inputCls} sm:w-56`}
          />
          <button onClick={openNew} className="btn-gold shrink-0">
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
                  <th key={c.key} className="px-4 py-3 text-right font-body text-xs text-muted-foreground">
                    {c.label}
                  </th>
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
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center font-body text-sm text-muted-foreground">
                    موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr key={record.id} className="border-b border-secondary/40 transition-colors last:border-0 hover:bg-background/40">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 align-middle font-body text-xs text-foreground">
                        {c.render ? c.render(record[c.key], record) : (record[c.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(record)}
                          aria-label="ویرایش"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(record)}
                          aria-label="حذف"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                        >
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
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto my-8 w-full max-w-2xl rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-foreground">
                {editing?.id ? `ویرایش ${title}` : `افزودن ${title}`}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="بستن"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-secondary/70 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
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
                      value={form[f.key]}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">انتخاب کنید…</option>
                      {(options[f.key] || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={form[f.key]}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={`${inputCls} resize-none`}
                    />
                  ) : f.type === "boolean" ? (
                    <label className="flex cursor-pointer items-center gap-2.5 py-2">
                      <input
                        type="checkbox"
                        checked={!!form[f.key]}
                        onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.checked }))}
                        className="h-4 w-4"
                        style={{ accentColor: "#C9A227" }}
                      />
                      <span className="font-body text-xs text-foreground">{f.placeholder || "فعال"}</span>
                    </label>
                  ) : f.type === "date" ? (
                    <input
                      type="date"
                      value={form[f.key] ? String(form[f.key]).slice(0, 10) : ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      className={inputCls}
                    />
                  ) : f.type === "image" ? (
                    <div className="flex items-start gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
                        {form[f.key] ? (
                          <img src={form[f.key]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Upload className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="url"
                          value={form[f.key]}
                          onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                          placeholder="آدرس تصویر یا آپلود…"
                          className={inputCls}
                        />
                        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-secondary/70 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {uploading ? "در حال آپلود…" : "آپلود تصویر"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => uploadImage(f.key, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={form[f.key]}
                      onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={inputCls}
                    />
                  )}

                  {f.help && <p className="mt-1 font-body text-[10px] text-muted-foreground">{f.help}</p>}
                </div>
              ))}
            </div>

            {error && <p className="mt-4 font-body text-xs text-destructive">{error}</p>}

            <div className="mt-7 flex gap-3">
              <button type="submit" disabled={saving || uploading} className="btn-gold flex-1 justify-center disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </button>
              <button type="button" onClick={closeModal} className="btn-ghost-gold justify-center">
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}