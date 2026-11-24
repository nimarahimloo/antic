"use client";

import { Suspense } from "react";
import { useState } from "react";
import { Phone, Mail, MapPin, Check } from "lucide-react";
import { SITE_PHONE_HREF, SITE_PHONE_DISPLAY, SITE_EMAIL } from "@/lib/siteContact";
import PageHero from "@/components/PageHero";
import { ContactPageSkeleton } from "@/components/Skeletons";

function ContactPageContent() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSent(true);
  };

  return (
    <div className="bg-background">
      <PageHero
        pageKey="contact"
        eyebrow="تماس با ما"
        title="مشاوره و سفارش"
        description="تیم ما برای پاسخگویی به سوالات و هماهنگی بازدید آماده است."
      />

      <section id="contact" className="relative overflow-hidden border-t border-secondary/40 bg-background py-24 lg:py-32">
        <div className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-royal-green/8 blur-[120px]" />

        <div className="relative mx-auto max-w-5xl px-5 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-4xl">
                بفرمایید <span className="text-gold-gradient">در ارتباط باشیم</span>
              </h2>
              <p className="mt-6 font-body text-base leading-8 text-muted-foreground">
                نام، شماره تماس و پیام خود را بگذارید تا کارشناس ما برای هماهنگی بازدید یا پاسخ به سوالات با شما تماس بگیرد.
                قیمت بر اساس ابعاد پنجره و نوع پارچه اعلام می‌شود.
              </p>

              <div className="mt-10 space-y-6">
                <a href={SITE_PHONE_HREF} className="flex items-center gap-4 group">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">تماس مستقیم</p>
                    <p className="font-display text-lg font-bold text-foreground">{SITE_PHONE_DISPLAY}</p>
                  </div>
                </a>
                <a href={`mailto:${SITE_EMAIL}`} className="flex items-center gap-4 group">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">ایمیل</p>
                    <p className="font-display text-lg font-bold text-foreground">{SITE_EMAIL}</p>
                  </div>
                </a>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-secondary/60 bg-card text-muted-foreground">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">نمایشگاه دائمی</p>
                    <p className="font-display text-lg font-bold text-foreground">تهران، خیابان ولعصر، پلاک ۱۲۳</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:p-8">
                {sent ? (
                  <div className="animate-fade-up rounded-2xl border border-primary/40 bg-card p-8 text-center">
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
                  <form onSubmit={submit} className="space-y-5">
                    <h3 className="font-display text-lg font-bold text-foreground">فرم تماس</h3>
                    <div>
                      <label htmlFor="name" className="mb-1.5 block font-body text-xs text-muted-foreground">نام و نام خانوادگی</label>
                      <input
                        id="name"
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                        placeholder="مثال: سارا محمدی"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-1.5 block font-body text-xs text-muted-foreground">شماره تماس</label>
                      <input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary"
                        placeholder="۰۹۱۲…"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="message" className="mb-1.5 block font-body text-xs text-muted-foreground">پیام</label>
                      <textarea
                        id="message"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={4}
                        className="w-full rounded-xl border border-secondary bg-background px-4 py-3 font-body text-sm outline-none focus:border-primary resize-none"
                        placeholder="توضیحات پروژه، ابعاد تقریبی، نوع پارچه مورد نظر..."
                      />
                    </div>
                    <button type="submit" className="btn-gold w-full justify-center" style={{ minHeight: 48 }}>
                      ارسال درخواست
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactPageSkeleton />}>
      <ContactPageContent />
    </Suspense>
  );
}