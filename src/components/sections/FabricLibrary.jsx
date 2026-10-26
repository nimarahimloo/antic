import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";

/** چهار بافت اصلی هارمونی — نام و کاور از جدول CurtainCategory */
const HARMONY_SLUGS = ["cotton", "silk", "sheer", "velvet"];

const FALLBACK_META = {
  cotton: {
    name: "کتان",
    blurb: "بافت طبیعی و مات؛ مناسب فضای روزمره و روشن.",
    tone: "from-[#c4b59a]/90 via-[#a8926e]/40 to-transparent",
  },
  silk: {
    name: "حریر",
    blurb: "درخشش نرم و لطیف؛ برای پذیرایی و فضاهای رسمی.",
    tone: "from-[#d4c4a8]/90 via-[#b89b6a]/35 to-transparent",
  },
  sheer: {
    name: "تور",
    blurb: "عبور نور و حفظ حریم؛ لایهٔ اول کنار پنجره.",
    tone: "from-[#e8e4dc]/90 via-[#cfc8bc]/30 to-transparent",
  },
  velvet: {
    name: "مخمل",
    blurb: "عمق رنگ و حس لوکس؛ برای تاریک‌کردن و جلوهٔ سنگین.",
    tone: "from-[#3b352c]/95 via-[#2a241c]/50 to-transparent",
  },
};

export default function FabricLibrary() {
  const { categories, loading } = useCurtainCategories();

  const items = useMemo(() => {
    const bySlug = new Map((categories || []).map((c) => [String(c.slug).toLowerCase(), c]));
    return HARMONY_SLUGS.map((slug) => {
      const cat = bySlug.get(slug);
      const fb = FALLBACK_META[slug];
      return {
        slug,
        name: cat?.name || fb.name,
        description: (cat?.description && String(cat.description).trim()) || fb.blurb,
        image: cat?.image || null,
        tone: fb.tone,
        // نمونه‌های اجرا شده + کاور همان دسته
        href: `/projects/category/${encodeURIComponent(slug)}`,
      };
    });
  }, [categories]);

  return (
    <section id="fabrics" className="border-t border-secondary/40 bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-3 block">بافت · رنگ</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
              هارمونی <span className="text-gold-gradient">بافت و رنگ</span>
            </h2>
          </div>
          <p className="max-w-md font-body text-sm leading-7 text-muted-foreground">
            چهار بافت اصلی را کنار هم ببینید و نمونه‌های اجرا شده هر بافت را مرور کنید.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {loading &&
            !categories?.length &&
            HARMONY_SLUGS.map((s) => (
              <div key={s} className="aspect-[3/4] animate-pulse rounded-3xl bg-secondary/30" />
            ))}

          {items.map((item) => (
            <Link
              key={item.slug}
              to={item.href}
              className="group relative flex aspect-[3/4] flex-col overflow-hidden rounded-3xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_rgba(201,162,39,0.35)]"
            >
              <div className="absolute inset-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                    fittingType="fill"
                  />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-br ${
                      item.slug === "velvet"
                        ? "from-[#4a4035] via-[#2f2922] to-[#1a1612]"
                        : item.slug === "sheer"
                          ? "from-[#f5f2eb] via-[#e8e2d6] to-[#d4cdc0]"
                          : item.slug === "silk"
                            ? "from-[#e6d9bf] via-[#c9b48a] to-[#a89068]"
                            : "from-[#d9cfc0] via-[#b5a48c] to-[#8f7d64]"
                    }`}
                  />
                )}
                <div className={`absolute inset-0 bg-gradient-to-t ${item.tone}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent opacity-90" />
              </div>

              <div className="relative mt-auto flex flex-1 flex-col justify-end p-6">
                <span className="mb-2 font-display text-[10px] tracking-[0.35em] text-primary/90">
                  {item.slug.toUpperCase()}
                </span>
                <h3 className="font-display text-2xl font-bold text-foreground drop-shadow-sm lg:text-[1.65rem]">
                  {item.name}
                </h3>
                <p className="mt-2 line-clamp-2 font-body text-xs leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 font-display text-xs font-bold text-primary opacity-90 transition-all group-hover:gap-2.5">
                  نمونه‌های اجرا
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
