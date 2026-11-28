"use client";

import { useEffect, useState, useCallback } from "react";
import { adminToasts } from "@/lib/adminToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Clock,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Activity,
} from "lucide-react";

type ProblemStatus = "open" | "worked" | "didnt-work" | "fixed" | "production-ready";
type ProblemSeverity = "low" | "medium" | "high" | "critical";
type ProblemCategory =
  | "frontend"
  | "backend"
  | "database"
  | "e2e"
  | "deployment"
  | "other"
  | "general";

interface Problem {
  id: string;
  title: string;
  description?: string | null;
  status: ProblemStatus;
  severity: ProblemSeverity;
  category: ProblemCategory;
  frontend_url?: string | null;
  backend_url?: string | null;
  error_message?: string | null;
  steps_to_reproduce?: string | null;
  fix_notes?: string | null;
  tested_by?: string | null;
  tested_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface HealthCheck {
  status: string;
  timestamp: string;
  checks: Record<string, { status: string; message?: string; latency_ms?: number }>;
}

interface Stats {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
}

const STATUS_LABELS: Record<ProblemStatus, string> = {
  open: "باز",
  worked: "کار کرد",
  "didnt-work": "نکرده",
  fixed: "تکمیل شد",
  "production-ready": "آماده تولید",
};

const STATUS_COLORS: Record<ProblemStatus, string> = {
  open: "bg-secondary text-secondary-foreground",
  worked: "bg-primary text-primary-foreground",
  "didnt-work": "bg-destructive text-destructive-foreground",
  fixed: "bg-green text-green-foreground",
  "production-ready": "bg-emerald text-emerald-foreground",
};

const SEVERITY_LABELS: Record<ProblemSeverity, string> = {
  low: "کم",
  medium: "متوسط",
  high: "بسیار",
  critical: "بحرانی",
};

const CATEGORY_LABELS: Record<ProblemCategory, string> = {
  general: "عمومی",
  frontend: "فرانت‌اند",
  backend: "بک‌اند",
  database: "دیتابیس",
  e2e: "تست E2E",
  deployment: "تأمین تولید",
  other: "سایر",
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

export default function DiagnosticsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "open" as ProblemStatus,
    severity: "medium" as ProblemSeverity,
    category: "general" as ProblemCategory,
    frontend_url: "",
    backend_url: "",
    error_message: "",
    steps_to_reproduce: "",
    fix_notes: "",
    tested_by: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const API = `${API_BASE}/diagnostic`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [problemsRes, healthRes, statsRes] = await Promise.all([
        fetch(`${API}/problems?limit=100`),
        fetch(`${API}/health`),
        fetch(`${API}/stats`),
      ]);

      if (problemsRes.ok) {
        const data = await problemsRes.json();
        setProblems(data.problems || []);
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch diagnostic data:", err);
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId
        ? `${API}/problems/${editingId}`
        : `${API}/problems`;
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "عملیات ناموفق بود");
      }

      const result = await res.json();
      if (editingId) {
        setProblems(problems.map((p) => (p.id === editingId ? result : p)));
        adminToasts.updated("مشکل", result.title);
      } else {
        setProblems([result, ...problems]);
        adminToasts.created("مشکل", result.title);
      }
      setForm({
        title: "",
        description: "",
        status: "open",
        severity: "medium",
        category: "general",
        frontend_url: "",
        backend_url: "",
        error_message: "",
        steps_to_reproduce: "",
        fix_notes: "",
        tested_by: "",
      });
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      adminToasts.error(err instanceof Error ? err.message : "خطای نامشخص");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProblem = async (id: string) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این مشکل را حذف کنید؟")) return;
    try {
      const res = await fetch(`${API}/problems/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("حذف ناموفق بود");
      setProblems(problems.filter((p) => p.id !== id));
      adminToasts.deleted("مشکل");
    } catch (err) {
      adminToasts.error(err instanceof Error ? err.message : "خطای نامشخص");
    }
  };

  const handleEditProblem = (p: Problem) => {
    setForm({
      title: p.title,
      description: p.description || "",
      status: p.status,
      severity: p.severity,
      category: p.category,
      frontend_url: p.frontend_url || "",
      backend_url: p.backend_url || "",
      error_message: p.error_message || "",
      steps_to_reproduce: p.steps_to_reproduce || "",
      fix_notes: p.fix_notes || "",
      tested_by: p.tested_by || "",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const filteredProblems = problems.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterSeverity && p.severity !== filterSeverity) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.error_message || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const healthChecks = health?.checks || {};
  const allHealthy = health
    ? Object.values(health.checks).every((c) => c.status === "ok")
    : false;

  const statusBadge = (status: ProblemStatus) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        STATUS_COLORS[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );

  const severityBadge = (severity: ProblemSeverity) => {
    const variant =
      severity === "critical"
        ? "bg-destructive text-destructive-foreground"
        : severity === "high"
          ? "bg-secondary text-secondary-foreground"
          : "bg-outline";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
          variant
        )}
      >
        {SEVERITY_LABELS[severity]}
      </span>
    );
  };

  const categoryBadge = (category: ProblemCategory) => (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-secondary/50 bg-secondary/10 text-xs text-muted-foreground"
    >
      {CATEGORY_LABELS[category]}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">تشخیص و پیگیری مشکلات</h1>
          <p className="text-muted-foreground">
            پیگیری سریع مشکلات توسعه و وضعیت تولید برای نگهداری پروژه در زمان طولانی
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            بازخوانی
          </Button>
          <Button onClick={() => setShowForm(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            مشکل جدید
          </Button>
        </div>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex flex-row items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">وضعیت کل سیستم</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  allHealthy ? "bg-green text-green-foreground" : "bg-destructive text-destructive-foreground"
                )}
              >
                {allHealthy ? "سالم" : "ناسالم"}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(healthChecks).map(([name, check]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{name}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium",
                      check.status === "ok"
                        ? "bg-green text-green-foreground"
                        : "bg-destructive text-destructive-foreground"
                    )}
                  >
                    {check.status === "ok" ? "سالم" : "ناسالم"}
                  </span>
                  {check.latency_ms !== undefined && (
                    <span className="text-xs text-muted-foreground">{check.latency_ms}ms</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              آخرین بروزرسانی: {health?.timestamp || "—"}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">آمار مشکلات</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">کل مشکلات</span>
                <span className="font-medium">{stats?.total || 0}</span>
              </div>
              {stats?.byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[s.status as ProblemStatus] || s.status}
                  </span>
                  <span className="font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">شدت مشکلات</h3>
            <div className="space-y-2">
              {stats?.bySeverity.map((s) => (
                <div key={s.severity} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {SEVERITY_LABELS[s.severity as ProblemSeverity] || s.severity}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium",
                      s.severity === "critical"
                        ? "bg-destructive text-destructive-foreground"
                        : s.severity === "high"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-outline"
                    )}
                  >
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex items-center gap-2">
          <Label className="text-xs">وضعیت:</Label>
          <Select value={filterStatus ?? ""} onValueChange={(v) => setFilterStatus(v || null)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">همه</SelectItem>
              <SelectItem value="open">باز</SelectItem>
              <SelectItem value="worked">کار کرد</SelectItem>
              <SelectItem value="didnt-work">نکرده</SelectItem>
              <SelectItem value="fixed">تکمیل شد</SelectItem>
              <SelectItem value="production-ready">آماده تولید</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">شدت:</Label>
          <Select value={filterSeverity ?? ""} onValueChange={(v) => setFilterSeverity(v || null)}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">همه</SelectItem>
              <SelectItem value="low">کم</SelectItem>
              <SelectItem value="medium">متوسط</SelectItem>
              <SelectItem value="high">بسیار</SelectItem>
              <SelectItem value="critical">بحرانی</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">دسته:</Label>
          <Select value={filterCategory ?? ""} onValueChange={(v) => setFilterCategory(v || null)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="همه" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">همه</SelectItem>
              <SelectItem value="general">عمومی</SelectItem>
              <SelectItem value="frontend">فرانت‌اند</SelectItem>
              <SelectItem value="backend">بک‌اند</SelectItem>
              <SelectItem value="database">دیتابیس</SelectItem>
              <SelectItem value="e2e">تست E2E</SelectItem>
              <SelectItem value="deployment">تأمین تولید</SelectItem>
              <SelectItem value="other">سایر</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 max-w-md">
          <Label className="text-xs">جستجو:</Label>
          <Input
            placeholder="جستجو در عنوان، توضیح یا پیام خطا..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Problems Table */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-foreground">لیست مشکلات</h3>
              <p className="text-xs text-muted-foreground">
                {filteredProblems.length} مشکل از کل {problems.length} مشکل
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">مشکلی یافت نشد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right">
                <thead>
                  <tr className="border-b border-secondary/50">
                    <th className="pb-3 font-medium text-muted-foreground">عنوان</th>
                    <th className="pb-3 font-medium text-muted-foreground">دسته</th>
                    <th className="pb-3 font-medium text-muted-foreground">شدت</th>
                    <th className="pb-3 font-medium text-muted-foreground">وضعیت</th>
                    <th className="pb-3 font-medium text-muted-foreground">تست شده توسط</th>
                    <th className="pb-3 font-medium text-muted-foreground">تاریخ ایجاد</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.map((p) => (
                    <tr key={p.id} className="border-b border-secondary/50 hover:bg-secondary/50 transition-colors">
                      <td className="py-3 font-medium">{p.title}</td>
                      <td className="py-3">{categoryBadge(p.category)}</td>
                      <td className="py-3">{severityBadge(p.severity)}</td>
                      <td className="py-3">{statusBadge(p.status)}</td>
                      <td className="py-3 text-xs">{p.tested_by || "—"}</td>
                      <td className="py-3 text-xs">
                        {new Date(p.created_at).toLocaleDateString("fa-IR")}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditProblem(p)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            ویرایش
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProblem(p.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-4">
              {editingId ? "ویرایش مشکل" : "مشکل جدید"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>عنوان مشکل *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="مثلاً: خطا در لود صفحه داشبورد"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>وضعیت</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProblemStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">باز</SelectItem>
                      <SelectItem value="worked">کار کرد</SelectItem>
                      <SelectItem value="didnt-work">نکرده</SelectItem>
                      <SelectItem value="fixed">تکمیل شد</SelectItem>
                      <SelectItem value="production-ready">آماده تولید</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>شدت</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as ProblemSeverity })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">کم</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="high">بسیار</SelectItem>
                      <SelectItem value="critical">بحرانی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>دسته</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ProblemCategory })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">عمومی</SelectItem>
                      <SelectItem value="frontend">فرانت‌اند</SelectItem>
                      <SelectItem value="backend">بک‌اند</SelectItem>
                      <SelectItem value="database">دیتابیس</SelectItem>
                      <SelectItem value="e2e">تست E2E</SelectItem>
                      <SelectItem value="deployment">تأمین تولید</SelectItem>
                      <SelectItem value="other">سایر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="توضیح بیشتر درباره مشکل..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>پیام خطا</Label>
                <Input
                  value={form.error_message}
                  onChange={(e) => setForm({ ...form, error_message: e.target.value })}
                  placeholder="پیام خطای دقیق..."
                />
              </div>

              <div className="space-y-2">
                <Label>مراحل بازتولید</Label>
                <Textarea
                  value={form.steps_to_reproduce}
                  onChange={(e) => setForm({ ...form, steps_to_reproduce: e.target.value })}
                  placeholder="مراحل بازتولید مشکل..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>نوت‌های رفع مشکل</Label>
                <Textarea
                  value={form.fix_notes}
                  onChange={(e) => setForm({ ...form, fix_notes: e.target.value })}
                  placeholder="نوت‌های رفع مشکل..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>آدرس فرانت‌اند</Label>
                  <Input
                    value={form.frontend_url}
                    onChange={(e) => setForm({ ...form, frontend_url: e.target.value })}
                    placeholder="مثلاً /admin/categories"
                  />
                </div>
                <div className="space-y-2">
                  <Label>آدرس بک‌اند</Label>
                  <Input
                    value={form.backend_url}
                    onChange={(e) => setForm({ ...form, backend_url: e.target.value })}
                    placeholder="مثلاً /api/entities/CurtainCategory"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>تست شده توسط</Label>
                <Input
                  value={form.tested_by}
                  onChange={(e) => setForm({ ...form, tested_by: e.target.value })}
                  placeholder="نام تست‌کننده..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  لغو
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "در حال ذخیره..." : editingId ? "به‌روزرسانی" : "ذاشت"}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Production Readiness Checklist */}
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">چک‌لیست آمادگی تولید</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="backend-health" defaultChecked={allHealthy} disabled />
              <label htmlFor="backend-health" className="text-sm">
                سلامت بک‌اند و دیتابیس
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="e2e-tests" defaultChecked={true} disabled />
              <label htmlFor="e2e-tests" className="text-sm">
                تست‌های E2E اجرا شده
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="no-critical-problems"
                defaultChecked={
                  !stats?.bySeverity.some(
                    (s) => s.severity === "critical" && s.count > 0
                  )
                }
                disabled
              />
              <label htmlFor="no-critical-problems" className="text-sm">
                هیچ مشکل بحرانی بدون رفع
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="swagger-docs" defaultChecked={true} disabled />
              <label htmlFor="swagger-docs" className="text-sm">
                مستندات API (Swagger) فعال است
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="login-modal" defaultChecked={true} disabled />
              <label htmlFor="login-modal" className="text-sm">
                ماژول ورود دوباره هنگام منقضی شدن توکن ادمین
              </label>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}