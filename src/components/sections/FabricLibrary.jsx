import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useCurtainCategories, pickVisualCategories } from "@/hooks/useCurtainCategories";
import { SITE_PHONE_HREF } from "@/lib/siteContact";

export default function FabricLibrary() {
  const { categories, loading } = useCurtainCategories();
  const items = pickVisualCategories(categories, 6);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (items.length > 0 && active >= items.length) setActive(0);
  }, [items.length, active]);

  if (loading && !items.length) {
    return (
      <section id="fabrics" className="border-t border-secondary/40 bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="h-8 w-64 animate-pulse rounded bg-secondary/40" />
          <div className="mt-10 h-[460px] animate-pulse rounded-2xl bg-secondary/30" />
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  const current = items[Math.min(active, items.length - 1)] || items[0];

  return (
    <section id="fabrics" className="border-t border-secondary/40 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-4 block">کاتالوگ · دسته‌بندی</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
              حس <span className="text-gold-gradient">بافت</span> را کشف کنید
            </h2>
          </div>
          <p className="max-w-md font-body text-sm leading-7 text-muted-foreground">
            دسته‌بندی‌های کاتالوگ را مرور کنید و مدل مناسب فضای خود را انتخاب کنید.
          </p>
        </div>

        <div className="hidden gap-3 md:flex md:h-[460px]">
          {items.map((f, i) => (
            <button
              key={f.slug}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`group light-leak relative overflow-hidden rounded-2xl border transition-all duration-700 ease-out ${
                active === i ? "flex-[5] border-primary/50" : "flex-[1] border-secondary/60"
              }`}
            >
              {f.image ? (
                <Image
                  src={f.image}
                  alt={f.name}
                  className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                  fittingType="fill"
                />
              ) : (
                <div className="h-full w-full bg-secondary/40" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
              <div className="absolute bottom-0 right-0 left-0 p-5 text-right">
                <span className="font-display text-[10px] tracking-[0.3em] text-primary">{f.slug}</span>
                <h3 className="font-display text-xl font-bold text-foreground md:text-2xl">{f.name}</h3>
                {active === i && (
                  <div className="mt-3 animate-fade-up">
                    {f.description && (
                      <p className="mb-3 line-clamp-2 font-body text-xs leading-6 text-muted-foreground">{f.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/catalog?category=${f.slug}`} className="btn-ghost-gold text-xs">
                        مشاهده کاتالوگ
                      </Link>
                      <a href={SITE_PHONE_HREF} className="btn-ghost-gold text-xs">
                        <Phone className="h-3.5 w-3.5" /> مشاوره
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:hidden">
          {items.map((f) => (
            <article key={f.slug} className="light-leak overflow-hidden rounded-2xl border border-secondary/60 bg-card">
              <div className="relative aspect-[16/10] overflow-hidden">
                {f.image ? (
                  <Image src={f.image} alt={f.name} className="h-full w-full" fittingType="fill" />
                ) : (
                  <div className="h-full w-full bg-secondary/40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute bottom-4 right-5">
                  <span className="font-display text-[10px] tracking-[0.3em] text-primary">{f.slug}</span>
                  <h3 className="font-display text-2xl font-bold text-foreground">{f.name}</h3>
                </div>
              </div>
              <div className="p-6">
                {f.description && (
                  <p className="font-body text-sm leading-7 text-muted-foreground">{f.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/catalog?category=${f.slug}`} className="btn-ghost-gold text-xs">
                    کاتالوگ
                  </Link>
                  <a href={SITE_PHONE_HREF} className="btn-ghost-gold text-xs">
                    <Phone className="h-3.5 w-3.5" /> مشاوره
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 text-center">
          <Link
            to={current ? `/catalog?category=${current.slug}` : "/catalog"}
            className="font-body text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            مشاهده همه دسته‌ها در کاتالوگ
          </Link>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </div>
      </div>
    </section>
  );
}
