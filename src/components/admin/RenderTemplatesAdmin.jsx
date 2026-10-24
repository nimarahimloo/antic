import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { refreshRenderTemplates } from "@/hooks/useRenderTemplates";
import { resolveStyle, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";
import { filterInstallCategories } from "@/lib/installCategories";

/**
 * قالب سبز (chroma) — فقط آپلود عکس واقعی/حرفه‌ای با ناحیه پارچه سبز.
 * ساخت رویه‌ای کارتونی حذف شد؛ بدون آپلود خروجی ضعیف می‌شود.
 */
export default function RenderTemplatesAdmin() {
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const installCats = useMemo(() => filterInstallCategories(categories), [categories]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, tpls] = await Promise.all([
        base44.entities.CurtainCategory.list("order", 200).catch(() => []),
        base44.entities.RenderTemplate.list("-updated_date", 200).catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setTemplates(Array.isArray(tpls) ? tpls : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const rowOf = (slug) => {
    const key = String(slug || "").toLowerCase();
    return templates.find((r) => String(r.style || "").toLowerCase() === key);
  };

  const imageOf = (slug) => rowOf(slug)?.image || null;

  async function run(key, task) {
    setBusy(key);
    setError("");
    setOkMsg("");
    try {
      await task();
      refreshRenderTemplates();
      await reload();
      setOkMsg("ذخیره شد.");
    } catch (e) {
      setError(String(e?.data?.error || e?.message || "عملیات ناموفق"));
    } finally {
      setBusy("");
    }
  }

  const upload = (cat, file) =>
    file &&
    run(cat.slug, async () => {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (!file_url) throw new Error("آپلود ناموفق");
      const existing = rowOf(cat.slug);
      if (existing) {
        await base44.entities.RenderTemplate.update(existing.id, {
          style: cat.slug,
          image: file_url,
        });
      } else {
        await base44.entities.RenderTemplate.create({ style: cat.slug, image: file_url });
      }
      // آینه روی mechanism تا مدل‌هایی که فقط با سازوکار match می‌شوند هم پیدا کنند
      const mechanism = cat.mechanism || resolveStyle({ category_slug: cat.slug });
      if (mechanism && mechanism !== cat.slug) {
        const mechRow = templates.find(
          (r) => String(r.style || "").toLowerCase() === String(mechanism).toLowerCase()
        );
        if (mechRow) {
          await base44.entities.RenderTemplate.update(mechRow.id, { image: file_url });
        } else {
          await base44.entities.RenderTemplate.create({ style: mechanism, image: file_url });
        }
      }
    });

  const remove = (cat) =>
    run(cat.slug, async () => {
      const existing = rowOf(cat.slug);
      if (existing) await base44.entities.RenderTemplate.delete(existing.id);
    });

  if (loading) {
    return (
      <div className="mt-6 flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const covered = installCats.filter((c) => imageOf(c.slug)).length;

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="mb-3">
        <span className="eyebrow mb-2 block">قالب سبز (chroma) — دسته‌های فنی</span>
        <p className="max-w-3xl text-xs leading-6 text-muted-foreground">
          برای هر دسته یک <strong>عکس باکیفیت</strong> آپلود کنید که ناحیه پارچه کاملاً سبز chroma باشد
          (مثل رومن تاشو، زبرا نواری، پنل، کرکره). بدون این آپلود، رندر مدل‌ها ضعیف یا کارتونی می‌شود.
          ساخت خودکار هندسی حذف شده است.
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          پوشش: <strong>{covered}/{installCats.length}</strong> دسته دارای قالب سبز آپلودشده
        </p>
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      {okMsg && <p className="mb-3 text-xs text-primary">{okMsg}</p>}

      {!installCats.length ? (
        <p className="rounded-xl border border-dashed border-secondary/70 p-6 text-center text-xs text-muted-foreground">
          دسته فنی نیست. در دسته‌بندی کاتالوگ، برای دسته فیلد مکانیزم بگذارید.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {installCats.map((cat) => {
            const mechanism = cat.mechanism || resolveStyle({ category_slug: cat.slug });
            const mechLabel = MECHANISM_LABELS[mechanism] || mechanism;
            const img = imageOf(cat.slug);
            return (
              <div
                key={cat.id || cat.slug}
                className="rounded-xl border border-secondary/60 bg-background p-2"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary/30">
                  {img ? (
                    <img src={img} alt={cat.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                      <Upload className="h-5 w-5 text-muted-foreground/50" />
                      <span className="text-[10px] leading-4 text-muted-foreground">
                        هنوز قالب سبز ندارد
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-bold text-foreground">{cat.name}</p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground" dir="ltr">
                  {cat.slug}
                </p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">سازوکار: {mechLabel}</p>
                <div className="mt-2 flex gap-1.5">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-primary/50 py-1.5 text-[10px] font-bold text-primary">
                    {busy === cat.slug ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {img ? "تعویض عکس" : "آپلود قالب سبز"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        upload(cat, f);
                      }}
                    />
                  </label>
                  {img && (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => remove(cat)}
                      aria-label="حذف قالب"
                      className="rounded-lg border border-secondary/70 px-2 text-muted-foreground hover:border-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
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

export const STYLES = [];
