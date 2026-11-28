"use client";

import Link from "next/link";
import { OptimizedImage } from "@/components/ui/image";

interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  order: number;
  active: boolean;
}

interface CollectionsSectionProps {
  collections?: Collection[];
}

export default function CollectionsSection({ collections = [] }: CollectionsSectionProps) {
  const activeCollections = collections.filter((c) => c.active);

  if (!activeCollections.length) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24" aria-labelledby="collections-heading">
      <div className="mb-14 text-center">
        <h2 id="collections-heading" className="font-display text-3xl font-black text-foreground lg:text-4xl">
          مجموعه‌های ما
        </h2>
        <p className="mt-6 font-body text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          کاوش کنید در مجموعه‌های منتخب پرده آنتیک برای یافتن سبک و طراحی مورد نظر خود
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activeCollections.map((collection, index) => (
          <Link
            key={collection.slug}
            href={`/collections/${collection.slug}`}
            className="group block overflow-hidden rounded-xl border border-secondary/50 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_40px_-12px_rgba(201,162,39,0.25)]"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              {collection.coverImage ? (
                <OptimizedImage
                  src={collection.coverImage}
                  alt={collection.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#d9cfc0] via-[#b5a48c] to-[#8f7d64]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
            </div>
            <div className="p-5">
              <span className="mb-2 block font-display text-[10px] tracking-[0.35em] text-primary/90">
                مجموعه
              </span>
              <h3 className="font-display text-lg font-black text-foreground group-hover:text-primary transition-colors">
                {collection.title}
              </h3>
              {collection.description && (
                <p className="mt-3 font-body text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {collection.description}
                </p>
              )}
              <div className="mt-5 flex items-center justify-between">
                <span className="font-body text-xs text-primary/80">
                  مشاهده پروژه‌ها
                </span>
                <svg
                  className="h-5 w-5 text-primary/80 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
