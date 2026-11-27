import PageHero from "@/components/PageHero";

export const revalidate = 86400; // SSG: revalidate once per day

export default async function AboutPage() {
  return (
    <AboutPageContent />
  );
}

function AboutPageContent() {
  return (
    <div className="bg-background">
      <PageHero
        pageKey="about"
        eyebrow="درباره ما"
        title="پرده آنتیک"
        description="خانه لوکس پرده و پارچه — از طراحی تا اجرا، هر پرده یک اثر معماری است."
      />

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-4xl">
              داستان <span className="text-gold-gradient">ما</span>
            </h2>
            <div className="mt-8 space-y-6 font-body text-base leading-8 text-muted-foreground">
              <p>
                پرده آنتیک با ایده‌ی ساده اما قدرتمند آغاز شد: «پرده تنها پوششی برای پنجره نیست، المان طراحی است که فضای زنده را تعریف می‌کند.»
              </p>
              <p>
                از سال‌های اول فعالیت، ما روی ترکیب هنر معماری و تکنولوژی بافت تمرکز کردیم. تیم طراحی ما شامل متخصصان نورپردازی، طراحان داخلی و کارشناسان بافت پارچه است که با هم مدل‌هایی را خلق می‌کنند که هم کارکرد عالی داشته باشند و هم زیبایی بصری بی‌نظیر.
              </p>
              <p>
                امروز پرده آنتیک با نمایی از کاتالوگ گسترده، نمونه‌های اجرای متنوع و فروشگاه تخصصی اکسسوری، مرجع کامل برای معماری‌داران، طراحان داخلی و صاحبان خانه‌هاست که کیفیت و ظرافت را در اولویت قرار می‌دهند.
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-secondary/60 bg-card/50 p-8 lg:p-12">
              <h3 className="font-display text-xl font-bold text-foreground">چرا پرده آنتیک؟</h3>
              <ul className="mt-6 space-y-4 font-body text-base leading-7 text-muted-foreground">
                <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary"><span className="h-3 w-3 rounded-full bg-current" /></span>تنوع بی‌نظیر مدل‌ها و بافت‌ها</li>
                <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary"><span className="h-3 w-3 rounded-full bg-current" /></span>مشاوره رایگان و طراحی اختصاصی</li>
                <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary"><span className="h-3 w-3 rounded-full bg-current" /></span>نصب حرفه‌ای با گارانتی</li>
                <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary"><span className="h-3 w-3 rounded-full bg-current" /></span>پشتیبانی پس از فروش</li>
                <li className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary"><span className="h-3 w-3 rounded-full bg-current" /></span>قیمت شفاف و بدون هزینه پنهان</li>
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-secondary/60 bg-card/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="font-display text-2xl font-black">۱۵</span>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">سال تجربه</p>
                    <p className="font-body text-sm text-muted-foreground">در صنعت پرده و بافت</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-secondary/60 bg-card/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="font-display text-2xl font-black">۵۰۰+</span>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">پروژه اجرا شده</p>
                    <p className="font-body text-sm text-muted-foreground">مسکونی و اداری</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-secondary/60 bg-card/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="font-display text-2xl font-black">۱۲۰+</span>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">مدل کاتالوگ</p>
                    <p className="font-body text-sm text-muted-foreground">با تنوع رنگ و بافت</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-secondary/60 bg-card/50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <span className="font-display text-2xl font-black">۱۰۰٪</span>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold text-foreground">رضایت مشتری</p>
                    <p className="font-body text-sm text-muted-foreground">تعهد ما</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}