"use client";

import Link from "next/link";
import CategoryCoverCard from "@/components/CategoryCoverCard";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { mosaicGridClass, mosaicItemClass } from "@/lib/mosaicLayout";
import PageHero from "@/components/PageHero";

interface ProjectCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
}

export default function ProjectsList({
  category: _category,
  subcategory: _subcategory,
}: {
  category?: string;
  subcategory?: string;
}) {
  const { categories, loading } = useCurtainCategories();

  if (loading) {
    return (
      <div className="bg-background">
        <PageHero
          pageKey="projects"
          eyebrow="نمونه کارها"
          title="نمونه‌های اجرا شده"
          description="نگاهی به پروژه‌های نصب‌شده در فضاهای مسکونی و اداری."
        />

        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
          <p className="font-body text-sm text-muted-foreground">در حال بارگذاری…</p>
        </section>
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="bg-background">
        <PageHero
          pageKey="projects"
          eyebrow="نمونه کارها"
          title="نمونه‌های اجرا شده"
          description="نگاهی به پروژه‌های نصب‌شده در فضاهای مسکونی و اداری."
        />

        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
          <p className="font-body text-sm text-muted-foreground">
            به‌زودی نمونه‌های جدید در این بخش قرار می‌گیرد.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <PageHero
        pageKey="projects"
        eyebrow="نمونه کارها"
        title="نمونه‌های اجرا شده"
        description="نگاهی به پروژه‌های نصب‌شده در فضاهای مسکونی و اداری."
      />

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        <div className={mosaicGridClass}>
          {(categories as ProjectCategory[]).map((c, i) => (
            <div key={c.slug} className={`min-h-0 ${mosaicItemClass(i)}`}>
              <CategoryCoverCard
                name={c.name || ""}
                image={c.image}
                description={c.description}
                href={`/projects/category/${c.slug}`}
                className="h-full lg:min-h-full"
                aspect="aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[200px]"
              />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/catalog" className="font-body text-sm text-primary hover:underline">
            مشاهده کاتالوگ مدل‌ها
          </Link>
        </div>
      </section>
    </div>
  );
}