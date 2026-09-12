import { useState } from "react";
import { Phone, Check } from "lucide-react";

export default function ContactCTA() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSent(true);
  };

  return (
    <section id="contact" className="relative overflow-hidden border-t border-secondary/40 bg-background py-24 lg:py-32">
      <div className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-royal-green/8 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-5 text-center lg:px-10">
        <span className="eyebrow mb-5 block">پشتیبانی اختصاصی</span>
        <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-5xl">
          مشاور <span className="text-gold-gradient">خصوصی</span> پرده آنتیک
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-body text-base leading-8 text-muted-foreground">
          شماره خود را وارد کنید؛ کارشناس ما برای مشاوره حضوری و انتخاب پارچه با شما تماس می‌گیرد. اکثر پرده‌ها بر اساس ابعاد سفارشی قیمت‌گذاری می‌شوند.
        </p>

        <div className="mx-auto mt-10 max-w-md">
          {sent ? (
            <div className="animate-fade-up rounded-2xl border border-primary/40 bg-card p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">سپاس از شما</h3>
              <p className="mt-2 font-body text-sm text-muted-foreground">درخواست شما ثبت شد. برای تماس فوری:</p>
              <a href="tel:02112345678" className="btn-gold mt-5 justify-center">
                <Phone className="h-4 w-4" /> ۰۲۱-۱۲۳۴۵۶۷۸
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-secondary/60 bg-card p-6 text-right">
              <label className="mb-1.5 block font-body text-xs text-muted-foreground">نام و نام خانوادگی</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثلاً: نیلوفر احمدی"
                className="mb-4 w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <label className="mb-1.5 block font-body text-xs text-muted-foreground">شماره تماس</label>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="mb-5 w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <button type="submit" className="btn-gold w-full justify-center" style={{ minHeight: 48 }}>
                درخواست تماس مشاور
              </button>
            </form>
          )}
        </div>

        <div className="mt-10 flex items-center justify-center gap-3 font-body text-sm text-muted-foreground">
          <Phone className="h-4 w-4 text-primary" />
          تماس مستقیم: <a href="tel:02112345678" className="font-bold text-primary">۰۲۱-۱۲۳۴۵۶۷۸</a>
        </div>
      </div>
    </section>
  );
}