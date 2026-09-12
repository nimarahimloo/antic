import { Link } from "react-router-dom";
import { ArrowLeft, Phone, Tag } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function AccessoriesPreview() {
  return (
    <section className="border-t border-secondary/40 bg-card/40 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-14 max-w-2xl">
          <span className="eyebrow mb-4 block">دسته‌بندی · اکسسوری و پرده برگی</span>
          <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
            جزئیات کامل‌کننده <span className="text-gold-gradient">لوکس</span>
          </h2>
          <p className="mt-5 font-body text-sm leading-7 text-muted-foreground">
            تنها بخش فروشگاه با قیمت مشخص — اکسسوری پرده را مستقیم سفارش دهید. برای پرده برگی و موارد سفارشی، تماس بگیرید.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* اکسسوری — با قیمت */}
          <article className="group light-leak relative overflow-hidden rounded-3xl border border-primary/30 bg-card">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src="https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/8c6626aaa_generated_5c431a17.jpg"
                alt="اکسسوری لوکس پرده شامل حلقه و نوار نگهدارنده طلایی"
                className="h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                fittingType="fill"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
              <span className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-display text-[11px] font-bold text-primary-foreground">
                <Tag className="h-3 w-3" /> دارای قیمت
              </span>
            </div>
            <div className="p-8">
              <h3 className="font-display text-2xl font-bold text-foreground">اکسوری پرده</h3>
              <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">
                حلقه، نوار نگهدارنده، فینیس و اکسسوری لوکس — قابل خرید مستقیم از فروشگاه.
              </p>
              <Link to="/shop" className="btn-gold mt-6 w-full justify-center sm:w-auto">
                مشاهده و خرید <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </article>

          {/* پرده برگی — تماس */}
          <article className="group light-leak relative overflow-hidden rounded-3xl border border-secondary/60 bg-card">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src="https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/16a76f542_generated_ec73a1e0.jpg"
                alt="پرده برگی عمودی با خطوط عمودی و نور طلایی"
                className="h-full w-full transition-transform duration-[1.2s] ease-out group-hover:scale-105"
                fittingType="fill"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
            </div>
            <div className="p-8">
              <h3 className="font-display text-2xl font-bold text-foreground">پرده برگی</h3>
              <p className="mt-3 font-body text-sm leading-7 text-muted-foreground">
                پرده عمودی با پره‌های قابل تنظیم — مناسب فضاهای بزرگ و پنجره‌های کشیده.
              </p>
              <a href="tel:02112345678" className="btn-ghost-gold mt-6 w-full justify-center sm:w-auto">
                <Phone className="h-4 w-4" /> تماس بگیرید
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}