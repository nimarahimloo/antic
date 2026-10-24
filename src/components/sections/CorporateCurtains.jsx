import { Link } from "react-router-dom";
import { Phone, ArrowLeft } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useCurtainCategories, pickSystemCategories } from "@/hooks/useCurtainCategories";

export default function CorporateCurtains() {
  const { categories, loading } = useCurtainCategories();
  const items = pickSystemCategories(categories, 6);

  if (loading && !items.length) {
    return (
      <section id="corporate" className="border-t border-secondary/40 bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="h-8 w-72 animate-pulse rounded bg-secondary/40" />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-3xl bg-secondary/30" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section id="corporate" className="border-t border-secondary/40 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-4 block">کاتالوگ · سیستم‌های پرده</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
              سیستم‌هایی با <span className="text-gold-gradient">دقت معماری</span>
            </h2>
          </div>
          <p className="max-w-md font-body text-sm leading-7 text-muted-foreground">
            بر اساس `mechanism` و زیردسته‌های ثبت‌شده در پنل ادمین — بدون لیست ثابت نام.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.slug}
              className="group light-leak overflow-hidden rounded-3xl border border-secondary/60 bg-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                    fittingType="fill"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary/40">
                    <span className="font-display text-lg font-bold text-muted-foreground">{item.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
              </div>
              <div className="p-7">
                <h3 className="font-display text-xl font-bold text-foreground">{item.name}</h3>
                {item.description && (
                  <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">{item.description}</p>
                )}
                {item.subcategories?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.subcategories.slice(0, 4).map((t) => (
                      <span
                        key={t.slug || t.name}
                        className="rounded-full border border-secondary/70 px-3 py-1 font-body text-[11px] text-muted-foreground"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Link
                    to={`/catalog?category=${item.slug}`}
                    className="btn-ghost-gold flex-1 justify-center"
                  >
                    کاتالوگ
                  </Link>
                  <a href="tel:02112345678" className="btn-ghost-gold flex-1 justify-center">
                    <Phone className="h-4 w-4" /> مشاوره
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 text-center">
          <Link
            to="/catalog"
            className="font-body text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            مشاهده کامل کاتالوگ
          </Link>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </div>
      </div>
    </section>
  );
}
