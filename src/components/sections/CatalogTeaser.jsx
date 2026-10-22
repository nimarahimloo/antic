import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function CatalogTeaser() {
  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-28">
      <div className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-royal-green/8 blur-[100px]" />
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="eyebrow mb-4 block">کاتالوگ تعاملی</span>
            <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-5xl">
              پرده را روی <span className="text-gold-gradient">پنجره</span> ببینید
            </h2>
            <p className="mt-5 font-body text-sm leading-8 text-muted-foreground">
              هر دسته را انتخاب کنید، زیردسته و کد محصول را تغییر دهید و پرده را روی پنجره واقعی ببینید. بافت، رنگ و جنس هر مدل واقعی نمایش داده می‌شود.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/catalog" className="btn-ghost-green">
                ورود به کاتالوگ
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-secondary/60 bg-card">
              <div className="absolute inset-3 overflow-hidden rounded-2xl border border-primary/20">
                <img
                  src="https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/4c8e23e61_generated_image.png"
                  alt="پرده مخمل"
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/10" />
                <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-primary/10" />
              </div>
              <div className="absolute bottom-4 right-4 z-10 rounded-full bg-background/80 px-4 py-2 backdrop-blur-md">
                <span className="font-display text-xs font-bold text-royal-green">VL-001</span>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 flex h-16 w-16 items-center justify-center rounded-full bg-royal-green/10">
              <Sparkles className="h-7 w-7 text-royal-green" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}