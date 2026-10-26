import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import CategoryCoverCard from "@/components/CategoryCoverCard";

export default function FabricCollection() {
  const { categories, loading } = useCurtainCategories({ catalogOnly: true });
  const items = (categories || []).slice(0, 8);

  if (loading && !items.length) {
    return (
      <section className="border-t border-secondary/40 bg-background py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="h-8 w-64 animate-pulse rounded bg-secondary/40" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-secondary/30" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="border-t border-secondary/40 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-4 block">دسته‌بندی کاتالوگ</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
              انتخاب بر اساس <span className="text-gold-gradient">سبک</span>
            </h2>
          </div>
          <Link to="/catalog" className="inline-flex items-center gap-2 font-display text-sm font-bold text-primary">
            مشاهده کاتالوگ
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((cat) => (
            <CategoryCoverCard
              key={cat.slug}
              title={cat.name}
              image={cat.image}
              href={`/catalog?category=${cat.slug}`}
              description={cat.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
