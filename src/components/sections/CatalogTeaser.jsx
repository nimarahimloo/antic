import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CatalogTeaser() {
  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-28">
      <div className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-royal-green/8 blur-[100px]" />
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="eyebrow mb-4 block">کاتالوگ پرده</span>
            <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-5xl">
              مدل‌ها را <span className="text-gold-gradient">با جزئیات</span> ببینید
            </h2>
            <p className="mt-5 font-body text-sm leading-8 text-muted-foreground">
              در کاتالوگ، دسته‌های مختلف پرده را مرور کنید و برای هر مدل کد، رنگ و نمای نصب را
              بررسی کنید. انتخاب آگاهانه، قدم اول یک اجرای تمیز است.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/catalog" className="btn-ghost-green">
                مشاهده کاتالوگ
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-secondary/60 bg-card">
              <div className="absolute inset-3 overflow-hidden rounded-2xl border border-primary/20">
                <img
                  src="/images/migrated/4c8e23e61_generated_image.png"
                  alt="نمونه پرده لوکس در فضای داخلی"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
