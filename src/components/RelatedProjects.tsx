"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, ChevronLeft } from "lucide-react";
import { getRelatedProjects, RelatedProject } from "@/rest/store-catalog";

interface RelatedProjectsProps {
  productId: string;
  productCategorySlug?: string;
  limit?: number;
}

export default function RelatedProjects({ productId, productCategorySlug, limit = 6 }: RelatedProjectsProps) {
  const [projects, setProjects] = useState<RelatedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRelatedProjects(productId, limit)
      .then((data) => {
        if (!cancelled) {
          setProjects(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "خطا در بارگذاری پروژه‌های مرتبط");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId, limit]);

  if (loading) {
    return (
      <section className="border-t border-secondary/60 bg-background pt-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">پروژه‌های مرتبط</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-2xl bg-secondary/30" />
                <div className="mt-3 h-5 w-3/4 rounded bg-secondary/30" />
                <div className="h-4 w-1/2 rounded bg-secondary/30" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !projects.length) {
    return null;
  }

  return (
    <section className="border-t border-secondary/60 bg-background pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">پروژه‌های مرتبط</h2>
          {productCategorySlug && (
            <Link
              href={`/projects/category/${productCategorySlug}`}
              className="font-body text-xs text-primary hover:underline flex items-center gap-1"
            >
              مشاهده همه
              <ChevronLeft className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_rgba(201,162,39,0.35)]">
                <div className="absolute inset-0">
                  {project.cover_image ? (
                    <img
                      src={project.cover_image}
                      alt={project.title}
                      className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#d9cfc0] via-[#b5a48c] to-[#8f7d64]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                <div className="relative mt-auto flex flex-1 flex-col justify-end p-6">
                  <span className="mb-2 font-display text-[10px] tracking-[0.35em] text-primary/90">
                    نمونه اجرا
                  </span>
                  <h3 className="font-display text-lg font-black text-foreground">{project.title}</h3>
                  {project.subcategory && (
                    <p className="mt-1 font-body text-sm text-muted-foreground line-clamp-1">{project.subcategory}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}