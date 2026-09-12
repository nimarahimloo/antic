import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ProjectCard from "@/components/ProjectCard";

const SPACE_TYPES = ["همه", "پذیرایی", "آشپزخانه", "اتاق خواب", "فضاهای ویژه"];

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const activeSpace = params.get("space") || "همه";
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Project
      .list()
      .then((data) => { setProjects(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = activeSpace === "همه" ? projects : projects.filter((p) => p.space_type === activeSpace);

  const setSpace = (space) => {
    if (space === "همه") params.delete("space");
    else params.set("space", space);
    setParams(params);
  };

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">پروژه‌های اجرا شده</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-5xl">
            نمونه‌های <span className="text-gold-gradient">اجرای</span> ما
          </h1>
          <p className="mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            هر پروژه یک داستان از طراحی، انتخاب پارچه و اجرای دقیق. روی هر پروژه کلیک کنید تا جزئیات و محصولات استفاده شده را ببینید.
          </p>
        </div>
      </section>

      <section className="sticky top-20 z-30 border-b border-secondary/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto no-scrollbar px-5 py-4 lg:px-10">
          {SPACE_TYPES.map((space) => (
            <button
              key={space}
              onClick={() => setSpace(space)}
              className={`shrink-0 rounded-full border px-5 py-2 font-body text-xs transition-colors ${
                activeSpace === space
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {space}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-secondary/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-body text-sm text-muted-foreground">هنوز پروژه‌ای ثبت نشده است.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}