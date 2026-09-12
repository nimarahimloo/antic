import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Layers, FolderKanban, ListTree, Inbox, ArrowLeft } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CurtainModel.list("-created_date", 500),
      base44.entities.Project.list("-created_date", 500),
      base44.entities.CurtainCategory.list("order", 100),
      base44.entities.ConsultationRequest.list("-created_date", 500),
    ])
      .then(([models, projects, categories, requests]) => {
        setStats({
          models: models.length,
          projects: projects.length,
          categories: categories.length,
          requests: requests.length,
          newRequests: requests.filter((r) => (r.status || "new") === "new").length,
          latest: requests.slice(0, 5),
        });
      })
      .catch(() =>
        setStats({ models: 0, projects: 0, categories: 0, requests: 0, newRequests: 0, latest: [] })
      );
  }, []);

  const CARDS = [
    { label: "درخواست جدید", value: stats?.newRequests, icon: Inbox, to: "/admin/requests" },
    { label: "مدل‌های پرده", value: stats?.models, icon: Layers, to: "/admin/models" },
    { label: "پروژه‌ها", value: stats?.projects, icon: FolderKanban, to: "/admin/projects" },
    { label: "دسته‌بندی‌ها", value: stats?.categories, icon: ListTree, to: "/admin/categories" },
  ];

  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">داشبورد</h1>
      <p className="mt-1 font-body text-xs text-muted-foreground">نمای کلی وضعیت سایت</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="light-leak rounded-2xl border border-secondary/60 bg-card p-5 transition-colors hover:border-primary/60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 text-primary">
              <c.icon className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <p className="mt-4 font-display text-2xl font-black text-foreground">{stats ? c.value : "…"}</p>
            <p className="mt-1 font-body text-[11px] text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-secondary/60 bg-card">
        <div className="flex items-center justify-between border-b border-secondary/60 px-5 py-4">
          <h2 className="font-display text-sm font-black text-foreground">آخرین درخواست‌های مشاوره</h2>
          <Link
            to="/admin/requests"
            className="flex items-center gap-1 font-body text-xs text-primary transition-colors hover:text-accent"
          >
            همه درخواست‌ها <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
        {stats?.latest?.length ? (
          <ul>
            {stats.latest.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-secondary/40 px-5 py-3.5 last:border-0"
              >
                <div>
                  <p className="font-display text-xs font-bold text-foreground">{r.name}</p>
                  <p className="mt-0.5 font-body text-[11px] text-muted-foreground">
                    {r.reference || r.space_type || "بدون مرجع"}
                  </p>
                </div>
                <a href={`tel:${r.phone}`} dir="ltr" className="font-body text-xs text-primary">
                  {r.phone}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center font-body text-xs text-muted-foreground">
            هنوز درخواستی ثبت نشده است.
          </p>
        )}
      </div>
    </div>
  );
}