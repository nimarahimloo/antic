import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronLeft, Loader2, Check, X, AlertCircle, Wrench } from "lucide-react";

const STATUS_MAP = {
  pending: { icon: Loader2, spin: true, color: "text-muted-foreground" },
  running: { icon: Loader2, spin: true, color: "text-primary" },
  in_progress: { icon: Loader2, spin: true, color: "text-primary" },
  completed: { icon: Check, spin: false, color: "text-primary" },
  success: { icon: Check, spin: false, color: "text-primary" },
  failed: { icon: X, spin: false, color: "text-destructive" },
  error: { icon: AlertCircle, spin: false, color: "text-destructive" },
};

function safeParse(val) {
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function isFailedStatus(toolCall) {
  if (["failed", "error"].includes(toolCall.status)) return true;
  const results = safeParse(toolCall.results);
  if (results && typeof results === "object" && results.success === false) return true;
  if (typeof results === "string" && /error|failed/i.test(results)) return true;
  return false;
}

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_MAP[toolCall.status] || STATUS_MAP.pending;
  const Icon = status.icon;
  const projection = toolCall.display_projection || {};
  const hideDetails = projection.hide_details && projection.details_redacted;
  const failed = isFailedStatus(toolCall);

  const label = failed
    ? projection.error_label || "ناموفق"
    : ["pending", "running", "in_progress"].includes(toolCall.status)
      ? projection.active_label || "در حال جست‌وجو در کاتالوگ..."
      : projection.label || "کاتالوگ بررسی شد";

  const parsedArgs = safeParse(toolCall.arguments_string);
  const parsedResults = safeParse(toolCall.results);

  return (
    <div className="mt-2.5 text-xs">
      <button
        type="button"
        onClick={() => !hideDetails && setExpanded((v) => !v)}
        className={`flex items-center gap-2 ${hideDetails ? "cursor-default" : "cursor-pointer"}`}
      >
        {!hideDetails && (
          expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        )}
        <Icon className={`h-3.5 w-3.5 ${status.spin ? "animate-spin" : ""} ${failed ? "text-destructive" : status.color}`} />
        <Wrench className={`h-3 w-3 ${failed ? "text-destructive/60" : "text-muted-foreground/60"}`} />
        <span className={failed ? "text-destructive" : "text-muted-foreground"}>{label}</span>
      </button>
      {expanded && !hideDetails && (
        <div className="mt-2 space-y-2 rounded-xl border border-secondary/50 bg-background/50 p-3">
          {parsedArgs && (
            <div>
              <p className="mb-1 font-display font-bold text-foreground/60">پارامترها:</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-foreground/50" dir="ltr">{JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <p className="mb-1 font-display font-bold text-foreground/60">نتیجه:</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-foreground/50" dir="ltr">{JSON.stringify(parsedResults, null, 2).slice(0, 800)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const navigate = useNavigate();

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[88%] ${isUser ? "" : "w-full"}`}>
        {message.content && (
          isUser ? (
            <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 font-body text-sm leading-7 text-primary-foreground shadow-lg shadow-primary/10">
              {message.content}
            </div>
          ) : (
            <div className="rounded-2xl rounded-tl-sm border border-secondary/60 bg-card/60 px-4 py-3.5">
              <ReactMarkdown
                className="max-w-none font-body text-sm leading-7 text-foreground/90 [&_a]:text-primary [&_a]:underline [&_a]:cursor-pointer [&_h1]:font-display [&_h1]:font-bold [&_h1]:text-base [&_h1]:mb-2 [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-sm [&_h2]:mb-2 [&_h3]:font-display [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mb-1.5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pr-5 [&_ul]:mb-2 [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-foreground [&_code]:text-primary"
                components={{
                  a: ({ href, children }) => {
                    if (href && href.startsWith("/curtain/")) {
                      return (
                        <span
                          className="text-primary underline cursor-pointer"
                          onClick={() => navigate(href)}
                        >
                          {children}
                        </span>
                      );
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )
        )}
        {message.tool_calls?.map((tc, i) => (
          <ToolCallDisplay key={i} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}