"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";
import { refreshRenderTemplates } from "@/hooks/useRenderTemplates";
import { filterInstallCategories } from "@/lib/installCategories";
import { apiErrorMessage } from "@/lib/apiError";
import { adminToast } from "@/lib/adminToast";
import { OptimizedImage } from "@/components/ui/image";

interface CurtainCategoryItem {
  id?: string;
  name: string;
  slug: string;
  mechanism?: string;
}

interface InstallReferenceRow {
  id: string;
  style: string;
  image: string;
  note?: string;
  created_date?: string;
}

export function InstallReferenceManager() {
  const [categories, setCategories] = useState<CurtainCategoryItem[]>([]);
  const [refs, setRefs] = useState<InstallReferenceRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const installCats = useMemo(
    () => filterInstallCategories(categories),
    [categories],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, refs] = await Promise.all([
        api.entities.CurtainCategory.list("order", 200).catch(() => [] as CurtainCategoryItem[]),
        api.entities.InstallReference.list("-created_date", 400).catch(() => [] as InstallReferenceRow[]),
      ]);
      setCategories((Array.isArray(cats) ? cats : []) as CurtainCategoryItem[]);
      setRefs((Array.isArray(refs) ? refs : []) as InstallReferenceRow[]);
    } catch {
      setError("بارگذاری ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(slug: string, files: File[]) {
    if (!files?.length) return;
    setBusy(slug);
    setError("");
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
        const url = res?.file_url || res?.url || res?.path;
        if (!url) throw new Error("آپلود ناموفق");
        await api.entities.InstallReference.create({
          style: slug,
          image: url,
          note: "real-install",
        });
      }
      refreshRenderTemplates();
      await load();
      adminToast("create", "نمونه نصب واقعی", slug);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const remove = async (id: string) => {
    try {
      await api.entities.InstallReference.delete(id);
      refreshRenderTemplates();
      await load();
      adminToast("delete", "نمونه نصب واقع");
    } catch {
      setError("حذف ناموفق");
    }
  };

  if (loading) {
    return (
      <div className="mt-6 flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const withRef = installCats.filter((c) =>
    refs.some((r) => String(r.style || "").toLowerCase() === String(c.slug).toLowerCase())
  ).length;

  return (
    <section className="mt-8 rounded-2xl border border-secondary/60 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-sm font-black text-foreground">نمونه‌های اجرای واقعی (قالب اصلی)</h2>
          <p className="font-body text-xs text-muted-foreground">
            برای هر دسته فنی کاتالوگ (شید، رومن، زبرا، …) یک عکس محصول واقعی آپلود کنید.
            سیستم ناحیه پرده را پیدا می‌کند، chroma می‌سازد و پارچهٔ مدل را روی همان عکس می‌نشاند.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            دسته‌های فضایی مثل پذیرایی / هتل اینجا نیستند — آن‌ها فقط برای نمونه‌کار پروژه‌اند.
            پوشش: <strong>{withRef}/{installCats.length}</strong> دسته دارای عکس مرجع.
          </p>
        </div>
      </div>

      {error && <p className="mb-3 text-[10px] text-destructive">{error}</p>}

      {!installCats.length ? (
        <p className="rounded-xl border border-dashed border-secondary/70 p-6 text-center text-xs text-muted-foreground">
          دسته فنی ثبت نشده. از «دسته‌بندی کاتالوگ» دسته با سازوکار نصب (شید، رومن، …) اضافه کنید.
        </p>
      ) : (
        <div className="space-y-3">
          {installCats.map((cat) => {
            const slug = cat.slug;
            const mine = refs.filter(
              (r) => String(r.style || "").toLowerCase() === String(slug).toLowerCase()
            );
            return (
              <div key={cat.id || slug} className="rounded-xl border border-secondary/60 bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">{cat.name}</p>
                    <p className="font-mono text-[9px] text-muted-foreground" dir="ltr">
                      {slug}
                      {cat.mechanism ? ` · ${cat.mechanism}` : ""}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-primary/50 px-2 py-1 text-[10px] text-primary">
                    {busy === slug ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {mine.length ? "افزودن عکس" : "آپلود مرجع"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={busy === slug}
                      onChange={(e) => {
                        const list = [...(e.target.files || [])];
                        e.target.value = "";
                        if (list.length) void upload(slug, list);
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mine.length ? (
                    mine.map((r) => (
                      <div key={r.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-secondary/50">
                        {r.image ? (
                          <OptimizedImage src={r.image} alt={cat.name} fill className="object-cover" sizes="80px" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <button
                          type="button"
                          aria-label="حذف"
                          onClick={() => remove(r.id)}
                          className="absolute left-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="flex h-20 items-center text-[10px] text-muted-foreground">
                      هنوز عکس مرجع نیست — یک عکس نصب واقعی آپلود کنید
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
