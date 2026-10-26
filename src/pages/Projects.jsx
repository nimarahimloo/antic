import { Link } from "react-router-dom";
import CategoryCoverCard from "@/components/CategoryCoverCard";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { mosaicGridClass, mosaicItemClass } from "@/lib/mosaicLayout";

export default function Projects() {
  const { categories, loading } = useCurtainCategories();

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">نمونه کارها</span>
          <h1 className="font-display text-3xl font-black leading-tight text-foreground lg:text-5xl">
            نمونه‌های اجرا شده
          </h1>
          <p className="mt-4 max-w-2xl font-body text-sm leading-8 text-muted-foreground lg:text-base">
            نگاهی به پروژه‌های نصب‌شده در فضاهای مسکونی و اداری. هر دسته را باز کنید تا نمونه‌های
            مرتبط را ببینید.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        {loading ? (
          <p className="font-body text-sm text-muted-foreground">در حال بارگذاری…</p>
        ) : !categories?.length ? (
          <p className="font-body text-sm text-muted-foreground">
            به‌زودی نمونه‌های جدید در این بخش قرار می‌گیرد.
          </p>
        ) : (
          <div className={mosaicGridClass}>
            {categories.map((c, i) => (
              <div key={c.slug} className={`min-h-0 ${mosaicItemClass(i)}`}>
                <CategoryCoverCard
                  name={c.name}
                  image={c.image}
                  description={c.description}
                  to={`/projects/category/${c.slug}`}
                  className="h-full lg:min-h-full"
                  aspect="aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[200px]"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/catalog" className="font-body text-sm text-primary hover:underline">
            مشاهده کاتالوگ مدل‌ها
          </Link>
        </div>
      </section>
    </div>
  );
}
