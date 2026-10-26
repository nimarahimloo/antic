import { useEffect, useRef, useState, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  ImagePlus,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import MessageBubble, { TypingIndicator } from "@/components/agent/MessageBubble";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";
import { playSendSound, playReceiveSound, unlockChatSounds } from "@/lib/chatSounds";

/** Floating intelligent chat robot — customer | admin (panel on the RIGHT) */
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
  const [expanded, setExpanded] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [unread, setUnread] = useState(0);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const wasOpen = useRef(false);
  const prevMsgCount = useRef(0);

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
            prevMsgCount.current = (conv.messages || []).length;
            return conv.id;
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        localStorage.removeItem(storageKey);
        setConversationId(null);
        setMessages([]);
        prevMsgCount.current = 0;
      }
      const conv = await api.agents.createConversation({
        agent_name: agentName,
        metadata: { mode, name: title, context },
      });
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      prevMsgCount.current = (conv.messages || []).length;
      localStorage.setItem(storageKey, conv.id);
      return conv.id;
    } catch {
      setErrorBanner("اتصال به دستیار برقرار نشد. دوباره تلاش کنید.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setUnread(0);
      unlockChatSounds();
      ensureConversation().then(() => {
        setTimeout(() => inputRef.current?.focus(), 180);
        scrollToEnd(false);
      });
      wasOpen.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) scrollToEnd(true);
  }, [messages, sending, open, scrollToEnd]);

  // Play receive sound when a new assistant message appears
  useEffect(() => {
    const n = messages.length;
    if (n > prevMsgCount.current) {
      const last = messages[n - 1];
      if (last?.role === "assistant" && !last.pending) {
        playReceiveSound();
      }
    }
    prevMsgCount.current = n;
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const pickImage = async (file) => {
    if (!file || !allowImage) return;
    setUploading(true);
    setErrorBanner("");
    try {
      const compressed = await compressImage(file);
      const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url;
      if (url) setPendingImage(url);
      else setErrorBanner("آپلود تصویر ناموفق بود.");
    } catch {
      setErrorBanner("آپلود تصویر ناموفق بود.");
    } finally {
      setUploading(false);
    }
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if ((!content && !pendingImage) || sending) return;

    unlockChatSounds();
    playSendSound();

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
      const next = conv.messages || [];
      setMessages(next);
      if (!open) {
        const last = next[next.length - 1];
        if (last?.role === "assistant") setUnread((u) => u + 1);
      }
    } catch {
      setMessages((m) => [
        ...m.filter((x) => x._localId !== optimistic._localId),
        { ...optimistic, pending: false },
        {
          role: "assistant",
          content: "پیام ارسال نشد. اتصال اینترنت را بررسی کنید و دوباره بفرستید.",
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
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
    if (e.key === "Escape") setOpen(false);
  };

  const showStarters =
    !sending && starters?.length > 0 && messages.filter((m) => m.role === "user").length === 0;

  const statusLabel = sending
    ? "در حال نوشتن…"
    : loading
      ? "در حال اتصال…"
      : subtitle || "آنلاین";

  // پنل و دکمه شناور — سمت راست صفحه
  const panelSize = expanded
    ? "fixed inset-3 z-[90] flex flex-col overflow-hidden rounded-2xl border border-secondary/70 bg-card shadow-2xl md:inset-auto md:bottom-6 md:right-6 md:h-[min(88vh,720px)] md:w-[440px]"
    : "fixed bottom-20 left-3 right-3 z-[90] flex max-h-[min(78vh,640px)] flex-col overflow-hidden rounded-2xl border border-secondary/70 bg-card shadow-2xl md:bottom-6 md:right-6 md:left-auto md:w-[400px]";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            unlockChatSounds();
            setOpen(true);
          }}
          className={`fixed bottom-20 right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition hover:scale-105 active:scale-95 md:bottom-6 md:right-6 ${accentClass}`}
          aria-label={title}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-20" />
          <Sparkles className="relative h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -left-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 font-display text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "۹+" : unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className={panelSize} role="dialog" aria-label={title}>
          <header className="flex shrink-0 items-center gap-3 border-b border-secondary/60 bg-background/95 px-3 py-2.5 backdrop-blur">
            <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accentClass}`}>
              <MessageCircle className="h-5 w-5" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="truncate font-display text-sm font-black text-foreground">{title}</p>
              <p
                className={`truncate font-body text-[10px] ${
                  sending ? "text-primary" : "text-emerald-600"
                }`}
              >
                {statusLabel}
              </p>
            </div>
            <button
              type="button"
              title="گفتگوی جدید"
              onClick={() => ensureConversation(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={expanded ? "کوچک" : "بزرگ"}
              onClick={() => setExpanded((v) => !v)}
              className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground md:flex"
            >
              {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title="بستن"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {errorBanner && (
            <div className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 text-center font-body text-[11px] text-destructive">
              {errorBanner}
            </div>
          )}

          <div className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain bg-gradient-to-b from-background/50 to-card px-3 py-3">
            {loading && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="font-body text-xs text-muted-foreground">در حال آماده‌سازی دستیار…</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg._localId || `${msg.role}-${idx}-${(msg.content || "").slice(0, 16)}`}
                    message={msg}
                    mode={mode}
                    onQuickReply={(t) => send(t)}
                  />
                ))}
                {sending && <TypingIndicator mode={mode} />}
                <div ref={endRef} className="h-1" />
              </>
            )}
          </div>

          {showStarters && (
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5 border-t border-secondary/40 bg-background/40 px-3 py-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={sending}
                  onClick={() => send(s)}
                  className="rounded-full border border-secondary/70 bg-card px-2.5 py-1 font-body text-[10px] text-foreground transition hover:border-primary hover:text-primary active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {pendingImage && (
            <div className="flex shrink-0 items-center gap-2 border-t border-secondary/40 px-3 py-2">
              <img src={pendingImage} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-secondary" />
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate font-body text-[11px] text-muted-foreground">آماده ارسال</p>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-destructive"
                onClick={() => setPendingImage(null)}
              >
                حذف
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex shrink-0 items-end gap-2 border-t border-secondary/60 bg-background/95 p-2.5 backdrop-blur"
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-secondary/70 text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-40"
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
              dir="rtl"
              placeholder={mode === "admin" ? "دستور یا سوال…" : "پیامت را بنویس…"}
              className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl border border-secondary bg-card px-3 py-2.5 text-right font-body text-sm leading-5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              disabled={loading && messages.length === 0}
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !pendingImage)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-40 ${accentClass}`}
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
