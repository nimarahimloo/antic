import ReactMarkdown from "react-markdown";
import { Link, useNavigate } from "react-router-dom";

function InternalLink({ href, children }) {
  const navigate = useNavigate();
  if (href && href.startsWith("/")) {
    return (
      <button
        type="button"
        className="font-bold text-primary underline decoration-primary/40 underline-offset-2"
        onClick={() => navigate(href)}
      >
        {children}
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-bold text-primary underline"
    >
      {children}
    </a>
  );
}

function ModelCards({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5">
      {items.map((item) => (
        <Link
          key={item.id || item.href}
          to={item.href}
          className="group overflow-hidden rounded-2xl border border-secondary/50 bg-background shadow-sm transition hover:border-primary hover:shadow-md"
        >
          <div className="relative aspect-[3/4] bg-secondary/30">
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center font-display text-xs text-muted-foreground">
                {item.title}
              </div>
            )}
          </div>
          <div className="space-y-0.5 p-2.5 text-right">
            <p className="font-display text-xs font-black text-foreground line-clamp-2">{item.title}</p>
            {item.subtitle && (
              <p className="font-body text-[10px] leading-4 text-muted-foreground line-clamp-2">
                {item.subtitle}
              </p>
            )}
            <span className="inline-block pt-1 font-body text-[10px] font-bold text-primary">
              مشاهده مدل ←
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function LinkButtons({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          to={item.href}
          className="rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 font-body text-[11px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function QuickReplies({ items, onPick }) {
  if (!items?.length || !onPick) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.message}
          type="button"
          onClick={() => onPick(item.message)}
          className="rounded-full border border-secondary/60 bg-background/80 px-3 py-1.5 font-body text-[11px] text-foreground/80 transition hover:border-primary hover:text-primary"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Blocks({ blocks, onQuickReply }) {
  if (!blocks?.length) return null;
  return (
    <div>
      {blocks.map((b, i) => {
        if (b.type === "model_cards") return <ModelCards key={i} items={b.items} />;
        if (b.type === "link_buttons") return <LinkButtons key={i} items={b.items} />;
        if (b.type === "quick_replies")
          return <QuickReplies key={i} items={b.items} onPick={onQuickReply} />;
        return null;
      })}
    </div>
  );
}

function MarkdownBody({ content }) {
  return (
    <ReactMarkdown
      className="max-w-none whitespace-pre-wrap font-body text-[13px] leading-7 text-foreground/90 [&_a]:text-primary [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pr-5"
      components={{
        a: ({ href, children }) => <InternalLink href={href}>{children}</InternalLink>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function MessageBubble({ message, onQuickReply }) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-start" : "flex justify-end"}>
      <div className={`max-w-[90%] ${isUser ? "" : "w-full max-w-[90%]"}`}>
        {isUser ? (
          <div className="space-y-2">
            {message.attachments?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.attachments.map((a, i) =>
                  a.type === "image" ? (
                    <img
                      key={i}
                      src={a.url}
                      alt=""
                      className="max-h-40 rounded-2xl border border-primary/20 object-cover"
                    />
                  ) : null
                )}
              </div>
            )}
            {message.content && (
              <div className="rounded-[18px] rounded-br-md bg-primary px-3.5 py-2.5 font-body text-[13px] leading-7 text-primary-foreground shadow-md shadow-primary/15">
                {message.content}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[18px] rounded-bl-md border border-secondary/50 bg-card px-3.5 py-3 shadow-sm">
            {message.content && <MarkdownBody content={message.content} />}
            <Blocks blocks={message.blocks} onQuickReply={onQuickReply} />
          </div>
        )}
      </div>
    </div>
  );
}
