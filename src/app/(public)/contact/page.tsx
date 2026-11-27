import PageHero from "@/components/PageHero";
import { ContactPageSkeleton } from "@/components/Skeletons";
import ContactForm from "@/components/ContactForm";
import { Phone, Mail, MapPin } from "lucide-react";

export const revalidate = 86400; // SSG: revalidate once per day

export default async function ContactPage() {
  return (
    <ContactPageContent />
  );
}

function ContactPageContent() {
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
                <a href="tel:+982112345678" className="flex items-center gap-4 group">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">تماس مستقیم</p>
                    <p className="font-display text-lg font-bold text-foreground">۰۲۱-۱۲۳۴۵۶۷۸</p>
                  </div>
                </a>
                <a href="mailto:info@antic-curtain.ir" className="flex items-center gap-4 group">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-body text-xs text-muted-foreground">ایمیل</p>
                    <p className="font-display text-lg font-bold text-foreground">info@antic-curtain.ir</p>
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
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
