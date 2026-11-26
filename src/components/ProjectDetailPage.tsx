"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api } from "@/api/client";
import { apiErrorMessage } from "@/lib/apiError";
import { getCategoryProjects, RelatedProject } from "@/rest/store-catalog";
import { ProjectsPageSkeleton } from "@/components/Skeletons";

interface ProjectDetailProps {
  projectId: string;
}

export default function ProjectDetailPage({ projectId }: ProjectDetailProps) {
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<RelatedProject[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.entities.Project.get(projectId)
      .then((data) => {
        if (!cancelled) {
          if (data) {
            setProject(data as Record<string, unknown>);
          } else {
            setError("پروژه یافت نشد");
          }
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(apiErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Fetch related projects
  useEffect(() => {
    if (!project) return;

    let cancelled = false;
    setRelatedLoading(true);

    const categorySlug = (project.categorySlug as string) || "";
    const subcategory = (project.subcategory as string) || undefined;

    const fetchRelated = async () => {
      try {
        const projects = await getCategoryProjects(categorySlug, subcategory, 6);
        if (!cancelled) {
          // Filter out current project
          const filtered = projects.filter((p) => p.id !== projectId);
          setRelatedProjects(filtered);
        }
      } catch (err) {
        console.error("Failed to load related projects:", err);
        if (!cancelled) {
          setRelatedProjects([]);
        }
      } finally {
        if (!cancelled) {
          setRelatedLoading(false);
        }
      }
    };

    fetchRelated();

    return () => {
      cancelled = true;
    };
  }, [project, projectId]);

  if (loading) {
    return <ProjectsPageSkeleton />;
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-4xl px-5 py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-6 w-6 text-destructive" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="font-body text-sm text-muted-foreground">{error || "پروژه یافت نشد"}</p>
          <Link href="/projects" className="btn-gold">بازگشت به نمونه‌های اجرا</Link>
        </div>
      </div>
    );
  }

  const title = (project.title as string) || "پروژه";
  const coverImage = (project.coverImage as string) || "";
  const description = (project.description as string) || "";
  const subcategory = (project.subcategory as string) || "";
  const categorySlug = (project.categorySlug as string) || "";
  const images = (project.images as string[]) || [];
  const coverImageUrl = coverImage || images[0] || "";

  return (
    <div className="bg-background pb-20">
      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-10 lg:py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex flex-wrap items-center gap-2 font-body text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            خانه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link href="/projects" className="hover:text-primary transition-colors">
            نمونه‌های اجرا
          </Link>
          {categorySlug && (
            <>
              <ArrowRight className="h-3 w-3" />
              <Link href={`/projects/category/${categorySlug}`} className="hover:text-primary transition-colors">
                {(project.categorySlug ? "دسته " : "") + "پروژه‌ها"}
              </Link>
            </>
          )}
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px]">{title}</span>
        </nav>

        {/* Hero Image */}
        <div className="mb-12 overflow-hidden rounded-3xl border border-secondary/60">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="aspect-[16/9] w-full object-cover"
            />
          ) : (
            <div className="aspect-[16/9] flex items-center justify-center bg-secondary/40">
              <span className="font-display text-sm font-bold text-muted-foreground">{title}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-secondary/60 bg-card p-6 lg:p-8">
              <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
                {title}
              </h1>

              {subcategory && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {subcategory}
                  </span>
                </div>
              )}

              {description && (
                <div className="mt-6 font-body text-sm leading-8 text-muted-foreground">
                  <p>{description}</p>
                </div>
              )}

              {/* Gallery */}
              {(images.length > 1 || (images.length === 1 && !coverImage)) && (
                <div className="mt-8">
                  <h2 className="mb-4 font-display text-lg font-bold text-foreground">
                    گالری تصاویر
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((img, i) => (
                      <Link
                        key={i}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_rgba(201,162,39,0.35)]">
                          <div className="absolute inset-0">
                            <img
                              src={img}
                              alt={`${title} - عکس ${i + 1}`}
                              className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                          <div className="relative mt-auto flex flex-1 flex-col justify-end p-4">
                            <span className="mb-2 font-display text-[10px] tracking-[0.35em] text-primary/90">
                              نمونه اجرا
                            </span>
                            <h3 className="font-display text-base font-black text-foreground">{title}</h3>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Similar Projects Section */}
            <div className="mt-12">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">
                  پروژه‌های مشابه
                </h2>
              </div>

              {relatedLoading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[4/3] rounded-2xl bg-secondary/30" />
                      <div className="mt-3 h-5 w-3/4 rounded bg-secondary/30" />
                      <div className="h-4 w-1/2 rounded bg-secondary/30" />
                    </div>
                  ))}
                </div>
              ) : relatedProjects.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground text-center py-8">
                  پروژه مشابهی یافت نشد.
                </p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedProjects.map((rp) => (
                    <Link
                      key={rp.id}
                      href={`/projects/${rp.id}`}
                      className="group block"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-secondary/50 bg-card shadow-[0_8px_40px_-20px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-24px_rgba(201,162,39,0.35)]">
                        <div className="absolute inset-0">
                          {rp.cover_image ? (
                            <img
                              src={rp.cover_image}
                              alt={rp.title}
                              className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-[#d9cfc0] via-[#b5a48c] to-[#8f7d64]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-90" />
                        <div className="relative mt-auto flex flex-1 flex-col justify-end p-4">
                          <span className="mb-2 font-display text-[10px] tracking-[0.35em] text-primary/90">
                            نمونه اجرا
                          </span>
                          <h3 className="font-display text-lg font-black text-foreground">{rp.title}</h3>
                          {rp.subcategory && (
                            <p className="mt-1 font-body text-sm text-muted-foreground line-clamp-1">{rp.subcategory}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Project Info */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-secondary/60 bg-card p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  اطلاعات پروژه
                </h3>
                <dl className="space-y-4">
                  <div>
                    <dt className="font-body text-xs text-muted-foreground mb-1">دسته‌بندی</dt>
                    <dd className="font-body text-sm text-foreground">
                      {categorySlug || "—"}
                    </dd>
                  </div>
                  {subcategory && (
                    <div>
                      <dt className="font-body text-xs text-muted-foreground mb-1">زیردسته</dt>
                      <dd className="font-body text-sm text-foreground">{subcategory}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-body text-xs text-muted-foreground mb-1">تعداد تصاویر</dt>
                    <dd className="font-body text-sm text-foreground">{images.length || 0}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-secondary/60 bg-card p-6">
                <button
                  onClick={() => window.location.href = "https://wa.me/989123456789"}
                  className="btn-gold w-full justify-center"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.15-.187.05-.372-.025-.521-.075-.148-.683-1.611-.916-2.207-.242-.605-.433-.977-.542-1.13-.14-.198-.282-.346-.447-.521-.173-.187-.447-.578.074-.816.372-.187.635-.335.987-.522 1.292-.337.297-.558.413-.817.6-.273.198-.471.297-.67.297-.199 0-.413-.099-.615-.247-.788-.6-1.76-2.167-2.027-2.57-.16-.247-.386-.446-.62-.714-.24-.274-.48-.6-.62-.767-.14-.173-.312-.336-.5-.55-.19-.2-.395-.42-.61-.654-.215-.245-.47-.537-.747-.885-.286-.346-.584-.737-.885-1.152-.298-.413-.64-.876-.995-1.367-.37-.508-.778-1.07-1.195-1.666-.42-.586-.872-1.2-1.342-1.849-.47-.646-1.02-1.36-1.523-1.733-.524-.394-1.113-.807-1.69-1.07-.576-.26-1.21-.52-1.787-.845-.59-.335-1.18-.74-1.815-1.22-.63-.48-1.32-1.04-2.01-1.63-.705-.59-1.47-1.23-2.185-1.92-.73-.7-1.54-1.5-2.37-2.38-.83-.88-1.82-1.84-2.84-3.03-.32-.37-.64-.74-.97-1.13-.33-.39-.67-.8-.99-1.18-.33-.39-.67-.8-.99-1.18-.33-.39-.67-.8-.99-1.18-.33-.39-.67-.8-.99-1.18-.33-.39-.67-.8-.99-1.18" />
                  </svg>
                  <span className="ml-2">مشاوره در واتس‌اپ</span>
                </button>
                <a
                  href={`tel:+989123456789`}
                  className="btn-ghost-gold w-full justify-center mt-3"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 2.257a1 1 0 00-.311.903l-1.09 3.73a1 1 0 00.312 1.211l3.077 3.077a1 1 0 001.414 0l1.586-1.586a1 1 0 011.414 0l2.076 2.077a1 1 0 001.414 0l3.583-3.583a1 1 0 000-1.414l-2.25-2.25a1 1 0 00-1.414 0l-3.086 3.086a1 1 0 01-.904.312l-1.49-1.49a1 1 0 01-.312-.904l-.903-3.085a1 1 0 00-.903-.312l-3.086-3.086a1 1 0 00-1.414 0l-2.25 2.25a1 1 0 01-.312.904l-.903 3.085a1 1 0 01-.903.312l-3.086 3.086a1 1 0 01-.904-.312l-1.49-1.49a1 1 0 01-.312-.904L6.014 6.013a1 1 0 01.312-.904l2.25-2.25a1 1 0 011.414 0l3.584-3.584a1 1 0 011.414 0l3.086 3.086a1 1 0 010 1.414l-2.25 2.25a1 1 0 01-.904.312z" />
                  </svg>
                  <span className="ml-2">تماس تلفنی</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}