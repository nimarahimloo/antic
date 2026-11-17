import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import { mosaicGridClass, mosaicItemClass } from "@/lib/mosaicLayout";
import { usePortfolioCategories } from "@/hooks/usePortfolioCategories";
import { base44 } from "@/api/base44Client";

export default function PortfolioSubcategoryPage() {
  const { slug, sub } = useParams();
  const { categories, loading: catsLoading } = usePortfolioCategories();
  const category = useMemo(
    () => categories.find((c) => c.slug === slug) || null,
    [categories, slug]
  );
  const subMeta = useMemo(
    () => category?.subcategories?.find((s) => s.slug === sub) || null,
    [category, sub]
  );

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    base44.entities.Project.filter({ category_slug: slug }, "-created_date", 100)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setProjects(list.filter((p) => String(p.subcategory || "") === String(sub || "")));
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [slug, sub]);

  if (catsLoading && !category) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">دسته پیدا نشد</h1>
        <Link to="/projects" className="btn-gold mt-6">
          بازگشت
        </Link>
      </div>
    );
  }

  const title = subMeta?.name || sub;

  return (
    <div className="bg-background pb-20">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex flex-wrap items-center gap-2 font-body text-xs text-muted-foreground">
          <Link to="/projects" className="hover:text-primary">
            نمونه‌های اجرا شده
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link to={`/projects/category/${category.slug}`} className="hover:text-primary">
            {category.name}
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{title}</span>
        </nav>
      </div>

      <section className="border-b border-secondary/40 bg-card/30">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-10">
          <span className="eyebrow mb-3 block">{category.name}</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">{title}</h1>
          {category.description && (
            <p className="mt-4 max-w-2xl font-body text-sm leading-7 text-muted-foreground">
              {category.description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10">
        {loading ? (
          <div className={mosaicGridClass}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`min-h-[200px] animate-pulse rounded-2xl bg-secondary/30 ${mosaicItemClass(i - 1)}`}
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <p className="py-16 text-center font-body text-sm text-muted-foreground">
            هنوز نمونه‌ای در این زیردسته ثبت نشده است.
          </p>
        ) : (
          <div className={mosaicGridClass}>
            {projects.map((p, i) => (
              <ProjectCard key={p.id} project={p} className={mosaicItemClass(i)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
