import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CategoryCoverCard from "@/components/CategoryCoverCard";
import ProjectCard from "@/components/ProjectCard";
import { mosaicGridClass, mosaicItemClass } from "@/lib/mosaicLayout";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { base44 } from "@/api/base44Client";

export default function PortfolioCategoryPage() {
  const { slug } = useParams();
  const { categories, loading: catsLoading } = useCurtainCategories();
  const category = useMemo(
    () => categories.find((c) => c.slug === slug) || null,
    [categories, slug]
  );

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoadingProjects(true);
    base44.entities.Project.filter({ category_slug: slug }, "-created_date", 100)
      .then((rows) => setProjects(Array.isArray(rows) ? rows : []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [slug]);

  const rootProjects = useMemo(
    () => projects.filter((p) => !p.subcategory),
    [projects]
  );

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
          بازگشت به نمونه‌های اجرا
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background pb-20">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex flex-wrap items-center gap-2 font-body text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            خانه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link to="/projects" className="hover:text-primary">
            نمونه‌های اجرا شده
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{category.name}</span>
        </nav>
      </div>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="eyebrow mb-3 block">نمونه کار</span>
            <h1 className="font-display text-3xl font-black text-foreground lg:text-4xl">
              {category.name}
            </h1>
            {category.description ? (
              <p className="mt-4 font-body text-sm leading-8 text-muted-foreground">
                {category.description}
              </p>
            ) : null}
          </div>
          {category.image ? (
            <div className="overflow-hidden rounded-3xl border border-secondary/60">
              <img
                src={category.image}
                alt={category.name}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {category.subcategories?.length ? (
          <div className="mt-12">
            <h2 className="mb-5 font-display text-lg font-bold text-foreground">زیردسته‌ها</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {category.subcategories.map((sub) => (
                <CategoryCoverCard
                  key={sub.slug}
                  name={sub.name}
                  image={sub.image || category.image}
                  to={`/projects/category/${category.slug}/${sub.slug}`}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-12">
          <h2 className="mb-5 font-display text-lg font-bold text-foreground">نمونه‌ها</h2>
          {loadingProjects ? (
            <div className={mosaicGridClass}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`min-h-[200px] animate-pulse rounded-2xl bg-secondary/30 ${mosaicItemClass(i - 1)}`}
                />
              ))}
            </div>
          ) : rootProjects.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">
              {category.subcategories?.length
                ? "نمونه‌های این دسته در زیردسته‌ها قرار دارند."
                : "هنوز نمونه‌ای در این دسته ثبت نشده است."}
            </p>
          ) : (
            <div className={mosaicGridClass}>
              {rootProjects.map((p, i) => (
                <ProjectCard key={p.id} project={p} className={mosaicItemClass(i)} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
