import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plug, Copy, Check, ExternalLink } from "lucide-react";

export default function McpServerCard() {
  const [copied, setCopied] = useState(false);
  const serverUrl = useMemo(
    () => new URL("/api/mcp", window.location.origin).toString(),
    []
  );

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl border border-secondary/60 bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/50 text-primary">
          <Plug className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-sm font-black text-foreground">سرور MCP</h2>
          <p className="font-body text-xs text-muted-foreground">دستیار هوش مصنوعی را به کاتالوگ متصل کنید</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code
          className="flex-1 overflow-x-auto rounded-xl border border-secondary/70 bg-background px-4 py-2.5 font-mono text-xs text-primary"
          dir="ltr"
        >
          {serverUrl}
        </code>
        <button
          onClick={copyUrl}
          className="btn-ghost-gold shrink-0 justify-center text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> کپی شد
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> کپی آدرس
            </>
          )}
        </button>
      </div>

      <p className="mt-3 font-body text-[11px] leading-5 text-muted-foreground">
        سرور عمومی و فقط‌خواندنی است؛ دستیار فقط داده‌های عمومی کاتالوگ و پروژه‌ها را می‌خواند.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/connect"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 font-body text-[11px] text-primary transition-colors hover:bg-primary/10"
        >
          راهنمای کامل اتصال <ExternalLink className="h-3 w-3" />
        </Link>
        <a
          href="https://claude.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/60 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          Claude
        </a>
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/60 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          ChatGPT
        </a>
        <a
          href="https://cursor.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/60 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          Cursor
        </a>
      </div>
    </div>
  );
}