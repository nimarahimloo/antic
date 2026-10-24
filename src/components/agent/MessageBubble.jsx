import ReactMarkdown from "react-markdown";
import { Link, useNavigate } from "react-router-dom";

function InternalLink({ href, children }) {
  const navigate = useNavigate();
  if (href && href.startsWith("/")) {
    return (
      <button
        type="button"
        className="text-primary underline cursor-pointer"
        onClick={() => navigate(href)}
      >
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
      {children}
    </a>
  );
}

function ModelCards({ items }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {items.map((item) => (
        <Link
          key={item.id || item.href}
          to={item.href}
          className="group overflow-hidden rounded-xl border border-secondary/60 bg-background/80 transition hover:border-primary"
        >
          <div className="relative aspect-[4/3] bg-secondary/30">
            {item.image ? (
              <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center font-display text-[11px] text-muted-foreground">
                {item.title}
              </div>
            )}
          </div>
          <div className="p-2 text-right">
            <p className="font-display text-xs font-bold text-foreground line-clamp-1">{item.title}</p>
            {item.subtitle && (
              <p className="mt-0.5 font-body text-[10px] text-muted-foreground line-clamp-1">
                {item.subtitle}
              </p>
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
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Link
          key={item.href + item.label}
          to={item.href}
          className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 font-body text-[11px] font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
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
          className="rounded-full border border-secondary/70 px-3 py-1.5 font-body text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
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
    <div className="mt-1">
      {blocks.map((b, i) => {
        if (b.type === "model_cards") return <ModelCards key={i} items={b.items} />;
        if (b.type === "link_buttons") return <LinkButtons key={i} items={b.items} />;
        if (b.type === "quick_replies")
          return <QuickReplies key={i} items={b.items} onPick={onQuickReply} />;
        if (b.type === "text" && b.markdown)
          return (
            <div key={i} className="mt-2">
              <MarkdownBody content={b.markdown} />
            </div>
          );
        return null;
      })}
    </div>
  );
}

function MarkdownBody({ content }) {
  return (
    <ReactMarkdown
      className="max-w-none font-body text-sm leading-7 text-foreground/90 [&_a]:text-primary [&_a]:underline [&_h1]:mb-2 [&_h1]:font-display [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-sm [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-bold [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pr-5"
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
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[92%] ${isUser ? "" : "w-full"}`}>
        {isUser ? (
          <div className="space-y-2">
            {message.attachments?.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {message.attachments.map((a, i) =>
                  a.type === "image" ? (
                    <img
                      key={i}
                      src={a.url}
                      alt=""
                      className="max-h-36 rounded-xl border border-primary/30 object-cover"
                    />
                  ) : null
                )}
              </div>
            )}
            {message.content && (
              <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-3 font-body text-sm leading-7 text-primary-foreground shadow-lg shadow-primary/10">
                {message.content}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-sm border border-secondary/60 bg-card/60 px-4 py-3.5">
            {message.content && <MarkdownBody content={message.content} />}
            <Blocks blocks={message.blocks} onQuickReply={onQuickReply} />
          </div>
        )}
      </div>
    </div>
  );
}
