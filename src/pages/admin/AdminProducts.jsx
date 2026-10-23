import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { compressImage } from "@/lib/compressImage";

const API = import.meta.env.VITE_API_BASE || "/api";

function authHeaders() {
  const t = localStorage.getItem("antic_access_token");
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

const empty = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compareAtPrice: "",
  image: "",
  categoryId: "",
  stock: "100",
  visible: true,
  inStock: true,
  ribbon: "",
};

export default function AdminProducts() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/catalog/admin/products`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`${API}/catalog/categories`).then((r) => r.json()),
    ])
      .then(([products, catRes]) => {
        setRows(Array.isArray(products) ? products : []);
        setCats(catRes.categories || []);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm(empty);
    setEditing({});
    setError("");
  }

  function openEdit(p) {
    setForm({
      name: p.name || "",
      slug: p.slug || "",
      description: (p.plainDescription || "").replace(/<[^>]+>/g, ""),
      price: p.actualPriceRange?.minValue?.amount || "",
      compareAtPrice: p.compareAtPriceRange?.minValue?.amount || "",
      image: p.media?.main?.image?.url || "",
      categoryId: p.mainCategoryId || "",
      stock: "100",
      visible: p.visible !== false,
      inStock: p.inventory?.availabilityStatus === "IN_STOCK",
      ribbon: p.ribbon?.name || "",
    });
    setEditing(p);
    setError("");
  }

  async function uploadImage(file) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const res = await base44.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url;
      if (!url) throw new Error("آپلود ناموفق");
      setForm((f) => ({ ...f, image: url }));
    } catch (e) {
      setError(e.message || "آپلود تصویر ناموفق بود");
    } finally {
      setUploading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("نام الزامی است");
      return;
    }
    setSaving(true);
    setError("");
    const body = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description ? `<p>${form.description}</p>` : "",
      price: Number(form.price) || 0,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      image: form.image || null,
      categoryId: form.categoryId || null,
      stock: Number(form.stock) || 0,
      visible: form.visible,
      inStock: form.inStock,
      ribbon: form.ribbon || null,
    };
    try {
      const url = editing?.id
        ? `${API}/catalog/admin/products/${editing.id}`
        : `${API}/catalog/admin/products`;
      const res = await fetch(url, {
        method: editing?.id ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("ذخیره ناموفق");
      setEditing(null);
      load();
    } catch {
      setError("ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(`حذف «${p.name}»؟`)) return;
    await fetch(`${API}/catalog/admin/products/${p.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    load();
  }

  const input =
    "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm outline-none focus:border-primary";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black">محصولات فروشگاه</h1>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            {loading ? "…" : `${rows.length} محصول`}
          </p>
        </div>
        <button type="button" onClick={openNew} className="btn-gold">
          <Plus className="h-4 w-4" /> افزودن
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-secondary/60">
              <th className="px-4 py-3 text-right font-body text-xs text-muted-foreground">نام</th>
              <th className="px-4 py-3 text-right font-body text-xs text-muted-foreground">قیمت</th>
              <th className="px-4 py-3 text-right font-body text-xs text-muted-foreground">موجودی</th>
              <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center font-body text-sm text-muted-foreground">
                  محصولی نیست. از «افزودن» شروع کنید.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b border-secondary/40 last:border-0">
                  <td className="px-4 py-3 font-body text-xs">{p.name}</td>
                  <td className="px-4 py-3 font-body text-xs">
                    {p.actualPriceRange?.minValue?.formattedAmount}
                  </td>
                  <td className="px-4 py-3 font-body text-xs">
                    {p.inventory?.availabilityStatus === "IN_STOCK" ? "موجود" : "ناموجود"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg border border-secondary/70 p-2"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="rounded-lg border border-secondary/70 p-2"
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

      {editing !== null && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto my-8 max-w-xl rounded-3xl border border-secondary/60 bg-card p-6"
            noValidate
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-black">
                {editing?.id ? "ویرایش محصول" : "محصول جدید"}
              </h3>
              <button type="button" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">نام</label>
                <input
                  className={input}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">اسلاگ</label>
                <input
                  className={input}
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">قیمت (تومان)</label>
                  <input
                    className={input}
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">قیمت قبل</label>
                  <input
                    className={input}
                    type="number"
                    value={form.compareAtPrice}
                    onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">تصویر</label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
                    {form.image ? (
                      <img src={form.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 px-3 py-2 text-xs text-primary">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {uploading ? "آپلود…" : form.image ? "تعویض" : "انتخاب تصویر"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        uploadImage(f);
                      }}
                    />
                  </label>
                  {form.image && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground"
                      onClick={() => setForm((f) => ({ ...f, image: "" }))}
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">دسته</label>
                <select
                  className={input}
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">—</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">توضیح</label>
                <textarea
                  className={`${input} resize-none`}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.visible}
                    onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                  />
                  نمایش در فروشگاه
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.inStock}
                    onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
                  />
                  موجود
                </label>
              </div>
            </div>
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading}
                className="btn-gold flex-1 justify-center"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost-gold">
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
