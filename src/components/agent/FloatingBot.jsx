import { useEffect, useRef, useState, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  ImagePlus,
  RotateCcw,
} from "lucide-react";
import MessageBubble, { TypingIndicator } from "@/components/agent/MessageBubble";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";

/** Floating chat robot — customer | admin */
export default function FloatingBot({
  mode = "customer",
  agentName = "design_consultant",
  storageKey = "antic_bot_customer",
  title = "مشاور طراحی",
  subtitle = "آنلاین",
  context = null,
  starters = [],
  accentClass = "bg-primary text-primary-foreground",
  allowImage = false,
}) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const endRef = useRef(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToEnd = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    });
  }, []);

  const ensureConversation = async (forceNew = false) => {
    if (!forceNew && conversationId) return conversationId;
    setLoading(true);
    setErrorBanner("");
    try {
      if (!forceNew) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const conv = await api.agents.getConversation(stored);
            setConversationId(conv.id);
            setMessages(conv.messages || []);
            return conv.id;
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        localStorage.removeItem(storageKey);
        setConversationId(null);
      }
      const conv = await api.agents.createConversation({
        agent_name: agentName,
        metadata: { mode, name: title, context },
      });
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      localStorage.setItem(storageKey, conv.id);
      return conv.id;
    } catch {
      setErrorBanner("اتصال به دستیار برقرار نشد.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      ensureConversation().then(() => {
        setTimeout(() => inputRef.current?.focus(), 200);
        scrollToEnd(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) scrollToEnd(true);
  }, [messages, sending, open, scrollToEnd]);

  const pickImage = async (file) => {
    if (!file || !allowImage) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url;
      if (url) setPendingImage(url);
    } catch {
      setErrorBanner("آپلود تصویر ناموفق بود.");
    } finally {
      setUploading(false);
    }
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if ((!content && !pendingImage) || sending) return;

    const attachments = pendingImage ? [{ type: "image", url: pendingImage }] : undefined;
    const optimistic = {
      role: "user",
      content: content || (attachments ? "📷 تصویر" : ""),
      attachments,
      pending: true,
      _localId: `local-${Date.now()}`,
    };

    setInput("");
    setPendingImage(null);
    setErrorBanner("");
    setMessages((m) => [...m, optimistic]);
    setSending(true);

    try {
      const id = await ensureConversation();
      if (!id) throw new Error("no conversation");
      const conv = await api.agents.addMessage(id, {
        role: "user",
        content: content || (attachments ? "[تصویر]" : ""),
        attachments,
        context: context || undefined,
      });
      setMessages(conv.messages || []);
    } catch {
      setMessages((m) => [
        ...m.filter((x) => x._localId !== optimistic._localId),
        optimistic,
        {
          role: "assistant",
          content: "پیام ارسال نشد. اتصال را چک کن و دوباره بفرست.",
          blocks: [
            {
              type: "quick_replies",
              items: [{ label: "تلاش دوباره", message: content || "سلام" }],
            },
          ],
        },
      ]);
      setErrorBanner("ارسال ناموفق بود.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const showStarters =
    !sending &&
    starters?.length > 0 &&
    messages.filter((m) => m.role === "user").length === 0;

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed bottom-20 left-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition hover:scale-105 md:bottom-6 md:left-6 ${accentClass}`}
          aria-label={title}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/30 opacity-40" />
          <Sparkles className="relative h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-20 left-3 right-3 z-[90] flex max-h-[min(78vh,640px)] flex-col overflow-hidden rounded-2xl border border-secondary/70 bg-card shadow-2xl md:bottom-6 md:left-6 md:right-auto md:w-[400px]"
          role="dialog"
          aria-label={title}
        >
          {/* Header */}
          <header className="flex shrink-0 items-center gap-3 border-b border-secondary/60 bg-background/95 px-3 py-2.5 backdrop-blur">
            <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accentClass}`}>
              <MessageCircle className="h-5 w-5" />
              <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-black text-foreground">{title}</p>
              <p className="truncate font-body text-[10px] text-emerald-600">
                {sending ? "در حال نوشتن…" : loading ? "اتصال…" : subtitle || "آنلاین"}
              </p>
            </div>
            <button
              type="button"
              title="گفتگوی جدید"
              onClick={() => ensureConversation(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="بستن"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {errorBanner && (
            <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-center font-body text-[11px] text-destructive">
              {errorBanner}
            </div>
          )}

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gradient-to-b from-background/40 to-card px-3 py-3"
          >
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg._localId || `${msg.role}-${idx}-${(msg.content || "").slice(0, 12)}`}
                    message={msg}
                    onQuickReply={(text) => send(text)}
                  />
                ))}
                {sending && <TypingIndicator />}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Starter chips — only at beginning */}
          {showStarters && (
            <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-secondary/40 px-3 py-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={sending}
                  onClick={() => send(s)}
                  className="rounded-full border border-secondary/70 bg-background px-2.5 py-1 font-body text-[10px] text-foreground transition hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {pendingImage && (
            <div className="flex shrink-0 items-center gap-2 border-t border-secondary/40 px-3 py-2">
              <img src={pendingImage} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <button
                type="button"
                className="text-xs text-destructive"
                onClick={() => setPendingImage(null)}
              >
                حذف تصویر
              </button>
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex shrink-0 items-end gap-2 border-t border-secondary/60 bg-background/90 p-2.5 backdrop-blur"
          >
            {allowImage && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    pickImage(f);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading || sending}
                  onClick={() => fileRef.current?.click()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-secondary/70 text-muted-foreground hover:border-primary hover:text-primary"
                  aria-label="ارسال تصویر"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                </button>
              </>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="پیام بنویس…"
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-secondary bg-card px-3 py-2.5 font-body text-sm leading-5 outline-none focus:border-primary"
              disabled={sending && !input}
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !pendingImage)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40 ${accentClass}`}
              aria-label="ارسال"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
