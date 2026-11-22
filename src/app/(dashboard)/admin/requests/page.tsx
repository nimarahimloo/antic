"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";
import { apiErrorMessage } from "@/lib/apiError";
import { Trash2, Loader2 } from "lucide-react";
import { adminToast } from "@/lib/adminToast";

const STATUS_OPTIONS = [
  { value: "new", label: "جدید" },
  { value: "contacted", label: "تماس گرفته شد" },
  { value: "done", label: "پایان‌یافته" },
];

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    api.entities.ConsultationRequest
      .list("-created_date", 300)
      .then((data) => setRequests((data || []) as Record<string, unknown>[]))
      .catch((err) => {
        console.error("Failed to load requests:", err);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function setStatus(record: Record<string, unknown>, status: string) {
    const prev = record.status;
    setRequests((rs) => rs.map((r) => (r.id === record.id ? { ...r, status } : r)));
    try {
      await api.entities.ConsultationRequest.update(String(record.id), { status });
      const label = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
      adminToast("update", "درخواست", `${String(record.name || "")} — ${label}`);
    } catch (err) {
      setRequests((rs) => rs.map((r) => (r.id === record.id ? { ...r, status: prev } : r)));
      adminToast("error", "درخواست", apiErrorMessage(err));
    }
  }

  async function remove(record: Record<string, unknown>) {
    if (!window.confirm(`حذف درخواست «${String(record.name)}»؟`)) return;
    try {
      await api.entities.ConsultationRequest.delete(String(record.id));
      setRequests((rs) => rs.filter((r) => r.id !== record.id));
      adminToast("delete", "درخواست", String(record.name || ""));
    } catch (err) {
      adminToast("error", "درخواست", apiErrorMessage(err));
    }
  }

  const filtered =
    filter === "all" ? requests : requests.filter((r) => (String(r.status || "new")) === filter);
  const count = (s: string) => requests.filter((r) => String(r.status || "new") === s).length;

  const chips = [
    { value: "all", label: `همه (${requests.length})` },
    ...STATUS_OPTIONS.map((s) => ({ ...s, label: `${s.label} (${count(s.value)})` })),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-black text-foreground">درخواست‌های مشاوره</h1>
        <p className="mt-1 font-body text-xs text-muted-foreground">
          {loading ? "…" : `${requests.length} درخواست ثبت‌شده`}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {chips.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full border px-4 py-2 font-body text-xs transition-colors ${
              filter === s.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-secondary/60 text-muted-foreground hover:border-primary/50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-secondary/60 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-secondary/60">
                {["نام", "شماره تماس", "مرجع", "نوع فضا", "توضیحات", "تاریخ", "وضعیت", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-body text-xs text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center font-body text-sm text-muted-foreground">
                    درخواستی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={String(r.id)}
                    className="border-b border-secondary/40 transition-colors last:border-0 hover:bg-background/40"
                  >
                    <td className="px-4 py-3 font-display text-xs font-bold text-foreground">{String(r.name)}</td>
                    <td className="px-4 py-3">
                      <a href={`tel:${String(r.phone)}`} dir="ltr" className="font-body text-xs text-primary">
                        {String(r.phone)}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-muted-foreground">{String(r.reference || "—")}</td>
                    <td className="px-4 py-3 font-body text-xs text-muted-foreground">{String(r.space_type || "—")}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-body text-xs text-muted-foreground" title={String(r.message)}>
                      {String(r.message || "—")}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                      {r.created_date ? new Date(String(r.created_date)).toLocaleDateString("fa-IR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={String(r.status || "new")}
                        onChange={(e) => setStatus(r, e.target.value)}
                        className="rounded-lg border border-secondary bg-background px-2.5 py-1.5 font-body text-xs text-foreground outline-none focus:border-primary"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => remove(r)}
                        aria-label="حذف"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/70 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}