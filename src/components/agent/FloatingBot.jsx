import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Minimize2, ImagePlus } from "lucide-react";
import MessageBubble from "@/components/agent/MessageBubble";
import { api } from "@/api/client";
import { compressImage } from "@/lib/compressImage";

/** Reusable floating chat bot. mode: customer | admin */
export default function FloatingBot({
  mode = "customer",
  agentName = "design_consultant",
  storageKey = "antic_bot_customer",
  title = "مشاور طراحی",
  subtitle = "کمک به انتخاب پرده",
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
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    setLoading(true);
    try {
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
      const conv = await api.agents.createConversation({
        agent_name: agentName,
        metadata: { mode, name: title, context },
      });
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      localStorage.setItem(storageKey, conv.id);
      return conv.id;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) ensureConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  const pickImage = async (file) => {
    if (!file || !allowImage) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const res = await api.integrations.Core.UploadPublicFile({ file: compressed });
      const url = res?.file_url || res?.url;
      if (url) setPendingImage(url);
    } catch {
      /* silent */
    } finally {
      setUploading(false);
    }
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if ((!content && !pendingImage) || sending) return;
    setInput("");
    const attachments = pendingImage ? [{ type: "image", url: pendingImage }] : undefined;
    setPendingImage(null);
    setSending(true);
    try {
      const id = await ensureConversation();
      const conv = await api.agents.addMessage(id, {
        role: "user",
        content: content || (attachments ? "[تصویر]" : ""),
        attachments,
        context: context || undefined,
      });
      setMessages(conv.messages || []);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "ارتباط برقرار نشد. یک‌بار دیگر تلاش کنید." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed bottom-20 left-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105 md:bottom-6 md:left-6 ${accentClass}`}
          aria-label={title}
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 left-3 right-3 z-[90] flex max-h-[min(72vh,600px)] flex-col overflow-hidden rounded-2xl border border-secondary/70 bg-card shadow-2xl md:bottom-6 md:left-6 md:right-auto md:w-[400px]">
          <header className="flex items-center gap-3 border-b border-secondary/60 bg-background/80 px-4 py-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${accentClass}`}>
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-black text-foreground">{title}</p>
              <p className="truncate font-body text-[10px] text-muted-foreground">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              aria-label="بستن"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              aria-label="بستن کامل"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {!loading &&
              messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} onQuickReply={(t) => send(t)} />
              ))}
            {sending && (
              <div className="flex items-center gap-2 font-body text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال آماده‌سازی…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {starters.length > 0 && messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-secondary/40 px-3 py-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-secondary/70 px-2.5 py-1 font-body text-[10px] text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {pendingImage && (
            <div className="flex items-center gap-2 border-t border-secondary/40 px-3 py-2">
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-secondary/60 p-3"
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
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={allowImage ? "متن یا تصویر…" : "پیامت را بنویس…"}
              className="flex-1 rounded-xl border border-secondary bg-background px-3 py-2 font-body text-sm outline-none focus:border-primary"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || (!input.trim() && !pendingImage)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl disabled:opacity-40 ${accentClass}`}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
