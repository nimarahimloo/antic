import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Phone, X } from "lucide-react";
import CurtainPreview from "@/components/catalog/CurtainPreview";
import CatalogCard from "@/components/catalog/CatalogCard";
import ProjectCard from "@/components/ProjectCard";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";
import { base44 } from "@/api/base44Client";
import { SITE_PHONE_HREF } from "@/lib/siteContact";

export default function InteractiveCatalog({ initialCategory }) {
  const { categories: CATEGORIES, loading: catsLoading } = useCurtainCategories({ catalogOnly: true });

  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [search, setSearch] = useState("");
  const [models, setModels] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const filter = {};
        if (selectedCategory) filter.category_slug = selectedCategory;
        if (selectedSubcategory) filter.subcategory = selectedSubcategory;
        const [mList, pList] = await Promise.all([
          base44.entities.CurtainModel.filter(filter, "-updated_date", 48).catch(() => []),
          base44.entities.Project.filter(
            selectedCategory ? { category_slug: selectedCategory } : {},
            "-updated_date",
            24
          ).catch(() => []),
        ]);
        if (!cancelled) {
          let modelsArr = Array.isArray(mList) ? mList : [];
          if (search.trim()) {
            const q = search.trim().toLowerCase();
            modelsArr = modelsArr.filter(
              (m) =>
                (m.name || "").toLowerCase().includes(q) ||
                (m.code || "").toLowerCase().includes(q) ||
                (m.color || "").toLowerCase().includes(q)
            );
          }
          setModels(modelsArr);
          setProjects(Array.isArray(pList) ? pList : []);
        }
      } catch {
        if (!cancelled) {
          setModels([]);
          setProjects([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, selectedSubcategory, search]);

  const category = CATEGORIES.find((c) => c.slug === selectedCategory);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-foreground lg:text-3xl">کاتالوگ پرده</h1>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            دسته را انتخاب کنید و مدل‌ها را ببینید.
          </p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی مدل یا کد…"
            className="w-full rounded-xl border border-secondary bg-card py-2.5 pr-10 pl-4 font-body text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory("");
            setSelectedSubcategory("");
          }}
          className={`rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
            !selectedCategory
              ? "border-primary bg-primary/10 text-primary"
              : "border-secondary text-muted-foreground hover:border-primary/50"
          }`}
        >
          همه
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => {
              setSelectedCategory(c.slug);
              setSelectedSubcategory("");
            }}
            className={`rounded-full border px-4 py-1.5 font-body text-xs transition-colors ${
              selectedCategory === c.slug
                ? "border-primary bg-primary/10 text-primary"
                : "border-secondary text-muted-foreground hover:border-primary/50"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!search.trim() && category?.subcategories?.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSubcategory("")}
            className={`rounded-full border px-3 py-1 font-body text-[11px] ${
              !selectedSubcategory ? "border-primary text-primary" : "border-secondary/70 text-muted-foreground"
            }`}
          >
            همه زیردسته‌ها
          </button>
          {category.subcategories.map((sub) => (
            <button
              key={sub.slug}
              type="button"
              onClick={() => setSelectedSubcategory(sub.slug)}
              className={`rounded-full border px-3 py-1 font-body text-[11px] ${
                selectedSubcategory === sub.slug
                  ? "border-primary text-primary"
                  : "border-secondary/70 text-muted-foreground"
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {loading || catsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-secondary/30" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <CatalogCard key={m.id} model={m} onSelect={() => setSelectedModel(m)} />
            ))}
          </div>
          {!models.length && (
            <div className="rounded-2xl border border-secondary/60 bg-card p-10 text-center">
              <p className="font-body text-sm text-muted-foreground">مدلی با این فیلتر پیدا نشد.</p>
              <a href={SITE_PHONE_HREF} className="btn-gold mt-3 w-full justify-center sm:w-auto">
                <Phone className="h-4 w-4" /> مشاوره تلفنی
              </a>
            </div>
          )}

          {projects.length > 0 && (
            <div className="mt-14">
              <h2 className="mb-5 font-display text-xl font-bold text-foreground">نمونه‌های مرتبط</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedModel(null)}>
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-secondary bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute left-4 top-4 rounded-full border border-secondary p-2" onClick={() => setSelectedModel(null)}>
              <X className="h-4 w-4" />
            </button>
            <CurtainPreview fabric={selectedModel} publicMode />
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to={`/curtain/${selectedModel.id}`} className="btn-gold">
                جزئیات مدل
              </Link>
              <a href={SITE_PHONE_HREF} className="btn-ghost-gold">
                <Phone className="h-4 w-4" /> تماس
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
