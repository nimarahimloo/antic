import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ConsultationForm from "@/components/ConsultationForm";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    base44.entities.Project.get(id)
      .then((data) => {
        setProject(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">نمونه پیدا نشد</h1>
        <Link to="/projects" className="btn-gold mt-6">
          بازگشت به نمونه‌های اجرا
        </Link>
      </div>
    );
  }

  const images =
    project.images?.length > 0 ? project.images : [project.cover_image].filter(Boolean);

  return (
    <div className="bg-background pb-24">
      <div className="mx-auto max-w-7xl px-5 pt-8 lg:px-10">
        <nav className="flex flex-wrap items-center gap-2 font-body text-xs text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-primary">
            خانه
          </Link>
          <ArrowRight className="h-3 w-3" />
          <Link to="/projects" className="transition-colors hover:text-primary">
            نمونه‌های اجرا شده
          </Link>
          {project.category_slug && (
            <>
              <ArrowRight className="h-3 w-3" />
              <Link
                to={`/projects/category/${project.category_slug}`}
                className="transition-colors hover:text-primary"
              >
                دسته
              </Link>
            </>
          )}
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{project.title}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
        <h1 className="font-display text-3xl font-bold text-foreground lg:text-5xl">{project.title}</h1>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-secondary/60 bg-card">
              {images[activeImage] && (
                <img
                  src={images[activeImage]}
                  alt={project.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl border transition-all lg:w-full ${
                  activeImage === i ? "border-primary" : "border-secondary/60"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {project.description && (
          <div className="mt-10 max-w-3xl">
            <h2 className="mb-4 font-display text-lg font-bold text-foreground">توضیحات</h2>
            <p className="font-body text-sm leading-8 text-muted-foreground">{project.description}</p>
          </div>
        )}

        <div className="mt-16 rounded-3xl border border-primary/20 bg-card p-6 lg:p-10">
          <div className="mb-8 text-center">
            <span className="eyebrow mb-3 block">مشاوره اختصاصی</span>
            <h3 className="font-display text-2xl font-black text-foreground lg:text-3xl">
              درخواست <span className="text-gold-gradient">طراحی مشابه</span>
            </h3>
            <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">
              فرم را تکمیل کنید؛ کارشناس ما با شما تماس می‌گیرد.
            </p>
          </div>
          <ConsultationForm
            reference={`نمونه: ${project.title}`}
            submitLabel="ثبت درخواست طراحی مشابه"
          />
        </div>
      </div>
    </div>
  );
}
