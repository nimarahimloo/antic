import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, Clock, Layers, Loader2, Sparkles, Play, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "/api";

function authHeaders() {
  const token = localStorage.getItem("antic_access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function RenderingStatus() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch(`${API}/render/stats`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setStats(d);
        setQueue(d.queue || null);
      })
      .catch(() => {
        // fallback to entity counts
        Promise.all([
          base44.entities.CurtainModel.count({}),
          base44.entities.CurtainModel.count({ install_status: "approved" }),
          base44.entities.CurtainModel.count({ install_status: "rejected" }),
        ]).then(([total, approved, rejected]) =>
          setStats({
            total,
            approved,
            rejected,
            pendingReview: total - approved - rejected,
            missingInstall: 0,
            templates: 0,
          })
        );
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // poll queue while running
  useEffect(() => {
    if (!queue?.running) return;
    const t = setInterval(() => {
      fetch(`${API}/render/batch/status`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((q) => {
          setQueue(q);
          if (!q.running) load();
        })
        .catch(() => {});
    }, 1500);
    return () => clearInterval(t);
  }, [queue?.running, load]);

  async function startBatch({ regenerate = false, limit = 100 } = {}) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API}/render/batch`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ regenerate, limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا");
      setMsg(`${data.queued} مدل در صف تولید قرار گرفت.`);
      setQueue(data.state);
      load();
    } catch (e) {
      setMsg(e.message || "خطا در شروع تولید");
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    { label: "کل مدل‌ها", value: stats?.total, icon: Layers, color: "text-foreground" },
    { label: "تأییدشده", value: stats?.approved, icon: Check, color: "text-primary" },
    { label: "ردشده", value: stats?.rejected, icon: X, color: "text-destructive" },
    {
      label: "بدون نمونه نصب",
      value: stats?.missingInstall,
      icon: Clock,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-black text-foreground">موتور داخلی تولید نمونه</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            رایگان · بدون سرویس خارجی · فقط با دستور ادمین
          </p>
        </div>
        <Link
          to="/admin/window"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 font-body text-[11px] text-primary transition-colors hover:bg-primary/10"
        >
          <Sparkles className="h-3 w-3" /> قالب‌ها و بازبینی
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-secondary/60 bg-background p-3">
            <c.icon className={`h-4 w-4 ${c.color}`} />
            <p className="mt-2 font-display text-xl font-black text-foreground">
              {stats ? c.value ?? "—" : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </p>
            <p className="font-body text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {queue?.running && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 font-body text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال تولید: {queue.processed}/{queue.total}
            {queue.failed ? ` · خطا: ${queue.failed}` : ""}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary/60">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${queue.total ? Math.round((queue.processed / queue.total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || queue?.running}
          onClick={() => startBatch({ limit: 50, regenerate: false })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 py-2 font-body text-[11px] text-primary disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          تولید ۵۰ مدلِ بدون نمونه
        </button>
        <button
          type="button"
          disabled={busy || queue?.running}
          onClick={() => startBatch({ limit: 200, regenerate: false })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/70 px-3 py-2 font-body text-[11px] text-muted-foreground disabled:opacity-40"
        >
          تولید ۲۰۰ مدل
        </button>
        <button
          type="button"
          disabled={busy || queue?.running}
          onClick={() => {
            if (window.confirm("همه نمونه‌های موجود دوباره ساخته شوند؟")) {
              startBatch({ limit: 100, regenerate: true });
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/70 px-3 py-2 font-body text-[11px] text-muted-foreground disabled:opacity-40"
        >
          <RefreshCw className="h-3.5 w-3.5" /> بازتولید ۱۰۰تایی
        </button>
      </div>

      {msg && <p className="mt-3 font-body text-[11px] text-primary">{msg}</p>}

      <p className="mt-4 font-body text-[11px] leading-5 text-muted-foreground">
        موتور داخلی مثل یک AI رایگان روی سرور خودتان کار می‌کند: قالب سبز هر سبک + عکس پارچه مدل → نمونه نصب.
        مشتری فقط نمونه‌های <strong>تأییدشده</strong> را می‌بیند. تولید خودکار برای بازدیدکننده خاموش است.
        {stats?.templates != null && (
          <> · قالب‌های chroma: <strong>{stats.templates}</strong></>
        )}
      </p>
    </div>
  );
}
