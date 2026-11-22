"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Phone, CheckCircle2, ExternalLink } from "lucide-react";
import { api } from "@/api/client";
import { apiErrorMessage } from "@/lib/apiError";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import ProjectCard from "@/components/ProjectCard";
import { SITE_PHONE_HREF } from "@/lib/siteContact";

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

export default function CurtainDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [model, setModel] = useState<CurtainModel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [relatedProjects, setRelatedProjects] = useState<Array<{ id: string; title: string; cover_image?: string }>>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api.entities.CurtainModel.get(id)
      .then((m) => {
        if (!alive) return;
        if (m) setModel(m as CurtainModel);
        else setNotFound(true);
      })
      .catch((err) => {
        console.error("Failed to load curtain model:", apiErrorMessage(err));
        if (!alive) return;
        setNotFound(true);
      })
      .finally(() => {
        if (alive) setLoadedId(id);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // Fetch related projects based on curtain model's category
  useEffect(() => {
    if (!model?.category_slug) {
      setRelatedProjects([]);
      setProjectsLoading(false);
      return;
    }
    setProjectsLoading(true);
    const pf: Record<string, string> = { category_slug: model.category_slug };
    api.entities.Project.filter(pf, {
      sort: "-created_date",
      limit: 6,
    })
      .then((data) => {
        setRelatedProjects((Array.isArray(data) ? data : []) as Array<{ id: string; title: string; cover_image?: string }>);
      })
      .catch((err) => {
        console.error("Failed to load related projects:", apiErrorMessage(err));
        setRelatedProjects([]);
      })
      .finally(() => setProjectsLoading(false));
  }, [model?.category_slug]);

  const loading = loadedId !== id;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (notFound || !model) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-black text-foreground">مدل پیدا نشد</h1>
        <Link href="/catalog" className="btn-gold mt-6 inline-flex items-center justify-center">
          بازگشت به کاتالوگ
        </Link>
      </div>
    );
  }

  const hasInstall = Boolean(model.install_image);

  return (
    <div className="bg-background pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex items-center gap-2 font-body text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">
            خانه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link href="/catalog" className="transition-colors hover:text-primary">
            کاتالوگ
          </Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{model.code || model.name}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col">
            <CurtainPreview fabric={model} publicMode />
            {hasInstall && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                نمای نصب این مدل
              </div>
            )}
          </div>

          <div>
            <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {model.code && (
                    <p className="font-display text-sm font-bold text-primary">{model.code}</p>
                  )}
                  <h1 className="mt-1 font-display text-2xl font-black leading-snug text-foreground">
                    {model.name || model.code}
                  </h1>
                </div>
                {model.color_code && (
                  <span
                    className="h-12 w-12 shrink-0 rounded-xl border border-secondary/60"
                    style={{ backgroundColor: model.color_code }}
                    title={model.color || ""}
                  />
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {model.fabric && <Spec label="نوع پارچه" value={model.fabric} />}
                {model.color && <Spec label="رنگ" value={model.color} />}
                {model.texture && <Spec label="بافت" value={model.texture} />}
                {model.material && <Spec label="جنس" value={model.material} />}
                {model.category_slug && <Spec label="دسته" value={model.category_slug} />}
              </div>

              {model.description && (
                <p className="mt-6 font-body text-sm leading-8 text-muted-foreground">
                  {model.description}
                </p>
              )}

              <a href={SITE_PHONE_HREF} className="btn-gold mt-8 flex w-full items-center justify-center">
                <Phone className="mr-2 h-4 w-4" /> مشاوره و سفارش
              </a>
              <Link href="/catalog" className="btn-ghost-gold mt-3 flex w-full items-center justify-center">
                بازگشت به کاتالوگ
              </Link>
            </div>

            {/* Related Projects Section */}
            {model.category_slug && (
              <div className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-black text-foreground">نمونه‌های اجرا شده مرتبط</h2>
                  <Link
                    href={`/projects/category/${model.category_slug}`}
                    className="font-body text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    مشاهده همه <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {projectsLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-secondary/40" />
                    ))}
                  </div>
                ) : relatedProjects.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedProjects.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-secondary/60 bg-card/40">
                    <p className="font-body text-sm text-muted-foreground">
                      هنوز نمونه اجرا برای این دسته ثبت نشده است.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/50 px-4 py-3">
      <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
