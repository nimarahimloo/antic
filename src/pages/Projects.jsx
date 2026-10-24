import CategoryCoverCard from "@/components/CategoryCoverCard";
import { usePortfolioCategories } from "@/hooks/usePortfolioCategories";

/** نمونه‌های اجرا شده — سطح اول: کارت دسته‌بندی */
export default function Projects() {
  const { categories, loading } = usePortfolioCategories();

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">نمونه کارهای اجرا شده</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-5xl">
            نمونه‌های <span className="text-gold-gradient">اجرا شده</span>
          </h1>
          <p className="mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            دسته‌بندی نمونه‌ها را انتخاب کنید تا زیردسته‌ها و نمونه‌های همان گروه را ببینید.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        {loading && !categories.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-secondary/40" />
            ))}
          </div>
        ) : !categories.length ? (
          <div className="py-20 text-center">
            <p className="font-body text-sm text-muted-foreground">
              هنوز دسته‌ای برای نمونه‌های اجرا ثبت نشده است.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <CategoryCoverCard
                key={c.slug}
                name={c.name}
                image={c.image}
                description={c.description}
                to={`/projects/category/${c.slug}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
