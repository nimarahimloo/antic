import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { refreshRenderTemplates } from "@/hooks/useRenderTemplates";
import { filterInstallCategories } from "@/lib/installCategories";

/**
 * نمونه‌های اجرای واقعی (قالب اصلی):
 * عکس محصول واقعی per دسته فنی — موتور chroma و پارچه را روی آن می‌نشاند.
 * دسته‌های صرفاً فضایی (پذیرایی، هتل، …) اینجا نیستند.
 */
export default function InstallReferencesAdmin() {
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const installCats = useMemo(() => filterInstallCategories(categories), [categories]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, refs] = await Promise.all([
        base44.entities.CurtainCategory.list("order", 200).catch(() => []),
        base44.entities.InstallReference.list("-created_date", 400).catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setRows(Array.isArray(refs) ? refs : []);
    } catch {
      setError("بارگذاری ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function upload(slug, files) {
    if (!files?.length) return;
    setBusy(slug);
    setError("");
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        if (!file_url) throw new Error("آپلود ناموفق");
        await base44.entities.InstallReference.create({
          style: slug,
          image: file_url,
          note: "real-install",
        });
      }
      refreshRenderTemplates();
      await reload();
    } catch (e) {
      setError(e?.message || "آپلود ناموفق");
    } finally {
      setBusy("");
    }
  }

  const remove = async (id) => {
    try {
      await base44.entities.InstallReference.delete(id);
      refreshRenderTemplates();
      reload();
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
    rows.some((r) => String(r.style || "").toLowerCase() === String(c.slug).toLowerCase())
  ).length;

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <span className="eyebrow mb-2 block">نمونه‌های اجرای واقعی (قالب اصلی)</span>
      <p className="mb-2 text-xs leading-6 text-muted-foreground">
        برای هر <strong>دسته فنی کاتالوگ</strong> (شید، رومن، زبرا، …) یک عکس محصول واقعی آپلود کنید.
        سیستم ناحیه پرده را پیدا می‌کند، chroma می‌سازد و پارچهٔ مدل را روی همان عکس می‌نشاند.
      </p>
      <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
        دسته‌های فضایی مثل پذیرایی / هتل اینجا نیستند — آن‌ها فقط برای نمونه‌کار پروژه‌اند. پوشش:{" "}
        <strong>
          {withRef}/{installCats.length}
        </strong>{" "}
        دسته دارای عکس مرجع.
      </p>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {!installCats.length ? (
        <p className="rounded-xl border border-dashed border-secondary/70 p-6 text-center text-xs text-muted-foreground">
          دسته فنی ثبت نشده. از «دسته‌بندی کاتالوگ» دسته با سازوکار نصب (شید، رومن، …) اضافه کنید.
        </p>
      ) : (
        <div className="space-y-3">
          {installCats.map((cat) => {
            const slug = cat.slug;
            const mine = rows.filter(
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
                      disabled={!!busy}
                      onChange={(e) => {
                        const list = [...(e.target.files || [])];
                        e.target.value = "";
                        upload(slug, list);
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mine.map((r) => (
                    <div key={r.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-secondary/50">
                      <img src={r.image} alt={cat.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="حذف"
                        onClick={() => remove(r.id)}
                        className="absolute left-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {!mine.length && (
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
    </div>
  );
}
