import { useEffect, useState, useCallback } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { refreshRenderTemplates } from "@/hooks/useRenderTemplates";

/**
 * Optional real install photos, keyed by CurtainCategory.slug (same as templates).
 *
 * When the photo has a clear GREEN fabric region, the engine prefers it over the
 * procedural chroma template (higher realism). Finished product shots without green
 * cannot map a new fabric — use those only as visual guide, or shoot with green cloth.
 *
 * Not required: catalog works with RenderTemplate alone.
 */
export default function InstallReferencesAdmin() {
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, refs] = await Promise.all([
        base44.entities.CurtainCategory.list("order", 100).catch(() => []),
        base44.entities.InstallReference.list("-created_date", 300).catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setRows(Array.isArray(refs) ? refs : []);
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
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        await base44.entities.InstallReference.create({
          style: slug,
          image: file_url,
          note: "real-install",
        });
      }
      refreshRenderTemplates();
      await reload();
    } finally {
      setBusy("");
    }
  }

  const remove = async (id) => {
    await base44.entities.InstallReference.delete(id);
    refreshRenderTemplates();
    reload();
  };

  if (loading) {
    return (
      <div className="mt-6 flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <span className="eyebrow mb-2 block">نمونه‌های اجرای واقعی (اختیاری)</span>
      <p className="mb-2 text-xs leading-6 text-muted-foreground">
        <strong>اجباری نیست.</strong> اگر برای یک دسته عکس نصب واقعی با پارچهٔ سبز (chroma) بگذارید، موتور
        همان را به قالب procedural ترجیح می‌دهد و بافت مدل‌ها طبیعی‌تر می‌نشیند. عکس محصول نهایی بدون سبز
        برای تعویض پارچه قابل استفاده نیست — فقط الهام فرم است.
      </p>
      <p className="mb-4 text-[11px] leading-5 text-muted-foreground">
        لیست از همان دسته‌بندی‌های کاتالوگ است؛ با کم/زیاد شدن دسته‌ها اینجا هم عوض می‌شود.
      </p>

      {!categories.length ? (
        <p className="text-center text-xs text-muted-foreground">دسته‌ای ثبت نشده.</p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const slug = cat.slug;
            const mine = rows.filter((r) => String(r.style || "").toLowerCase() === String(slug).toLowerCase());
            return (
              <div key={cat.id || slug} className="rounded-xl border border-secondary/60 bg-background p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">{cat.name}</p>
                    <p className="font-mono text-[9px] text-muted-foreground" dir="ltr">
                      {slug}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-primary/50 px-2 py-1 text-[10px] text-primary">
                    {busy === slug ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    افزودن عکس
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={!!busy}
                      onChange={(e) => upload(slug, [...(e.target.files || [])])}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mine.map((r) => (
                    <div key={r.id} className="relative h-16 w-16 overflow-hidden rounded-lg">
                      <img src={r.image} alt={cat.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="حذف"
                        onClick={() => remove(r.id)}
                        className="absolute left-0.5 top-0.5 rounded-full bg-background/80 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {!mine.length && (
                    <span className="text-[10px] text-muted-foreground">هنوز عکسی نیست</span>
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
