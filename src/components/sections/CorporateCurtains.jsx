import { Phone, ArrowLeft } from "lucide-react";
import { Image } from "@/components/ui/image";

const ITEMS = [
  {
    name: "پرده زبرا",
    desc: "پرده دولایه با نوارهای متناوب شفاف و مات — کنترل دقیق نور برای فضای شرکتی و اداری.",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/7a46ed465_generated_51ab05dc.jpg",
    alt: "پرده زبرای دولایه در دفتر کار مدرن",
    tags: ["دولایه", "کنترل نور", "اداری"],
  },
  {
    name: "پرده رومی",
    desc: "پرده تاش‌خورده با چین‌های دقیق و پارچه لوکس — ظاهری مینیمال و کاملاً شیک.",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/6414c7e99_generated_d7c22136.jpg",
    alt: "پرده رومی تاش‌خورده با پارچه کتانی لوکس",
    tags: ["تاش‌خورده", "مینیمال", "کلاسیک"],
  },
  {
    name: "پرده شرکتی",
    desc: "سیستم‌های مدرن و تکنیکی برای دفاتر، کنفرانس‌ها و فضاهای تجاری با اجرای دقیق.",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/16a76f542_generated_ec73a1e0.jpg",
    alt: "پرده شرکتی عمودی برای فضای تجاری",
    tags: ["عمودی", "سیستمی", "تجاری"],
  },
];

export default function CorporateCurtains() {
  return (
    <section id="corporate" className="border-t border-secondary/40 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-4 block">دسته‌بندی · پرده‌های شرکتی</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
              سیستم‌هایی با <span className="text-gold-gradient">دقت معماری</span>
            </h2>
          </div>
          <p className="max-w-md font-body text-sm leading-7 text-muted-foreground">
            هر مدل دارای زیردسته‌بندی و کاتالوگ اختصاصی است. برای ابعاد سفارشی و مشاوره اجرا، با ما تماس بگیرید.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {ITEMS.map((item) => (
            <article key={item.name} className="group light-leak overflow-hidden rounded-3xl border border-secondary/60 bg-card">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.alt}
                  className="h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                  fittingType="fill"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
              </div>
              <div className="p-7">
                <h3 className="font-display text-xl font-bold text-foreground">{item.name}</h3>
                <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">{item.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.tags.map((t) => (
                    <span key={t} className="rounded-full border border-secondary/70 px-3 py-1 font-body text-[11px] text-muted-foreground">{t}</span>
                  ))}
                </div>
                <a href="tel:02112345678" className="btn-ghost-gold mt-6 w-full justify-center">
                  <Phone className="h-4 w-4" /> مشاوره و سفارش
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 text-center">
          <a href="tel:02112345678" className="font-body text-sm text-muted-foreground transition-colors hover:text-primary">
            درخواست کاتالوگ کامل پرده‌های شرکتی
          </a>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </div>
      </div>
    </section>
  );
}