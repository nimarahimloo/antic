import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurtainModel, getProjectsByCategory } from "@/lib/server-data";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import ProjectCard from "@/components/ProjectCard";
import { SITE_PHONE_HREF } from "@/lib/siteContact";
import CurtainDetailClient from "./CurtainDetailClient";
import { CurtainDetailPageSkeleton } from "@/components/Skeletons";

export const revalidate = 3600; // ISR: revalidate curtain model every hour

interface CurtainDetailPageProps {
  params: Promise<{ id: string }>;
}

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

async function getModel(id: string) {
  const model = await getCurtainModel(id);
  if (!model) return null;

  // Fetch related projects
  let relatedProjects: Array<{ id: string; title: string; cover_image?: string }> = [];
  if ((model as CurtainModel).category_slug) {
    try {
      relatedProjects = (await getProjectsByCategory(String((model as CurtainModel).category_slug))) as Array<{ id: string; title: string; cover_image?: string }>;
    } catch {
      relatedProjects = [];
    }
  }

  return { model: model as CurtainModel, relatedProjects };
}

export async function generateMetadata({ params }: CurtainDetailPageProps) {
  try {
    const resolvedParams = await params;
    const data = await getModel(resolvedParams.id);
    if (!data?.model) return { title: "مدل پیدا نشد" };

    const model = data.model;
    return {
      title: String(model.code || model.name || "پرده آنتیک"),
      description: String(model.description || "").slice(0, 160),
      openGraph: {
        title: String(model.code || model.name || "پرده آنتیک"),
        description: String(model.description || "").slice(0, 160),
        images: model.image ? [String(model.image)] : [],
      },
    };
  } catch {
    return { title: "پرده آنتیک" };
  }
}

async function CurtainDetailServer({ params }: CurtainDetailPageProps) {
  const resolvedParams = await params;
  const data = await getModel(resolvedParams.id);

  if (!data?.model) {
    notFound();
  }

  const { model, relatedProjects } = data;
  const hasInstall = Boolean(model.install_image);

  return (
    <div className="bg-background pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex items-center gap-2 font-body text-xs text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">
            خانه
          </Link>
          <span className="mx-1" aria-hidden>›</span>
          <Link href="/catalog" className="transition-colors hover:text-primary">
            کاتالوگ
          </Link>
          <span className="mx-1" aria-hidden>›</span>
          <span className="text-foreground">{String(model.code || model.name)}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col">
            <CurtainPreview fabric={model} publicMode />
            {hasInstall && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-primary">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>نمای نصب این مدل</span>
              </div>
            )}
          </div>

          <div>
            <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {model.code && (
                    <p className="font-display text-sm font-bold text-primary">{String(model.code)}</p>
                  )}
                  <h1 className="mt-1 font-display text-2xl font-black leading-snug text-foreground">
                    {String(model.name || model.code)}
                  </h1>
                </div>
                {model.color_code && (
                  <span
                    className="h-12 w-12 shrink-0 rounded-xl border border-secondary/60"
                    style={{ backgroundColor: String(model.color_code) }}
                    title={String(model.color || "")}
                  />
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {model.fabric && <Spec label="نوع پارچه" value={String(model.fabric)} />}
                {model.color && <Spec label="رنگ" value={String(model.color)} />}
                {model.texture && <Spec label="بافت" value={String(model.texture)} />}
                {model.material && <Spec label="جنس" value={String(model.material)} />}
                {model.category_slug && <Spec label="دسته" value={String(model.category_slug)} />}
              </div>

              {model.description && (
                <p className="mt-6 font-body text-sm leading-8 text-muted-foreground">
                  {String(model.description)}
                </p>
              )}

              <a href={SITE_PHONE_HREF} className="btn-gold mt-8 flex w-full items-center justify-center">
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35-.03.74-.25 1.02l-2.2 2.2z"/></svg>
                <span>مشاوره و سفارش</span>
              </a>
              <Link href="/catalog" className="btn-ghost-gold mt-3 flex w-full items-center justify-center">
                بازگشت به کاتالوگ
              </Link>
            </div>

            {/* Related Projects Section */}
            {relatedProjects.length > 0 && (
              <div className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-black text-foreground">نمونه‌های اجرا شده مرتبط</h2>
                  <Link
                    href={`/projects/category/${String(model.category_slug)}`}
                    className="font-body text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    مشاهده همه
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedProjects.slice(0, 6).map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Client-side interactive components */}
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" /></div>}>
              <CurtainDetailClient model={model} relatedProjects={relatedProjects} />
            </Suspense>
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

export default async function CurtainDetailPage({ params }: CurtainDetailPageProps) {
  return (
    <Suspense fallback={<CurtainDetailPageSkeleton />}>
      <CurtainDetailServer params={params} />
    </Suspense>
  );
}