"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Upload } from "lucide-react";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";

const GALLERY_MAX = 20;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

interface Product {
  id: string;
  name: string;
  plainDescription?: string;
  actualPriceRange?: {
    minValue?: {
      amount: number;
      formattedAmount?: string;
    };
  };
  compareAtPriceRange?: {
    minValue?: {
      amount: number;
    };
  };
  media?: {
    main?: {
      image?: {
        url: string;
      };
    };
    itemsInfo?: {
      items: Array<{
        image?: {
          url: string;
        };
        url?: string;
      }>;
    };
  };
  mainCategoryId?: string;
  visible?: boolean;
  inventory?: {
    availabilityStatus?: string;
  };
}

interface Category {
  id: string;
  name: string;
}

function authHeaders() {
  if (typeof window === "undefined") return { "Content-Type": "application/json" };
  const t = localStorage.getItem("antic_access_token");
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

function extractGallery(p: Product): string[] {
  const items = p?.media?.itemsInfo?.items || [];
  const main = p?.media?.main?.image?.url || "";
  const urls = items
    .map((i) => i?.image?.url || i?.url || (typeof i === "string" ? i : null))
    .filter((u): u is string => Boolean(u) && u !== main);
  return [...new Set(urls)];
}

async function uploadOne(file: File) {
  if (!file) throw new Error("فایلی انتخاب نشد");
  let toSend = file;
  try {
    toSend = await compressImage(file);
  } catch {
    toSend = file;
  }
  const uploader = api?.integrations?.Core?.UploadPublicFile;
  if (typeof uploader !== "function") {
    throw new Error("سرویس آپلود در دسترس نیست");
  }
  const res = await uploader({ file: toSend });
  const url = res?.file_url || res?.url || res?.path;
  if (!url) throw new Error("آپلود پاسخ معتبری نداد");
  return url;
}

const empty = {
  name: "",
  description: "",
  price: "",
  compareAtPrice: "",
  image: "",
  gallery: [] as string[],
  categoryId: "",
  visible: true,
  inStock: true,
};

export default function AdminProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/catalog/admin/products`, { headers: authHeaders() }).then((r) => {
        if (!r.ok) throw new Error("load");
        return r.json() as Promise<Product[]>;
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/catalog/categories?limit=200`)
        .then((r) => {
          if (!r.ok) throw new Error("load categories");
          return r.json() as Promise<{ categories: Category[] }>;
        })
        .then((data) => data?.categories ?? []),
    ])
      .then(([products, categories]) => {
        setRows(Array.isArray(products) ? products : []);
        setCats(Array.isArray(categories) ? categories : []);
      })
      .catch((err) => {
        console.error("Failed to load products:", err);
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm({ ...empty, gallery: [] });
    setEditing({} as Product);
    setError("");
    setHint("");
  }

  function openEdit(p: Product) {
    const price = p.actualPriceRange?.minValue?.amount;
    setForm({
      name: p.name || "",
      description: (String(p.plainDescription || "")).replace(/<[^>]+>/g, ""),
      price:
        price && Number(price) > 0
          ? String(price)
          : "",
      compareAtPrice: p.compareAtPriceRange?.minValue?.amount ? String(p.compareAtPriceRange.minValue.amount) : "",
      image: p.media?.main?.image?.url || "",
      gallery: extractGallery(p),
      categoryId: p.mainCategoryId || "",
      visible: p.visible !== false,
      inStock: p.inventory?.availabilityStatus === "IN_STOCK",
    });
    setEditing(p);
    setError("");
    setHint("");
  }

  function closeModal() {
    setEditing(null);
    setError("");
    setHint("");
    setUploadingCover(false);
    setUploadingGallery(false);
  }

  async function uploadCover(file: File) {
    if (!file) return;
    setUploadingCover(true);
    setError("");
    setHint("");
    try {
      const url = await uploadOne(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploadingCover(false);
    }
  }

  async function uploadGalleryFiles(fileList: File[]) {
    const files = fileList.filter(Boolean);
    if (!files.length) {
      setError("فایلی انتخاب نشد");
      return;
    }
    setUploadingGallery(true);
    setError("");
    setHint("");
    try {
      const urls: string[] = [];
      for (const file of files) {
        try {
          urls.push(await uploadOne(file));
        } catch (e) {
          setError(apiErrorMessage(e));
        }
      }
      if (!urls.length) throw new Error("آپلود گالری ناموفق بود");
      setForm((f) => {
        const cur = Array.isArray(f.gallery) ? f.gallery : [];
        const next = [...cur, ...urls].slice(0, GALLERY_MAX);
        return { ...f, gallery: next };
      });
      const curLen = Array.isArray(form.gallery) ? form.gallery.length : 0;
      if (curLen + urls.length > GALLERY_MAX) {
        setHint(`حداکثر ${GALLERY_MAX} تصویر؛ فقط بخشی اضافه شد.`);
      }
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setUploadingGallery(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!String(form.name).trim()) {
      setError("نام الزامی است");
      return;
    }
    setSaving(true);
    setError("");
    const body = {
      name: form.name,
      description: form.description ? `<p>${form.description}</p>` : "",
      price: form.price === "" || form.price == null ? 0 : Number(form.price) || 0,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      image: form.image || null,
      gallery: Array.isArray(form.gallery) ? form.gallery.filter(Boolean).slice(0, GALLERY_MAX) : [],
      categoryId: form.categoryId || null,
      visible: form.visible,
      inStock: form.inStock,
    };
    try {
      const API = process.env.NEXT_PUBLIC_API_BASE || "/api";
      const url = editing?.id
        ? `${API}/catalog/admin/products/${editing.id}`
        : `${API}/catalog/admin/products`;
      const res = await fetch(url, {
        method: editing?.id ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "ذخیره ناموفق");
      }
      closeModal();
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`حذف «${String(p.name)}»؟`)) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/catalog/admin/products/${p.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const input =
    "w-full rounded-xl border border-secondary bg-background px-3 py-2 font-body text-sm text-foreground outline-none focus:border-primary";
  const busy = uploadingCover || uploadingGallery || saving;

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

      {error && !editing && <p className="mb-4 text-xs text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-secondary/60">
                <th className="px-4 py-3 text-right font-body text-xs text-muted-foreground">تصویر</th>
                <th className="px-4 py-3 text-right font-body text-xs text-muted-foreground">نام</th>
                <th className="px-4 py-3 text-right font-body text-xs text-muted-foreground">قیمت</th>
                <th className="px-4 py-3 text-left font-body text-xs text-muted-foreground">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    محصولی نیست.
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const img = p.media?.main?.image?.url;
                  const priceAmt = Number(p.actualPriceRange?.minValue?.amount);
                  const priceLabel =
                    Number.isFinite(priceAmt) && priceAmt > 0
                      ? p.actualPriceRange?.minValue?.formattedAmount
                      : "تماس بگیرید";
                  return (
                    <tr key={String(p.id)} className="border-b border-secondary/40 last:border-0">
                      <td className="px-4 py-3">
                        {img ? (
                          <img src={String(img)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-display text-sm font-bold">{String(p.name)}</td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">{priceLabel}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground hover:border-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4"
          onClick={closeModal}
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto my-8 w-full max-w-lg rounded-3xl border border-secondary/60 bg-card p-6"
            noValidate
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-black">
                {editing?.id ? "ویرایش محصول" : "افزودن محصول"}
              </h3>
              <button type="button" onClick={closeModal} className="text-muted-foreground" aria-label="بستن">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">نام *</label>
                <input
                  className={input}
                  value={String(form.name)}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">قیمت (تومان) — اختیاری</label>
                  <input
                    className={input}
                    type="number"
                    min="0"
                    placeholder="خالی = تماس بگیرید"
                    value={String(form.price)}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">قیمت قبل</label>
                  <input
                    className={input}
                    type="number"
                    value={String(form.compareAtPrice)}
                    onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">تصویر کاور</label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
                    {form.image ? (
                      <img src={String(form.image)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2 text-xs font-bold text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {uploadingCover ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {uploadingCover ? "آپلود…" : form.image ? "تعویض" : "انتخاب"}
                      <input
                        type="file"
                        accept={ACCEPT}
                        className="hidden"
                        disabled={uploadingCover}
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          e.target.value = "";
                          if (f) uploadCover(f);
                        }}
                      />
                    </label>
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, image: "" }))}
                        className="rounded-xl border border-secondary/70 px-3 py-2 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  گالری (تا {GALLERY_MAX} تصویر)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(form.gallery || []).map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="relative h-16 w-16 overflow-hidden rounded-xl border border-secondary/60"
                    >
                      <img src={String(url)} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            gallery: (f.gallery || []).filter((_, i) => i !== idx),
                          }))
                        }
                        className="absolute left-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-destructive"
                        aria-label="حذف"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(form.gallery || []).length < GALLERY_MAX && (
                    <label
                      className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {uploadingGallery ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span className="text-[9px] font-bold">افزودن</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept={ACCEPT}
                        multiple
                        className="hidden"
                        disabled={uploadingGallery}
                        onChange={(e) => {
                          const list = e.target.files ? Array.from(e.target.files) : [];
                          e.target.value = "";
                          if (list.length) uploadGalleryFiles(list);
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {(form.gallery || []).length}/{GALLERY_MAX} — JPG/PNG/WebP — در صفحه محصول زیر تصویر اصلی
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">دسته</label>
                <select
                  className={input}
                  value={String(form.categoryId)}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                >
                  <option value="">—</option>
                  {cats.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">توضیح</label>
                <textarea
                  className={`${input} resize-none`}
                  rows={2}
                  value={String(form.description)}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(form.visible)}
                    onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                  />
                  نمایش در فروشگاه
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(form.inStock)}
                    onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
                  />
                  موجود
                </label>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={busy} className="btn-gold flex-1 justify-center">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
                </button>
                <button type="button" onClick={closeModal} className="btn-ghost-gold">
                  انصراف
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}