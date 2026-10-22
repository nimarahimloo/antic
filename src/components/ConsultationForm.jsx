import { useState } from "react";
import { Check, Loader2, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";

const SPACE_TYPES = ["پذیرایی", "اتاق خواب", "آشپزخانه", "دفتر کار", "فضای تجاری", "سایر"];

const inputCls =
  "w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary";
const labelCls = "mb-1.5 block font-body text-xs text-muted-foreground";

export default function ConsultationForm({ reference = "", submitLabel = "ثبت درخواست مشاوره" }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", space_type: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSending(true);
    setError("");
    try {
      await base44.entities.ConsultationRequest.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        city: form.city.trim() || undefined,
        space_type: form.space_type || undefined,
        message: form.message.trim() || undefined,
        reference: reference || undefined,
        status: "new",
      });
      setSent(true);
    } catch {
      setError("ثبت درخواست ناموفق بود؛ لطفاً دوباره تلاش کنید یا تلفنی تماس بگیرید.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-up rounded-2xl border border-primary/40 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-bold text-foreground">درخواست شما ثبت شد</h3>
        <p className="mt-2 font-body text-sm leading-7 text-muted-foreground">
          کارشناس ما در اولین فرصت با شما تماس می‌گیرد. برای تماس فوری:
        </p>
        <a href="tel:02112345678" className="btn-gold mt-5 justify-center">
          <Phone className="h-4 w-4" /> ۰۲۱-۱۲۳۴۵۶۷۸
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="text-right">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>نام و نام خانوادگی *</label>
          <input type="text" required value={form.name} onChange={set("name")} placeholder="مثلاً: نیلوفر احمدی" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>شماره تماس *</label>
          <input type="tel" required inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="۰۹۱۲۳۴۵۶۷۸۹" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>ایمیل (اختیاری)</label>
          <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>شهر (اختیاری)</label>
          <input type="text" value={form.city} onChange={set("city")} placeholder="مثلاً: تهران" className={inputCls} />
        </div>
      </div>

      <div className="mt-5">
        <label className={labelCls}>نوع فضا</label>
        <div className="flex flex-wrap gap-2">
          {SPACE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, space_type: f.space_type === t ? "" : t }))}
              className={`rounded-full border px-4 py-2 font-body text-xs transition-colors ${
                form.space_type === t
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-secondary/70 text-muted-foreground hover:border-primary/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className={labelCls}>توضیحات (اختیاری)</label>
        <textarea
          rows={4}
          value={form.message}
          onChange={set("message")}
          placeholder="فضا، سبک دلخواه یا هر نکته‌ای که باید بدانیم…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && <p className="mt-4 font-body text-xs text-destructive">{error}</p>}

      <button type="submit" disabled={sending} className="btn-gold mt-6 w-full justify-center disabled:opacity-60" style={{ minHeight: 48 }}>
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> در حال ثبت…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}