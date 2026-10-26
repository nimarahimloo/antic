import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Loader2, FolderKanban, Layers, ShoppingBag, FileText, Tag } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const TYPE_META = {
  project: { label: "نمونه اجرا", icon: FolderKanban },
  model: { label: "مدل کاتالوگ", icon: Layers },
  category: { label: "دسته‌بندی", icon: Tag },
  product: { label: "فروشگاه", icon: ShoppingBag },
  page: { label: "صفحه", icon: FileText },
};

export default function GlobalSearch({ compact = false, className = "" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const timer = useRef(null);
  const abortRef = useRef(null);

  const runSearch = useCallback(async (query) => {
    const text = String(query || "").trim();
    if (text.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/search?q=${encodeURIComponent(text)}&limit=12`,
        { signal: ctrl.signal, headers: { Accept: "application/json" } }
      );
      const data = await res.json().catch(() => ({}));
      if (!ctrl.signal.aborted) {
        setResults(Array.isArray(data.results) ? data.results : []);
        setActive(0);
      }
    } catch (e) {
      if (e?.name !== "AbortError") setResults([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => runSearch(q), 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, runSearch]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (href) => {
    if (!href) return;
    setOpen(false);
    setQ("");
    setResults([]);
    navigate(href);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[active] || results[0];
      if (item) go(item.href);
    }
  };

  const showPanel = open && q.trim().length > 0;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div
        className={`flex items-center gap-2 rounded-full border bg-card/80 transition-colors ${
          open ? "border-primary/60" : "border-secondary/70"
        } ${compact ? "px-3 py-1.5" : "px-3.5 py-2"}`}
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="جستجو: نمونه آشپزخانه، مدل شید…"
          className={`min-w-0 flex-1 bg-transparent font-body text-sm text-foreground outline-none placeholder:text-muted-foreground/70 ${
            compact ? "w-28 md:w-40" : "w-36 md:w-56 lg:w-64"
          }`}
          autoComplete="off"
          aria-label="جستجوی سراسری"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
        {q && !loading && (
          <button
            type="button"
            aria-label="پاک کردن"
            className="text-muted-foreground hover:text-primary"
            onClick={() => {
              setQ("");
              setResults([]);
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-secondary/60 bg-card shadow-xl md:left-auto md:w-[min(100vw-2rem,22rem)]">
          {!loading && results.length === 0 && (
            <p className="px-4 py-6 text-center font-body text-xs text-muted-foreground">
              نتیجه‌ای برای «{q.trim()}» پیدا نشد
            </p>
          )}
          {results.map((item, idx) => {
            const meta = TYPE_META[item.type] || TYPE_META.page;
            const Icon = meta.icon;
            return (
              <Link
                key={`${item.type}-${item.id}`}
                to={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(item.href);
                }}
                className={`flex items-center gap-3 border-b border-secondary/40 px-3 py-2.5 last:border-0 transition-colors ${
                  idx === active ? "bg-primary/10" : "hover:bg-background/80"
                }`}
                onMouseEnter={() => setActive(idx)}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-secondary/50 bg-background">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate font-display text-sm font-bold text-foreground">{item.title}</p>
                  <p className="mt-0.5 truncate font-body text-[11px] text-muted-foreground">
                    {item.subtitle || meta.label}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary/50 px-2 py-0.5 font-body text-[10px] text-muted-foreground">
                  {meta.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
