import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { Bot, Check, Copy, ExternalLink, User } from "lucide-react";

function InternalLink({ href, children }) {
  if (!href) return <span>{children}</span>;
  if (href.startsWith("http") || href.startsWith("//")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-0.5 font-semibold text-primary underline-offset-2 hover:underline"
      >
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  return (
    <Link to={href} className="font-semibold text-primary underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

function ModelCards({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      {items.map((it) => (
        <Link
          key={it.id || it.href}
          to={it.href || "#"}
          className="group overflow-hidden rounded-xl border border-secondary/60 bg-background/80 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
        >
          <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
            {it.image ? (
              <img
                src={it.image}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                بدون تصویر
              </div>
            )}
          </div>
          <div className="p-2">
            <p className="line-clamp-1 font-display text-[11px] font-bold text-foreground">{it.title}</p>
            {it.subtitle && (
              <p className="mt-0.5 line-clamp-1 font-body text-[9px] text-muted-foreground">{it.subtitle}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function LinkButtons({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {items.map((it, i) => {
        const inner = (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/5 px-3 py-1.5 font-body text-[11px] font-bold text-primary transition hover:bg-primary/15 active:scale-95">
            {it.label}
          </span>
        );
        if (it.href?.startsWith("http")) {
          return (
            <a key={i} href={it.href} target="_blank" rel="noreferrer">
              {inner}
            </a>
          );
        }
        return (
          <Link key={i} to={it.href || "/"}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

function QuickReplies({ items, onPick }) {
  if (!items?.length || !onPick) return null;
  return (
    <div className="mt-2 flex flex-wrap justify-start gap-1.5">
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(item.message || item.label)}
          className="rounded-full border border-primary/45 bg-card px-3 py-1.5 font-body text-[11px] font-bold text-primary shadow-sm transition hover:bg-primary hover:text-primary-foreground active:scale-95"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Blocks({ blocks, onQuickReply, onlyQuick }) {
  if (!blocks?.length) return null;
  const list = onlyQuick
    ? blocks.filter((b) => b.type === "quick_replies")
    : blocks.filter((b) => b.type !== "quick_replies");
  return (
    <div>
      {list.map((b, i) => {
        if (b.type === "model_cards") return <ModelCards key={`c-${i}`} items={b.items} />;
        if (b.type === "link_buttons") return <LinkButtons key={`l-${i}`} items={b.items} />;
        if (b.type === "quick_replies")
          return <QuickReplies key={`q-${i}`} items={b.items} onPick={onQuickReply} />;
        return null;
      })}
    </div>
  );
}

function MarkdownBody({ content }) {
  return (
    <ReactMarkdown
      className="max-w-none whitespace-pre-wrap break-words text-right font-body text-[13px] leading-7 text-foreground/90 [&_a]:text-primary [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pr-5"
      components={{
        a: ({ href, children }) => <InternalLink href={href}>{children}</InternalLink>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      title="کپی متن"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch {
          /* ignore */
        }
      }}
      className="rounded-md p-1 text-muted-foreground/70 opacity-0 transition hover:bg-secondary/60 hover:text-foreground group-hover:opacity-100"
    >
      {ok ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

/** Typing dots — bot on the LEFT (messaging style) */
export function TypingIndicator({ mode = "customer" }) {
  return (
    <div className="flex items-end justify-start gap-2">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          mode === "admin" ? "bg-foreground text-background" : "bg-primary/15 text-primary"
        }`}
      >
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-br-md border border-secondary/50 bg-card px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
      </div>
    </div>
  );
}

/**
 * جهت پیام‌ها (حس پیام‌رسان RTL مثل واتساپ/تلگرام):
 * - کاربر / ادمین → سمت راست
 * - ربات → سمت چپ
 */
export default function MessageBubble({ message, onQuickReply, mode = "customer" }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="group flex animate-in fade-in slide-in-from-bottom-1 items-end justify-end gap-2 duration-300">
        <div className="max-w-[85%] space-y-1">
          {message.attachments?.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {message.attachments.map((a, i) =>
                a.type === "image" ? (
                  <img
                    key={i}
                    src={a.url}
                    alt=""
                    className="max-h-44 rounded-2xl rounded-bl-md border border-primary/20 object-cover shadow-sm"
                  />
                ) : null
              )}
            </div>
          )}
          {message.content && (
            <div className="relative rounded-2xl rounded-bl-md bg-primary px-3.5 py-2.5 text-right font-body text-[13px] leading-7 text-primary-foreground shadow-md shadow-primary/10">
              {message.content}
            </div>
          )}
          {message.pending && (
            <p className="text-left font-body text-[9px] text-muted-foreground">در حال ارسال…</p>
          )}
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          <User className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex animate-in fade-in slide-in-from-bottom-1 items-end justify-start gap-2 duration-300">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          mode === "admin" ? "bg-foreground text-background" : "bg-primary/15 text-primary"
        }`}
      >
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="w-full max-w-[88%]">
        <div className="relative rounded-2xl rounded-br-md border border-secondary/50 bg-card px-3.5 py-3 text-right shadow-sm">
          <div className="absolute left-2 top-2">
            <CopyBtn text={message.content} />
          </div>
          {message.content && <MarkdownBody content={message.content} />}
          <Blocks blocks={message.blocks} onQuickReply={onQuickReply} onlyQuick={false} />
        </div>
        <Blocks blocks={message.blocks} onQuickReply={onQuickReply} onlyQuick />
      </div>
    </div>
  );
}
