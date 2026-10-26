import { useState } from "react";
import { Phone, Check } from "lucide-react";
import { SITE_PHONE_HREF, SITE_PHONE_DISPLAY } from "@/lib/siteContact";

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
        <span className="eyebrow mb-5 block">مشاوره و سفارش</span>
        <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-5xl">
          آماده‌اید از <span className="text-gold-gradient">مشاوره</span> شروع کنیم؟
        </h2>
        <p className="mx-auto mt-6 max-w-xl font-body text-base leading-8 text-muted-foreground">
          نام و شماره تماس خود را بگذارید تا کارشناس ما برای هماهنگی بازدید یا پاسخ به سوالات با
          شما تماس بگیرد. قیمت بر اساس ابعاد پنجره و نوع پارچه اعلام می‌شود.
        </p>

        <div className="mx-auto mt-10 max-w-md">
          {sent ? (
            <div className="animate-fade-up rounded-2xl border border-primary/40 bg-card p-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">درخواست شما ثبت شد</h3>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                به‌زودی با شما تماس می‌گیریم. برای تماس فوری:
              </p>
              <a href={SITE_PHONE_HREF} className="btn-gold mt-5 justify-center">
                <Phone className="h-4 w-4" /> {SITE_PHONE_DISPLAY}
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="rounded-2xl border border-secondary/60 bg-card p-6 text-right">
              <label className="mb-1.5 block font-body text-xs text-muted-foreground">نام و نام خانوادگی</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mb-4 w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                placeholder="مثال: سارا محمدی"
                required
              />
              <label className="mb-1.5 block font-body text-xs text-muted-foreground">شماره تماس</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mb-5 w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                placeholder="۰۹۱۲…"
                required
              />
              <button type="submit" className="btn-gold w-full justify-center">
                درخواست تماس
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
