"use client";

import { OptimizedImage } from "@/components/ui/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurtainModelRelatedProjects } from "@/rest/store-catalog";

interface CurtainModel {
  id?: string;
  code?: string;
  name?: string;
  image?: string;
  install_image?: string;
  color?: string;
  color_code?: string;
  fabric?: string;
  texture?: string;
  material?: string;
  category_slug?: string;
  description?: string;
}

interface RelatedProject {
  id: string;
  title: string;
  cover_image?: string;
  category_slug?: string;
  subcategory?: string;
}

interface CurtainDetailClientProps {
  model: CurtainModel;
  relatedProjects: RelatedProject[];
}

export default function CurtainDetailClient({ model, relatedProjects }: CurtainDetailClientProps) {
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projects, setProjects] = useState<RelatedProject[]>(relatedProjects);

  // Load related projects from CurtainModel API
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!model?.id) {
        setProjectsLoading(false);
        return;
      }

      setProjectsLoading(true);

      getCurtainModelRelatedProjects(model.id, 6)
        .then((data) => {
          if (!cancelled) {
            setProjects(data);
            setProjectsLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setProjectsLoading(false);
          }
        });
    })();

    return () => {
      cancelled = true;
    };
  }, [model?.id]);

  if (!projects.length) return null;

  return (
    <section className="border-t border-secondary/60 bg-background pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">پروژه‌های مرتبط</h2>
          {model?.category_slug && (
            <Link
              href={`/projects/category/${model.category_slug}`}
              className="font-body text-xs text-primary hover:underline flex items-center gap-1"
            >
              مشاهده همه
              <ChevronLeft className="h-3 w-3" />
            </Link>
          )}
        </div>

        {projectsLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-2xl bg-secondary/30" />
                <div className="mt-3 h-5 w-3/4 rounded bg-secondary/30" />
                <div className="h-4 w-1/2 rounded bg-secondary/30" />
              </div>
            ))}
          </div>
        ) : (
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
                      <OptimizedImage src={project.cover_image} alt={project.title} fill className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
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
        )}
      </div>
    </section>
  );
}