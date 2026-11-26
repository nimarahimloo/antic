"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/api/client";
import { Plus, Pencil, Trash2, X, Loader2, Upload, Sparkles, Image } from "lucide-react";
import { compressImage } from "@/lib/compressImage";
import { analyzeFabric } from "@/components/catalog/photo/fabricAnalyzer";
import { adminToast } from "@/lib/adminToast";
import { apiErrorMessage } from "@/lib/apiError";
import { OptimizedImage, ThumbnailImage } from "@/components/ui/image";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useConfirmation } from "@/hooks/useConfirmation";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import CategoryTreeSelector from "@/components/admin/CategoryTreeSelector";

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";
const WIDE_TYPES = ["textarea", "list", "sublist", "image", "gallery", "multiselect"];
const GALLERY_MAX = 20;

interface FieldConfig {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "select" | "textarea" | "boolean" | "image" | "gallery" | "list" | "sublist" | "multiselect" | "tree" | string;
  placeholder?: string;
  default?: unknown;
  getOptions?: (form: Record<string, unknown>, options: Record<string, unknown>) => Array<{ value: string; label: string }>;
  // For tree type: compute initial value from the record being edited
  getInitialValue?: (record: Record<string, unknown>) => unknown;
  clearFields?: string[];
  // For multiselect: fetch options from an API endpoint
  optionsApi?: string;
  // Display field for selected items
  optionLabel?: string;
  optionValue?: string;
  // For tree type: pre-computed hierarchical options { value, label, parentSlug?, level? }
  treeOptions?: Array<{ value: string; label: string; parentSlug?: string | null; level?: number }>;
  // For tree type: slug of the category being edited (excluded from selection to prevent cycles)
  excludeSlug?: string | null;
  // For tree type: descendant slugs of the category being edited (cycle prevention)
  descendantSlugs?: Set<string>;
}

interface ColumnConfig {
  key: string;
  label: string;
  render?: (value: unknown, record: Record<string, unknown>) => React.ReactNode;
}

interface AdminEntityPageProps {
  title: string;
  entity: string;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  options?: Record<string, Array<{ value: string; label: string }>>;
  // For tree fields: map of categoryId → descendant slugs (cycle prevention)
  descendantSlugs?: Record<string, Set<string>>;
  sortBy?: string;
  autoAnalyzeFabric?: boolean;
}

export default function AdminEntityPage({
  title,
  entity,
  fields,
  columns,
  options = {},
  descendantSlugs = {},
  sortBy = "-created_date",
  autoAnalyzeFabric = false,
}: AdminEntityPageProps) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"single" | "multi">("single");
  const [pickerFieldKey, setPickerFieldKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [hint, setHint] = useState("");

  // Confirmation dialog for delete operations
  const { confirm, dialogState, handleConfirm, handleCancel } = useConfirmation();

  const load = useCallback(() => {
    setLoading(true);
    setTableError("");
    api.entities[entity as keyof typeof api.entities]
      .list(sortBy, 500)
      .then((data) => setRecords((data || []) as Record<string, unknown>[]))
      .catch((err) => setTableError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [entity, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    const initial: Record<string, unknown> = {};
    fields.forEach((f) => {
      if (f.type === "boolean") initial[f.key] = f.default !== undefined ? !!f.default : false;
      else if (f.type === "gallery") initial[f.key] = [];
      else initial[f.key] = "";
    });
    setError("");
    setHint("");
    setForm(initial);
    setEditing({} as Record<string, unknown>);
  }

  function openEdit(record: Record<string, unknown>) {
    const initial: Record<string, unknown> = {};
    fields.forEach((f) => {
      const v = record[f.key];
      if (f.getInitialValue) {
        initial[f.key] = f.getInitialValue(record);
      } else if (f.type === "boolean") {
        initial[f.key] = !!v;
      } else if (f.type === "gallery") {
        if (Array.isArray(v)) initial[f.key] = v.slice(0, GALLERY_MAX);
        else if (typeof v === "string" && v.trim()) {
          try {
            const parsed = JSON.parse(v);
            initial[f.key] = (Array.isArray(parsed) ? parsed : []).slice(0, GALLERY_MAX);
          } catch {
            initial[f.key] = v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, GALLERY_MAX);
          }
        } else initial[f.key] = [];
      } else if (f.type === "multiselect") {
        initial[f.key] = Array.isArray(v) ? v : [];
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

  function renderFieldInput(f: FieldConfig) {
    const fieldOptions = typeof f.getOptions === "function" ? f.getOptions(form, options) : options[f.key] || [];

    if (f.type === "select") {
      return (
        <select
          value={String(form[f.key] ?? "")}
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
          {fieldOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === "tree") {
      const editingSlug = editing?.slug ? String(editing.slug) : null;
      const exclude = f.excludeSlug ?? editingSlug ?? null;
      const descendants =
        f.descendantSlugs ||
        (editing?.id ? descendantSlugs[String(editing.id)] : undefined) ||
        new Set<string>();
      return (
        <div className="w-full">
          <CategoryTreeSelector
            value={String(form[f.key] ?? "")}
            onChange={(v) =>
              setForm((s) => ({ ...s, [f.key]: v }))
            }
            options={f.treeOptions || []}
            excludeSlug={exclude}
            descendantSlugs={descendants}
            placeholder={f.placeholder || "انتخاب دسته والد…"}
            className="w-full"
          />
        </div>
      );
    }
    if (f.type === "textarea") {
      return (
        <textarea
          rows={3}
          value={String(form[f.key] ?? "")}
          onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
          placeholder={f.placeholder}
          className={`${inputCls} resize-none`}
        />
      );
    }
    if (f.type === "boolean") {
      return (
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
      );
    }
    if (f.type === "image") {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
            {form[f.key] ? (
              <OptimizedImage src={String(form[f.key])} alt="" fill className="object-cover" sizes="80px" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2">
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary"
              >
                {uploadingField === f.key || (f.key === "image" && analyzing) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploadingField === f.key
                  ? "آپلود…"
                  : analyzing && f.key === "image"
                  ? "تحلیل…"
                  : form[f.key]
                  ? "تعویض"
                  : "انتخاب تصویر"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingField === f.key || analyzing}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    e.target.value = "";
                    if (file) uploadImage(f.key, file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setPickerFieldKey(f.key);
                  setPickerMode("single");
                  setPickerOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-secondary/60 bg-secondary/5 px-4 py-2.5 font-body text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
                disabled={uploadingField === f.key || analyzing}
              >
                <Image className="h-4 w-4" /> کتابخانه
              </button>
              {form[f.key] != null && String(form[f.key]).trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, [f.key]: "" }))}
                  className="rounded-xl border border-secondary/70 px-3 py-2.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (f.type === "gallery") {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-4 py-2.5 font-body text-xs font-bold text-primary"
            >
              {uploadingField === f.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadingField === f.key ? "آپلود…" : "افزودن تصاویر"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploadingField === f.key}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (files.length) uploadGallery(f.key, files);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setPickerFieldKey(f.key);
                setPickerMode("multi");
                setPickerOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-secondary/60 bg-secondary/5 px-4 py-2.5 font-body text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
              disabled={uploadingField === f.key}
            >
              <Image className="h-4 w-4" /> کتابخانه
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(form[f.key]) ? (form[f.key] as unknown[]) : []).map((url, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-secondary/60">
                <ThumbnailImage src={String(url)} alt="" size={64} className="object-cover" />
                <button
                  type="button"
                  className="absolute inset-0 bg-black/50 text-[10px] text-white opacity-0 hover:opacity-100"
                  onClick={() =>
                    setForm((s) => ({
                      ...s,
                      [f.key]: ((s[f.key] as unknown[]) || []).filter((_: unknown, j: number) => j !== i),
                    }))
                  }
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (f.type === "multiselect") {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(form[f.key]) ? (form[f.key] as unknown[]) : []).map((val, i) => {
              const opt = fieldOptions.find((o) => o.value === String(val));
              return (
                <div key={`${val}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/5 px-3 py-1.5">
                  <span className="font-body text-xs text-primary">{opt?.label || String(val)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((s) => ({
                        ...s,
                        [f.key]: ((s[f.key] as unknown[]) || []).filter((v: unknown) => String(v) !== String(val)),
                      }))
                    }
                    className="flex h-4 w-4 items-center justify-center text-primary hover:bg-primary/20 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (!val) return;
              setForm((s) => {
                const current = Array.isArray(s[f.key]) ? (s[f.key] as unknown[]) : [];
                if (current.some((v) => String(v) === val)) return s;
                return { ...s, [f.key]: [...current, val] };
              });
              e.target.value = "";
            }}
            className={inputCls}
          >
            <option value="" disabled selected>
              جستجو و انتخاب مجموعه…
            </option>
            {fieldOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    }
    if (f.type === "list" || f.type === "sublist") {
      return (
        <input
          type="text"
          value={String(form[f.key] ?? "")}
          onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
          placeholder={f.placeholder || "با ویرگول جدا کنید"}
          className={inputCls}
        />
      );
    }
    return (
      <input
        type={f.type === "number" ? "number" : "text"}
        value={String(form[f.key] ?? "")}
        onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
        placeholder={f.placeholder}
        className={inputCls}
      />
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = fields.filter((f) => {
      if (!f.required) return false;
      if (f.type === "gallery") return !(Array.isArray(form[f.key]) && (form[f.key] as unknown[]).length);
      return !String(form[f.key] ?? "").trim();
    });
    if (missing.length) {
      setError("لطفاً فیلدهای الزامی را تکمیل کنید.");
      return;
    }
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      const v = form[f.key] as unknown;
      if (f.type === "gallery") {
        payload[f.key] = (Array.isArray(v) ? v : []).filter(Boolean).slice(0, GALLERY_MAX);
      } else if (f.type === "multiselect") {
        payload[f.key] = Array.isArray(v) ? v.filter(Boolean) : [];
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

    // Show confirmation for update operations
    const isEdit = Boolean(editing?.id);
    if (isEdit) {
      const recordLabel = String(payload.name || payload.title || payload.code || payload.slug || editing?.id || "این مورد");
      const confirmed = await confirm({
        title: `ویرایش ${title}`,
        description: `آیا مطمئن هستید که می‌خواهید تغییرات در «${recordLabel}» ذخیره شود؟`,
        confirmLabel: "ذخیره تغییرات",
        cancelLabel: "انصراف",
        variant: "primary",
      });
      if (!confirmed) return;
    }

    setSaving(true);
    setError("");
    try {
      const entitiesApi = api.entities[entity as keyof typeof api.entities];
      if (isEdit && editing) await entitiesApi.update(String(editing.id), payload);
      else await entitiesApi.create(payload);
      const detail = String(payload.name || payload.title || payload.code || payload.slug || "");
      adminToast(isEdit ? "update" : "create", title, detail);
      closeModal();
      load();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setError(msg);
      adminToast("error", title, msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(record: Record<string, unknown>) {
    const label = String(record[columns[0]?.key] ?? "این مورد");
    const confirmed = await confirm({
      title: `حذف ${title}`,
      description: `آیا مطمئن هستید که می‌خواهید «${label}» حذف شود؟ این عمل بازگشت‌پذیر نیست.`,
      confirmLabel: "حذف",
      cancelLabel: "انصراف",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      const entitiesApi = api.entities[entity as keyof typeof api.entities];
      await entitiesApi.delete(String(record.id));
      adminToast("delete", title, label);
      load();
    } catch (err) {
      const msg = apiErrorMessage(err);
      setTableError(msg);
      adminToast("error", title, msg);
    }
  }

  async function applyFabricAnalysis(url: string) {
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
    } catch (err) {
      setHint("تحلیل تصویر ناموفق بود: " + apiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }

  async function uploadImage(fieldKey: string, file: File) {
    if (!file) return;
    setUploadingField(fieldKey);
    setError("");
    setHint("");
    try {
      const compressed = await compressImage(file);
      const media = await api.media.upload(compressed);
      const url = media.url;
      if (!url) throw new Error("آپلود پاسخ معتبری نداد");
      setForm((f) => ({ ...f, [fieldKey]: url }));
      if (fieldKey === "image" && autoAnalyzeFabric) await applyFabricAnalysis(url);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploadingField(null);
    }
  }

  async function uploadGallery(fieldKey: string, filesInput: File[] | FileList) {
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
      const urls: string[] = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const media = await api.media.upload(compressed);
        const url = media.url;
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
      setError(apiErrorMessage(err));
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
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو…"
            className={`${inputCls} sm:w-56`}
          />
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
                  <tr key={String(record.id)} className="border-b border-secondary/40 last:border-0 hover:bg-background/40">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 align-middle font-body text-xs text-foreground">
                        {c.render ? c.render(record[c.key], record) : (record[c.key] != null ? String(record[c.key]) : "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(record)}
                          aria-label="ویرایش"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(record)}
                          aria-label="حذف"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-destructive hover:text-destructive"
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
            noValidate
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-foreground">
                {editing?.id ? `ویرایش ${title}` : `افزودن ${title}`}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="بستن"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={WIDE_TYPES.includes(f.type ?? "") ? "sm:col-span-2" : ""}>
                  <label className={labelCls}>
                    {f.label}
                    {f.required && <span className="text-primary"> *</span>}
                  </label>
                  {renderFieldInput(f)}
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
              <button type="button" onClick={closeModal} className="btn-ghost-gold">
                انصراف
              </button>
              <button type="submit" disabled={saving} className="btn-gold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing?.id ? "ذخیره تغییرات" : "ثبت"}
              </button>
            </div>
          </form>
        </div>
      )}

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
        mode={pickerMode}
        onSelect={(selected) => {
          const mediaList = Array.isArray(selected) ? selected : [selected];
          if (!pickerFieldKey) {
            setPickerOpen(false);
            return;
          }
          const fieldType = fields.find((f) => f.key === pickerFieldKey)?.type;
          if (fieldType === "gallery") {
            setForm((f) => {
              const cur = Array.isArray(f[pickerFieldKey]) ? f[pickerFieldKey] : [];
              const next = [...cur, ...mediaList.map((m) => m.url)].slice(0, GALLERY_MAX);
              return { ...f, [pickerFieldKey]: next };
            });
          } else {
            setForm((f) => ({ ...f, [pickerFieldKey]: mediaList[0].url }));
          }
          setPickerFieldKey(null);
          setPickerOpen(false);
        }}
        title="انتخاب تصویر از کتابخانه"
      />
    </div>
  );
}