import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/agent/MessageBubble";
import { Send, Loader2, Sparkles, RefreshCw, Sofa, Moon, Sun, Palette } from "lucide-react";

const AGENT_NAME = "design_consultant";
const STORAGE_KEY = "design_consultant_conv";

const STARTERS = [
  { icon: Sofa, text: "پرده برای اتاق نشیمون می‌خوام، سبک مدرن" },
  { icon: Moon, text: "برای اتاق خواب پرده بلک‌اوت می‌خوام" },
  { icon: Sun, text: "فضام پر نوره، یه پرده شفاف می‌خوام" },
  { icon: Palette, text: "دکوراسیون کلاسیک دارم، چه پرده‌ای پیشنهاد می‌کنی؟" },
];

export default function DesignConsultant() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const createConversation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: "مشاوره طراحی پرده" },
      });
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      localStorage.setItem(STORAGE_KEY, conv.id);
    } catch (e) {
      setError("ساخت گفت‌وگو ناموفق بود. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      base44.agents
        .getConversation(stored)
        .then((conv) => {
          setConversationId(conv.id);
          setMessages(conv.messages || []);
          setIsLoading(false);
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          createConversation();
        });
    } else {
      createConversation();
    }
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setIsSending(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const sendMessage = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversationId || isSending) return;
    setInput("");
    setIsSending(true);
    setError(null);
    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, { role: "user", content });
    } catch {
      setIsSending(false);
      setError("ارسال پیام ناموفق بود. دوباره امتحان کنید.");
    }
  };

  const resetConversation = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConversationId(null);
    setMessages([]);
    createConversation();
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="border-b border-secondary/50 bg-card/30">
        <div className="mx-auto max-w-3xl px-5 py-8 lg:py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="eyebrow mb-3 block">مشاور طراحی هوشمند</span>
              <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
                مشاور <span className="text-gold-gradient">پرده‌سازی</span> پرده آنتیک
              </h1>
              <p className="mt-2 font-body text-sm leading-6 text-muted-foreground">
                با هوش مصنوعی درباره سلیقه و فضایت صحبت کن تا از کاتالوگ واقعی، بهترین مدل پرده رو برات پیشنهاد بده.
              </p>
            </div>
            {hasMessages && (
              <button
                onClick={resetConversation}
                className="flex flex-none items-center gap-1.5 rounded-full border border-secondary/60 px-3 py-2 font-body text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" /> گفت‌وگوی جدید
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Chat */}
      <section className="mx-auto max-w-3xl px-5 py-6">
        <div className="flex h-[calc(100vh-16rem)] flex-col">
          {/* Messages */}
          <div className="flex-1 space-y-5 overflow-y-auto pb-4 pr-1 no-scrollbar">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 font-body text-xs text-muted-foreground">در حال آماده‌سازی مشاور...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="font-body text-sm text-destructive">{error}</p>
                  <button onClick={createConversation} className="btn-ghost-gold mt-4 text-xs">
                    تلاش مجدد
                  </button>
                </div>
              </div>
            ) : !hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 text-primary">
                  <Sparkles className="h-7 w-7" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">خوش آمدید!</p>
                  <p className="mt-1.5 font-body text-sm leading-6 text-muted-foreground">
                    برای شروع، یکی از پیشنهادها رو انتخاب کن یا سؤالت رو بنویس.
                  </p>
                </div>
                <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {STARTERS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s.text)}
                      className="flex items-center gap-2.5 rounded-xl border border-secondary/60 bg-card/40 px-4 py-3 text-right font-body text-xs text-foreground/80 transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
                    >
                      <s.icon className="h-4 w-4 flex-none text-primary" />
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-tl-sm border border-secondary/60 bg-card/60 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-secondary/50 pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-end gap-2.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="سبک دکوراسیونت رو بنویس..."
                disabled={isSending || isLoading}
                className="flex-1 rounded-2xl border border-secondary/70 bg-card/60 px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending || isLoading}
                className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}