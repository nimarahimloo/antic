import { useEffect, useState, useCallback } from "react";
import { Loader2, Sparkles, Upload, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { refreshRenderTemplates } from "@/hooks/useRenderTemplates";
import { resolveStyle, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";

/**
 * Templates are keyed by CurtainCategory.slug from DB — not a hardcoded list.
 * Add/remove categories in admin categories → they appear here automatically.
 */
export default function RenderTemplatesAdmin() {
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, tpls] = await Promise.all([
        base44.entities.CurtainCategory.list("order", 100).catch(() => []),
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

  const imageOf = (slug) => {
    const key = String(slug || "").toLowerCase();
    const row = templates.find((r) => String(r.style || "").toLowerCase() === key);
    return row?.image || null;
  };

  const rowOf = (slug) => {
    const key = String(slug || "").toLowerCase();
    return templates.find((r) => String(r.style || "").toLowerCase() === key);
  };

  async function run(key, task) {
    setBusy(key);
    setError("");
    setOkMsg("");
    try {
      await task();
      refreshRenderTemplates();
      await reload();
      setOkMsg("قالب ذخیره شد و به دستهٔ کاتالوگ وصل است.");
    } catch (e) {
      setError(String(e?.data?.error || e?.message || "عملیات ناموفق بود"));
    } finally {
      setBusy("");
    }
  }

  /** Server builds chroma from category slug → mechanism geometry */
  const generateOne = (cat) =>
    run(cat.slug, async () => {
      if (base44.render?.templateFromCategory) {
        await base44.render.templateFromCategory(cat.slug);
        return;
      }
      // fallback: mechanism-only function + entity write under category slug
      const mechanism = resolveStyle({ category_slug: cat.slug });
      const res = await base44.functions.invoke("generateRenderTemplate", { style: mechanism });
      const img = res?.data?.image || res?.image;
      if (!img) throw new Error(res?.error || "ساخت قالب ناموفق");
      const existing = rowOf(cat.slug);
      if (existing) await base44.entities.RenderTemplate.update(existing.id, { image: img });
      else await base44.entities.RenderTemplate.create({ style: cat.slug, image: img });
    });

  const generateAll = () =>
    run("__all__", async () => {
      if (base44.render?.templateAllCategories) {
        const res = await base44.render.templateAllCategories();
        setOkMsg(`قالب برای ${res?.count ?? categories.length} دسته ساخته شد.`);
        return;
      }
      for (const cat of categories) {
        await generateOne(cat);
      }
    });

  const upload = (cat, file) =>
    file &&
    run(cat.slug, async () => {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (!file_url) throw new Error("آپلود ناموفق");
      const existing = rowOf(cat.slug);
      if (existing) await base44.entities.RenderTemplate.update(existing.id, { image: file_url });
      else await base44.entities.RenderTemplate.create({ style: cat.slug, image: file_url });
    });

  if (loading) {
    return (
      <div className="mt-6 flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow mb-2 block">قالب نصب بر اساس دسته‌بندی کاتالوگ</span>
          <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
            لیست از <strong>دسته‌بندی‌های ثبت‌شده در دیتابیس</strong> می‌آید — هاردکد نیست. هر دستهٔ جدید در
            «دسته‌ها» اینجا ظاهر می‌شود. قالب با <code className="text-[10px]">slug</code> همان دسته ذخیره
            می‌شود تا مدل‌های آن دسته پیدا کنند.
          </p>
        </div>
        <button
          type="button"
          disabled={!!busy || !categories.length}
          onClick={generateAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/50 px-3 py-2 text-[11px] font-bold text-primary disabled:opacity-50"
        >
          {busy === "__all__" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          ساخت قالب همه دسته‌ها
        </button>
      </div>

      <p className="mb-4 text-[11px] leading-5 text-muted-foreground">
        کیفیت هدف: عکس محصول (رومن نیمه‌بالا، پلیسه دو لنگه، پلیسه کاست‌دار). بهترین نتیجه = آپلود عکس نصب
        واقعی با <strong>ناحیه پارچه کاملاً سبز (chroma)</strong> و همان فرم نصب. «ساخت قالب» هندسه
        تقریبی همان سازوکار را می‌سازد.
      </p>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      {okMsg && <p className="mb-3 text-xs text-primary">{okMsg}</p>}

      {!categories.length ? (
        <p className="rounded-xl border border-dashed border-secondary/70 p-6 text-center text-xs text-muted-foreground">
          هنوز دسته‌ای در کاتالوگ نیست. از بخش دسته‌بندی‌ها اضافه کنید؛ بعد اینجا قالب بسازید.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => {
            const mechanism = resolveStyle({ category_slug: cat.slug });
            const mechLabel = MECHANISM_LABELS[mechanism] || mechanism;
            const img = imageOf(cat.slug);
            return (
              <div key={cat.id || cat.slug} className="rounded-xl border border-secondary/60 bg-background p-2">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-secondary/40">
                  {img && <img src={img} alt={cat.name} className="h-full w-full object-cover" />}
                </div>
                <p className="mt-2 text-xs font-bold text-foreground">{cat.name}</p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground" dir="ltr">
                  {cat.slug}
                </p>
                <p className="mt-0.5 text-[9px] leading-4 text-muted-foreground">
                  سازوکار رندر: {mechLabel}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => generateOne(cat)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-primary/50 py-1.5 text-[10px] text-primary disabled:opacity-50"
                  >
                    {busy === cat.slug ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {img ? "ساخت دوباره" : "ساخت قالب"}
                  </button>
                  <label
                    className="flex cursor-pointer items-center rounded-lg border border-secondary/70 px-2 text-muted-foreground"
                    aria-label="آپلود قالب chroma"
                  >
                    <Upload className="h-3 w-3" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!busy}
                      onChange={(e) => upload(cat, e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** @deprecated kept for any leftover imports — prefer categories from DB */
export const STYLES = [];
