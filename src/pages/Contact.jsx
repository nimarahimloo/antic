import { Phone, Mail, MapPin, Clock, Instagram } from "lucide-react";
import ConsultationForm from "@/components/ConsultationForm";

const INFO = [
  { icon: Phone, title: "تماس تلفنی", value: "۰۲۱-۱۲۳۴۵۶۷۸", href: "tel:02112345678" },
  { icon: Mail, title: "ایمیل", value: "info@pardehantik.com", href: "mailto:info@pardehantik.com" },
  { icon: MapPin, title: "نشانی شوروم", value: "تهران، نمایشگاه دائمی پرده" },
  { icon: Clock, title: "ساعات کاری", value: "شنبه تا پنجشنبه، ۹ تا ۱۸" },
];

export default function Contact() {
  return (
    <div className="bg-background">
      {/* هدر صفحه */}
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
          <span className="eyebrow mb-4 block">ارتباط با ما</span>
          <h1 className="font-display text-3xl font-black leading-tight text-foreground lg:text-6xl">
            گفت‌وگو را <span className="text-gold-gradient">آغاز</span> کنیم
          </h1>
          <p className="mt-5 max-w-2xl font-body text-sm leading-8 text-muted-foreground">
            برای مشاوره، بازدید حضوری از شوروم یا سفارش طراحی اختصاصی، از هر مسیری که راحت‌ترید با ما در تماس باشید.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* اطلاعات تماس */}
          <div className="space-y-4 lg:col-span-2">
            {INFO.map((item) => {
              const inner = (
                <>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary">
                    <item.icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-body text-xs text-muted-foreground">{item.title}</span>
                    <span className="mt-1 block font-display text-sm font-bold text-foreground">{item.value}</span>
                  </span>
                </>
              );
              return item.href ? (
                <a
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-4 rounded-2xl border border-secondary/60 bg-card p-5 transition-colors hover:border-primary/60"
                >
                  {inner}
                </a>
              ) : (
                <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-secondary/60 bg-card p-5">
                  {inner}
                </div>
              );
            })}

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-card p-5 transition-colors hover:border-primary"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Instagram className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="leading-tight">
                  <span className="block font-body text-xs text-muted-foreground">ما را دنبال کنید</span>
                  <span className="mt-1 block font-display text-sm font-bold text-foreground">اینستاگرام پرده آنتیک</span>
                </span>
              </span>
              <span className="font-display text-xs font-bold text-primary">پیج ما →</span>
            </a>
          </div>

          {/* فرم مشاوره */}
          <div className="rounded-3xl border border-secondary/60 bg-card p-6 lg:col-span-3 lg:p-10">
            <span className="eyebrow mb-3 block">فرم درخواست مشاوره</span>
            <h2 className="font-display text-xl font-black text-foreground lg:text-2xl">
              درخواست خود را <span className="text-gold-gradient">ثبت</span> کنید
            </h2>
            <p className="mt-3 font-body text-xs leading-7 text-muted-foreground">
              فرم را تکمیل کنید؛ کارشناس ما برای هماهنگی بازدید و مشاوره با شما تماس می‌گیرد.
            </p>
            <div className="mt-7">
              <ConsultationForm reference="صفحه تماس با ما" submitLabel="ارسال درخواست" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}