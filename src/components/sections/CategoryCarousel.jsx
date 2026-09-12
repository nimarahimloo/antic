import { Link } from "react-router-dom";
import { CATEGORIES } from "@/lib/catalogData";

export default function CategoryCarousel() {
  const items = [...CATEGORIES, ...CATEGORIES];

  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="mx-auto mb-10 max-w-7xl px-5 lg:px-10">
        <span className="eyebrow mb-3 block">دسته‌بندی پرده</span>
        <h2 className="font-display text-2xl font-black text-foreground lg:text-3xl">
          انواع <span className="text-gold-gradient">پرده</span> و کالکشن
        </h2>
      </div>
      <div className="overflow-hidden" dir="ltr">
        <div className="flex w-max gap-5 animate-carousel px-5 lg:gap-6 lg:px-10">
          {items.map((cat, i) => (
            <Link
              key={`${cat.slug}-${i}`}
              to={`/catalog?category=${cat.slug}`}
              className="group relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl border border-secondary/60 bg-card transition-all duration-500 hover:border-primary lg:h-56 lg:w-56"
              dir="rtl"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                <h3 className="font-display text-sm font-bold text-foreground lg:text-lg">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}