import Link from "next/link";
import { mosaicGridClass, mosaicItemClass } from "@/lib/mosaicLayout";
import PageHero from "@/components/PageHero";
import CategoryCoverCard from "@/components/CategoryCoverCard";

interface ProjectCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
}

interface ProjectsListServerProps {
  categories: ProjectCategory[];
  pageKey?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
}

export default function ProjectsListServer({
  categories,
  pageKey = "projects",
  eyebrow = "نمونه کارها",
  title = "نمونه‌های اجرا شده",
  description = "نگاهی به پروژه‌های نصب‌شده در فضاهای مسکونی و اداری.",
}: ProjectsListServerProps) {
  return (
    <div className="bg-background">
      <PageHero
        pageKey={pageKey}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        {categories.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground text-center py-12">
            به‌زودی نمونه‌های جدید در این بخش قرار می‌گیرد.
          </p>
        ) : (
          <>
            <div className={mosaicGridClass}>
              {categories.map((c, i) => (
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
          </>
        )}
      </section>
    </div>
  );
}