"use client";

import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import CategoryCoverCard from "@/components/CategoryCoverCard";
import { mosaicGridClass, mosaicItemClass } from "@/lib/mosaicLayout";
import PageHero from "@/components/PageHero";

interface ProjectCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string;
}

interface ProjectsListProps {
  categories?: Array<{ id: string; name: string; slug: string; image: string | null; description: string }>;
}

export default function ProjectsList({ categories = [] }: ProjectsListProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const activeCategory = searchParams.get("category") || undefined;
  const activeSubcategory = searchParams.get("subcategory") || undefined;

  const handleCategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug) params.set("category", slug);
    else params.delete("category");
    params.delete("subcategory");
    replace(`${pathname}?${params.toString()}`);
  };

  const handleSubcategoryChange = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug) params.set("subcategory", slug);
    else params.delete("subcategory");
    replace(`${pathname}?${params.toString()}`);
  };

  const filteredCategories = categories.filter((c) => {
    if (!activeCategory) return true;
    return c.slug === activeCategory;
  });

  if (!categories.length) {
    return (
      <div className="bg-background">
        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
          <p className="font-body text-sm text-muted-foreground text-center py-12">
            به‌زودی نمونه‌های جدید در این بخش قرار می‌گیرد.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        {/* Category filter tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange("")}
            className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
              !activeCategory
                ? "border-primary bg-primary/10 text-primary"
                : "border-secondary/70 text-muted-foreground hover:border-primary/50"
            }`}
          >
            همه
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => handleCategoryChange(c.slug)}
              className={`rounded-full border px-4 py-2 font-body text-sm transition-colors ${
                activeCategory === c.slug
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/70 text-muted-foreground hover:border-primary/50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Subcategory filter */}
        {activeCategory && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSubcategoryChange("")}
              className={`rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                !activeSubcategory
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/70 text-muted-foreground hover:border-primary/50"
              }`}
            >
              همه
            </button>
            {/* In a real app, you'd fetch subcategories from the category */}
          </div>
        )}

        <div className={mosaicGridClass}>
          {filteredCategories.map((c, i) => (
            <div key={c.slug} className={`min-h-0 ${mosaicItemClass(i)}`}>
              <a
                href={`/projects/category/${c.slug}`}
                className="block h-full"
              >
                <div className="relative h-full w-full overflow-hidden rounded-3xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_rgba(201,162,39,0.35)]">
                  <div className="absolute inset-0">
                    {c.image ? (
                      <img
                        src={c.image}
                        alt={c.name}
                        className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`h-full w-full bg-gradient-to-br ${
                          c.slug === "velvet"
                            ? "from-[#4a4035] via-[#2f2922] to-[#1a1612]"
                            : c.slug === "sheer"
                            ? "from-[#f5f2eb] via-[#e8e2d6] to-[#d4cdc0]"
                            : c.slug === "silk"
                            ? "from-[#e6d9bf] via-[#c9b48a] to-[#a89068]"
                            : "from-[#d9cfc0] via-[#b5a48c] to-[#8f7d64]"
                        }`}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                  <div className="relative mt-auto flex flex-1 flex-col justify-end p-6">
                    <span className="mb-2 font-display text-[10px] tracking-[0.35em] text-primary/90">
                      نمونه اجرا
                    </span>
                    <h3 className="font-display text-lg font-black text-foreground">{c.name}</h3>
                    {c.description && (
                      <p className="mt-1 font-body text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                    )}
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a href="/catalog" className="font-body text-sm text-primary hover:underline">
            مشاهده کاتالوگ مدل‌ها
          </a>
        </div>
      </section>
    </div>
  );
}