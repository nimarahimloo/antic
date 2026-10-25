import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useCurtainCategories, pickFeaturedCategories } from "@/hooks/useCurtainCategories";

export default function PremiumShowcase() {
  const { categories, loading } = useCurtainCategories();
  const items = pickFeaturedCategories(categories, 6);

  if (loading && !items.length) return null;
  if (!items.length) return null;

  return (
    <section className="relative overflow-hidden border-y border-secondary/40 bg-card/30 py-20 lg:py-28">
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/8 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-12 text-center">
          <span className="eyebrow mb-4 block">انتخاب‌های ویژه</span>
          <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-5xl">
            مجموعه‌های <span className="text-gold-gradient">منتخب</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            چند دسته پرطرفدار برای شروع انتخاب — هر مجموعه را باز کنید و مدل‌ها را ببینید.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to={`/catalog?category=${item.slug}`}
                className="group light-leak relative block h-72 overflow-hidden rounded-3xl border border-secondary/60 bg-card transition-all duration-500 hover:border-primary lg:h-80"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-secondary/40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
                  <div className="mb-3 h-px w-12 bg-primary" />
                  <h3 className="font-display text-2xl font-black text-foreground lg:text-3xl">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="mt-2 max-w-sm font-body text-xs leading-6 text-muted-foreground lg:text-sm">
                      {item.description}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-2 font-display text-xs font-bold text-primary">
                    مشاهده مجموعه
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
