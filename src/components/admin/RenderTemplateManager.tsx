"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";
import { refreshRenderTemplates } from "@/hooks/useRenderTemplates";
import { resolveStyle, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";
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

interface RenderTemplateRow {
  id: string;
  style: string;
  image: string;
}

export function RenderTemplateManager() {
  const [categories, setCategories] = useState<Array<{ id?: string; name: string; slug: string; mechanism?: string }>>([]);
  const [templates, setTemplates] = useState<RenderTemplateRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const installCats = useMemo(
    () => filterInstallCategories(categories),
    [categories],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, tpls] = await Promise.all([
        api.entities.CurtainCategory.list("order", 200).catch(() => [] as CurtainCategoryItem[]),
        api.entities.RenderTemplate.list("-updated_date", 200).catch(() => [] as RenderTemplateRow[]),
      ]);
      setCategories((Array.isArray(cats) ? cats : []) as CurtainCategoryItem[]);
      setTemplates((Array.isArray(tpls) ? tpls : []) as RenderTemplateRow[]);
    } catch {
      setError("بارگذاری ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const rowOf = useCallback(
    (slug: string) => {
      const key = String(slug || "").toLowerCase();
      return templates.find((r) => String(r.style || "").toLowerCase() === key);
    },
    [templates],
  );

  const imageOf = useCallback(
    (slug: string) => rowOf(slug)?.image || null,
    [rowOf],
  );

  const covered = useMemo(
    () => installCats.filter((c) => imageOf(c.slug)).length,
    [installCats, imageOf],
  );

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key);
    setError("");
    setOkMsg("");
    try {
      await task();
      refreshRenderTemplates();
      await reload();
      setOkMsg("ذخیره شد.");
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const uploadSingle = async (cat: CurtainCategoryItem, file: File) => {
    const compressed = await compressImage(file);
    const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
    const url = res?.file_url || res?.url || res?.path;
    if (!url) throw new Error("آپلود ناموفق");

    const existing = rowOf(cat.slug);
    if (existing) {
      await api.entities.RenderTemplate.update(existing.id, {
        style: cat.slug,
        image: url,
      });
    } else {
      await api.entities.RenderTemplate.create({ style: cat.slug, image: url });
    }

    // آینه روی mechanism تا مدل‌هایی که فقط با سازوکار match می‌شوند هم پیدا کنند
    const mechanism = cat.mechanism || resolveStyle({ category_slug: cat.slug });
    if (mechanism && mechanism !== cat.slug) {
      const mechRow = templates.find(
        (r) => String(r.style || "").toLowerCase() === String(mechanism).toLowerCase()
      );
      if (mechRow) {
        await api.entities.RenderTemplate.update(mechRow.id, { image: url });
      } else {
        await api.entities.RenderTemplate.create({ style: mechanism, image: url });
      }
    }
  };

  const handleMultiUpload = async (cat: CurtainCategoryItem, files: File[]) => {
    if (!files.length) return;
    setBusy(cat.slug);
    setError("");
    try {
      for (const file of files) {
        await uploadSingle(cat, file);
      }
      adminToast("create", "قالب رنگ سبز", cat.name);
      await reload();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (cat: CurtainCategoryItem) => {
    if (!window.confirm(`قالب سبز دسته «${cat.name}» حذف شود؟`)) return;
    const existing = rowOf(cat.slug);
    if (existing) {
      await run(cat.slug, async () => {
        await api.entities.RenderTemplate.delete(existing.id);
      });
    }
  };

  if (loading) {
    return (
      <div className="mt-6 flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="mb-3">
        <span className="eyebrow mb-2 block">قالب سبز (chroma) — دسته‌های فنی</span>
        <p className="max-w-3xl text-xs leading-6 text-muted-foreground">
          برای هر دسته یک <strong>عکس باکیفیت با ناحیه پارچه سبز chroma</strong> آپلود کنید (مثل رومن تاشو، زبرا نواری، پنل، کرکره).
          بدون این آپلود، رندر مدل‌ها ضعیف یا کارتونی می‌شود. ساخت خودکار هندسی حذف شده است.
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
            const mechLabel = (MECHANISM_LABELS as Record<string, string>)[mechanism] || mechanism;
            const img = imageOf(cat.slug) ?? undefined;
            const hasImg = Boolean(img);
            return (
              <div
                key={cat.id || cat.slug}
                className="rounded-xl border border-secondary/60 bg-background p-2"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary/30">
                  {hasImg ? (
                    <OptimizedImage
                      src={img}
                      alt={cat.name}
                      fill
                      className="object-cover"
                      sizes="192px"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                      <Upload className="h-5 w-5 text-muted-foreground/50" />
                      <span className="text-[10px] leading-4 text-muted-foreground">
                        هنوز قالب سبز ندارد
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-bold text-foreground truncate">{cat.name}</p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground" dir="ltr">
                  {cat.slug}
                </p>
                <p className="mt-0.5 text-[9px] text-muted-foreground">
                  سازوکار: {mechLabel}
                </p>
                <div className="mt-2 flex gap-1.5">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={busy === cat.slug}
                      onChange={(e) => {
                        const list = [...(e.target.files || [])];
                        e.target.value = "";
                        if (list.length) void handleMultiUpload(cat, list);
                      }}
                    />
                    <label
                      className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-primary/50 py-1.5 text-[10px] font-bold text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busy === cat.slug ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      {hasImg ? "تعویض عکس" : "آپلود قالب سبز"}
                    </label>
                  </div>
                  {hasImg && (
                    <button
                      type="button"
                      disabled={busy === cat.slug}
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
