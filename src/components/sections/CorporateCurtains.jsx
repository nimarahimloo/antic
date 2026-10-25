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
            <span className="eyebrow mb-4 block">سیستم‌های پرده</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
              سیستم‌های <span className="text-gold-gradient">کاربردی</span>
            </h2>
          </div>
          <p className="max-w-md font-body text-sm leading-7 text-muted-foreground">
            مناسب فضاهای اداری و پروژه‌های بزرگ — از کاتالوگ مدل مرتبط را ببینید.
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
                    <span className="font-display text-sm text-muted-foreground">{item.name}</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-bold text-foreground">{item.name}</h3>
                {item.description && (
                  <p className="mt-2 line-clamp-2 font-body text-xs leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                )}
                <Link
                  to={`/catalog?category=${item.slug}`}
                  className="mt-4 inline-flex items-center gap-2 font-display text-xs font-bold text-primary"
                >
                  مشاهده در کاتالوگ
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <a href="tel:02112345678" className="btn-gold">
            <Phone className="h-4 w-4" /> مشاوره پروژه
          </a>
          <Link to="/catalog" className="btn-ghost-gold">
            کاتالوگ کامل
          </Link>
        </div>
      </div>
    </section>
  );
}
