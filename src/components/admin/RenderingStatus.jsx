import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, Clock, Layers, Loader2, Sparkles, Play, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE || "/api";

function authHeaders() {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("antic_access_token") : null;
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
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    fetch(`${API}/render/stats`, { headers: authHeaders() })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 403) {
          throw new Error("برای تولید batch باید با حساب ادمین وارد شوید.");
        }
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        return d;
      })
      .then((d) => {
        setStats(d);
        setQueue(d.queue || null);
        setErr("");
      })
      .catch((e) => {
        setErr(e.message || "بارگذاری آمار ناموفق");
        Promise.all([
          base44.entities.CurtainModel.count({}),
          base44.entities.CurtainModel.count({ install_status: "approved" }),
          base44.entities.CurtainModel.count({ install_status: "rejected" }),
        ])
          .then(([total, approved, rejected]) =>
            setStats({
              total,
              approved,
              rejected,
              pendingReview: Math.max(0, total - approved - rejected),
              missingInstall: 0,
              templates: 0,
            })
          )
          .catch(() => {});
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    }, 1200);
    return () => clearInterval(t);
  }, [queue?.running, load]);

  async function ensureTemplatesFirst() {
    try {
      const res = await fetch(`${API}/render/template/all-categories", {
        method: "POST",
        headers: authHeaders(),
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error("ورود ادمین لازم است");
      }
      if (!res.ok) throw new Error(data.error || "ساخت قالب دسته‌ها ناموفق");
      return data.count ?? 0;
    } catch (e) {
      // non-fatal — batch may still work if templates exist
      console.warn(e);
      return 0;
    }
  }

  async function startBatch({ regenerate = false, limit = 100 } = {}) {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const token = localStorage.getItem("antic_access_token");
      if (!token) throw new Error("وارد حساب ادمین نشده‌اید. از صفحه ورود وارد شوید.");

      setMsg("در حال آماده‌سازی قالب دسته‌ها…");
      const nTpl = await ensureTemplatesFirst();

      const res = await fetch(`${API}/render/batch`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ regenerate, limit }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error("دسترسی ادمین لازم است.");
      }
      if (res.status === 409) {
        throw new Error(data.error || "یک صف تولید از قبل در حال اجراست؛ کمی صبر کنید.");
      }
      if (!res.ok) throw new Error(data.error || `خطا (${res.status})`);

      const queued = data.queued ?? 0;
      if (queued === 0) {
        setMsg(
          regenerate
            ? "مدلی برای بازتولید پیدا نشد (همه تأیید شده‌اند یا عکس پارچه ندارند)."
            : "مدلی در صف نبود: یا همه نمونه دارند، یا مدل‌ها عکس پارچه ندارند. از «بازتولید اجباری» استفاده کنید."
        );
      } else {
        setMsg(
          `${queued} مدل در صف قرار گرفت` +
            (nTpl ? ` · ${nTpl} قالب دسته به‌روز شد` : "") +
            ". نمونه‌های با امتیاز بالا خودکار تأیید می‌شوند."
        );
      }
      setQueue(data.state || getEmptyQueue());
      load();
    } catch (e) {
      setErr(e.message || "خطا در شروع تولید");
      setMsg("");
    } finally {
      setBusy(false);
    }
  }

  function getEmptyQueue() {
    return { running: false, processed: 0, failed: 0, total: 0 };
  }

  const cards = [
    { label: "کل مدل‌ها", value: stats?.total, icon: Layers, color: "text-foreground" },
    { label: "تأییدشده", value: stats?.approved, icon: Check, color: "text-primary" },
    { label: "ردشده", value: stats?.rejected, icon: X, color: "text-destructive" },
    {
      label: "بدون نمونه",
      value: stats?.missingInstall,
      icon: Clock,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-black text-foreground">موتور تولید نمونه نصب</h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            قبل از batch قالب هر دسته ساخته/به‌روز می‌شود · امتیاز کیفیت · تأیید خودکار
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
              {stats ? (
                c.value ?? "—"
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </p>
            <p className="font-body text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {queue?.running && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 font-body text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            تولید: {queue.processed}/{queue.total}
            {queue.failed ? ` · خطا: ${queue.failed}` : ""}
            {queue.avgScore != null ? ` · میانگین امتیاز: ${queue.avgScore}` : ""}
          </div>
          {queue.lastError && (
            <p className="mt-1 text-[10px] text-destructive">{queue.lastError}</p>
          )}
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
          تولید ۵۰ مدل
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
            if (window.confirm("نمونه‌ها دوباره ساخته شوند (حتی تأییدشده‌ها)؟")) {
              startBatch({ limit: 100, regenerate: true });
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/70 px-3 py-2 font-body text-[11px] text-muted-foreground disabled:opacity-40"
        >
          <RefreshCw className="h-3.5 w-3.5" /> بازتولید اجباری ۱۰۰
        </button>
      </div>

      {msg && <p className="mt-3 font-body text-[11px] text-primary">{msg}</p>}
      {err && <p className="mt-3 font-body text-[11px] text-destructive">{err}</p>}

      <p className="mt-4 font-body text-[11px] leading-5 text-muted-foreground">
        مدل باید عکس پارچه داشته باشد و برای دسته‌اش قالب نصب وجود داشته باشد. با زدن batch، قالب همه
        دسته‌ها اول به‌روز می‌شود.
        {stats?.templates != null && <> · قالب‌های ثبت‌شده: <strong>{stats.templates}</strong></>}
        {stats?.withFabric != null && <> · با پارچه: <strong>{stats.withFabric}</strong></>}
      </p>
    </div>
  );
}
