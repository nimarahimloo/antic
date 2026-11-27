"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Upload, Image as LibImage } from "lucide-react";
import { api } from "@/api";
import { compressImage } from "@/lib/compressImage";
import { apiErrorMessage } from "@/lib/apiError";
import { MediaPicker } from "@/components/media/MediaPicker";

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

interface Collection {
  id: string;
  title: string;
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
  const media = await api.media.upload(toSend);
  const url = media.url;
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
  collectionIds: [] as string[],
  visible: true,
  inStock: true,
};

export default function AdminProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);

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
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/entities/Collection?sort_by=order&limit=500`, { headers: authHeaders() })
        .then((r) => {
          if (!r.ok) throw new Error("load collections");
          return r.json() as Promise<Collection[]>;
        })
        .catch(() => []),
    ])
      .then(([products, categories, collectionsData]) => {
        setRows(Array.isArray(products) ? products : []);
        setCats(Array.isArray(categories) ? categories : []);
        setCollections(Array.isArray(collectionsData) ? collectionsData : []);
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
    
    // Set initial form without collections, then fetch collections
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
      collectionIds: [],
    });
    setEditing(p);
    setError("");
    setHint("");

    // Fetch collections from the new CollectionProduct relation
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || "/api"}/catalog/admin/products/${p.id}/collections`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data?.collections) {
          const collectionIds = data.collections.map((c: Collection) => c.id);
          setForm((f) => ({ ...f, collectionIds }));
        }
      })
      .catch(() => {});
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
      collectionIds: Array.isArray(form.collectionIds) ? form.collectionIds : [],
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

  const inputCls =
    "w-full rounded-xl border border-secondary bg-background px-4 py-2.5 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
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
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 lg:p-6"
          onClick={closeModal}
        >
          <form
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto my-8 w-full max-w-lg lg:max-w-2xl rounded-2xl border border-secondary/60 bg-card p-6 lg:p-8"
            noValidate
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-foreground">
                {editing?.id ? "ویرایش محصول" : "افزودن محصول"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
                aria-label="بستن"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  نام *
                </label>
                <input
                  className={inputCls}
                  value={String(form.name)}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                    قیمت (تومان) — اختیاری
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    placeholder="خالی = تماس بگیرید"
                    value={String(form.price)}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                    قیمت قبل
                  </label>
                  <input
                    className={inputCls}
                    type="number"
                    value={String(form.compareAtPrice)}
                    onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  تصویر کاور
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary/60 bg-background">
                    {form.image ? (
                      <img src={String(form.image)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/50 bg-primary/5 px-3 py-2.5 font-body text-xs font-bold text-primary"
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
                    <button
                      type="button"
                      onClick={() => setCoverPickerOpen(true)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-secondary/60 bg-secondary/5 px-3 py-2.5 font-body text-xs text-muted-foreground hover:border-primary/60 hover:text-primary"
                      disabled={uploadingCover}
                    >
                      <LibImage className="h-3.5 w-3.5" />
                    </button>
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, image: "" }))}
                        className="rounded-xl border border-secondary/70 px-3 py-2.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  گالری (تا {GALLERY_MAX} تصویر)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(form.gallery || []).map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="relative h-20 w-20 overflow-hidden rounded-xl border border-secondary/60"
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
                        className="absolute inset-0 bg-black/50 text-[10px] text-white opacity-0 hover:opacity-100"
                        aria-label="حذف"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(form.gallery || []).length < GALLERY_MAX && (
                    <div className="flex gap-1">
                      <label
                        className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary"
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
                      <button
                        type="button"
                        onClick={() => setGalleryPickerOpen(true)}
                        className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-secondary/60 bg-secondary/5 text-primary"
                        disabled={uploadingGallery}
                      >
                        <LibImage className="h-4 w-4" />
                        <span className="text-[9px] font-bold">کتابخانه</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {(form.gallery || []).length}/{GALLERY_MAX} — JPG/PNG/WebP — در صفحه محصول زیر تصویر اصلی
                </p>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  مجموعه‌ها
                </label>
                <div className="flex flex-wrap gap-2">
                  {(form.collectionIds || []).map((cid: string, i: number) => {
                    const col = collections.find((c) => c.id === cid);
                    return (
                      <div key={`${cid}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/5 px-3 py-1.5">
                        <span className="font-body text-xs text-primary">{col?.title || cid}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              collectionIds: (f.collectionIds || []).filter((id: string) => id !== cid),
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
                    setForm((f) => {
                      const current = Array.isArray(f.collectionIds) ? f.collectionIds : [];
                      if (current.includes(val)) return f;
                      return { ...f, collectionIds: [...current, val] };
                    });
                    e.target.value = "";
                  }}
                  className={inputCls}
                >
                  <option value="" disabled selected>
                    جستجو و انتخاب مجموعه…
                  </option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  دسته
                </label>
                <select
                  className={inputCls}
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
                <label className="mb-1.5 block font-body text-xs text-muted-foreground">
                  توضیح
                </label>
                <textarea
                  className={`${inputCls} resize-none`}
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
                    className="h-4 w-4"
                    style={{ accentColor: "#C9A227" }}
                  />
                  نمایش در فروشگاه
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(form.inStock)}
                    onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
                    className="h-4 w-4"
                    style={{ accentColor: "#C9A227" }}
                  />
                  موجود
                </label>
              </div>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={closeModal} className="btn-ghost-gold flex-1">
                  انصراف
                </button>
                <button type="submit" disabled={busy} className="btn-gold flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {editing?.id ? "ذخیره تغییرات" : "ثبت"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <MediaPicker
        open={coverPickerOpen}
        onOpenChange={setCoverPickerOpen}
        mode="single"
        onSelect={(selected) => {
          const media = Array.isArray(selected) ? selected[0] : selected;
          if (media) setForm((f) => ({ ...f, image: media.url }));
        }}
        title="انتخاب تصویر کاور از کتابخانه"
      />

      <MediaPicker
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        mode="multi"
        max={GALLERY_MAX}
        onSelect={(selected) => {
          const mediaList = Array.isArray(selected) ? selected : [selected];
          setForm((f) => {
            const cur = Array.isArray(f.gallery) ? f.gallery : [];
            const next = [...cur, ...mediaList.map((m) => m.url)].slice(0, GALLERY_MAX);
            return { ...f, gallery: next };
          });
        }}
        title="انتخاب تصاویر گالری از کتابخانه"
      />
    </div>
  );
}