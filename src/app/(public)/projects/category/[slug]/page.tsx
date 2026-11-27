import { Suspense } from "react";
import { notFound as nextNotFound } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import CategoryCoverCard from "@/components/CategoryCoverCard";
import ProjectCard from "@/components/ProjectCard";
import { mosaicGridClass, mosaicItemClass } from "@/lib/mosaicLayout";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { api } from "@/api";
import { ProjectsPageSkeleton } from "@/components/Skeletons";
import { getCurtainCategory } from "@/lib/server-data";

export const revalidate = 3600; // ISR: revalidate category projects every hour

interface PortfolioCategoryPageContentProps {
  params: Promise<{ slug: string }>;
}

async function getCategoryAndProjects({ params }: PortfolioCategoryPageContentProps) {
  const { slug } = await params;
  const category = await getCurtainCategory(slug);
  if (!category) return null;

  let projects: Array<{ id: string; title: string; cover_image?: string; subcategory?: string }> = [];
  try {
    const rows = await api.entities.Project.filter({ category_slug: slug }, { sort: "-created_date", limit: 100 });
    projects = Array.isArray(rows) ? rows as Array<{ id: string; title: string; cover_image?: string; subcategory?: string }> : [];
  } catch {
    projects = [];
  }

  return { category, projects };
}

type CategoryType = Awaited<ReturnType<typeof getCurtainCategory>>;

function PortfolioCategoryPageContent({ category, projects }: { category: NonNullable<CategoryType>; projects: Array<{ id: string; title: string; cover_image?: string; subcategory?: string }> }) {
  const { categories, loading: catsLoading } = useCurtainCategories();
  const categoryFromHook = useMemo(
    () => categories.find((c) => c.slug === category.slug) || null,
    [categories, category.slug]
  );

  // Use server-provided category if hook hasn't loaded yet
  const effectiveCategory = categoryFromHook || category;

  const rootProjects = useMemo(
    () => projects.filter((p) => !p.subcategory),
    [projects]
  );

  if (catsLoading && !effectiveCategory) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!effectiveCategory) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">دسته پیدا نشد</h1>
        <Link href="/projects" className="btn-gold mt-6">
          بازگشت به نمونه‌های اجرا
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background pb-20">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex flex-wrap items-center gap-2 font-body text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            خانه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link href="/projects" className="hover:text-primary">
            نمونه‌های اجرا شده
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{effectiveCategory.name}</span>
        </nav>
      </div>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="eyebrow mb-3 block">نمونه کار</span>
            <h1 className="font-display text-3xl font-black text-foreground lg:text-4xl">
              {effectiveCategory.name}
            </h1>
            {effectiveCategory.description ? (
              <p className="mt-4 font-body text-sm leading-8 text-muted-foreground">
                {effectiveCategory.description}
              </p>
            ) : null}
          </div>
          {effectiveCategory.image ? (
            <div className="overflow-hidden rounded-3xl border border-secondary/60">
              <img
                src={effectiveCategory.image}
                alt={effectiveCategory.name}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {effectiveCategory.subcategories?.length ? (
          <div className="mt-12">
            <h2 className="mb-5 font-display text-lg font-bold text-foreground">زیردسته‌ها</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {effectiveCategory.subcategories.map((sub: { name: string; slug: string }) => (
                <CategoryCoverCard
                  key={sub.slug}
                  name={sub.name}
                  image={effectiveCategory.image ?? undefined}
                  href={`/projects/category/${effectiveCategory.slug}/${sub.slug}`}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-12">
          <h2 className="mb-5 font-display text-lg font-bold text-foreground">نمونه‌ها</h2>
          <div className={mosaicGridClass}>
            {rootProjects.map((p, i) => (
              <ProjectCard key={p.id} project={p} className={mosaicItemClass(i)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function PortfolioCategoryPage({
  params,
}: PortfolioCategoryPageContentProps) {
  const data = await getCategoryAndProjects({ params });

  if (!data) {
    nextNotFound();
  }

  return (
    <Suspense fallback={<ProjectsPageSkeleton />}>
      <PortfolioCategoryPageContent category={data.category} projects={data.projects} />
    </Suspense>
  );
}
