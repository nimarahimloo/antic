import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";

export default function FabricCollection() {
  const { categories, loading } = useCurtainCategories();
  const items = (categories || []).slice(0, 8);

  return (
    <section className="border-t border-secondary/40 bg-card/30 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-10 max-w-2xl">
          <span className="eyebrow mb-3 block">انواع پرده</span>
          <h2 className="font-display text-3xl font-black text-foreground lg:text-4xl">
            مجموعه‌ای برای هر فضا
          </h2>
          <p className="mt-4 font-body text-sm leading-8 text-muted-foreground">
            از شید و زبرا تا رومن و پرده‌های کلاسیک — دسته‌ای را انتخاب کنید که با نور و سبک
            دکوراسیون شما هماهنگ است.
          </p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-muted-foreground">در حال بارگذاری…</p>
        ) : items.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">به‌زودی دسته‌ها در این بخش نمایش داده می‌شوند.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((fabric) => (
              <Link
                key={fabric.slug}
                to={`/catalog?category=${fabric.slug}`}
                className="group overflow-hidden rounded-2xl border border-secondary/60 bg-card transition hover:border-primary/40"
              >
                <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
                  {fabric.image ? (
                    <img
                      src={fabric.image}
                      alt={fabric.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-display text-sm text-muted-foreground">
                      {fabric.name}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-base font-bold text-foreground">{fabric.name}</h3>
                  {fabric.description && (
                    <p className="mt-1 line-clamp-2 font-body text-xs leading-6 text-muted-foreground">
                      {fabric.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/catalog" className="inline-flex items-center gap-2 font-body text-sm text-primary hover:underline">
            مشاهده کامل کاتالوگ
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
