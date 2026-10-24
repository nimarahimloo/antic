import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, ShieldCheck, BadgeCheck } from "lucide-react";
import { useCurtainCategories } from "@/hooks/useCurtainCategories";

export default function Footer() {
  const { categories } = useCurtainCategories();
  const topCats = (categories || []).slice(0, 6);

  return (
    <footer className="border-t border-secondary/60 bg-background">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3">
              <img src="/brand/mark.svg" alt="Antic Curtain" className="h-11 w-11 object-contain" width={44} height={44} />
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-bold text-foreground">پرده آنتیک</span>
                <span className="mt-1 font-body text-[10px] tracking-wider text-primary">ANTIC CURTAIN</span>
              </div>
            </div>
            <p className="mt-5 font-body text-sm leading-7 text-muted-foreground">
              خانه لوکس پرده و پارچه. از طراحی تا اجرا، هر پرده یک اثر معماری است.
            </p>
          </div>

          <div>
            <h4 className="eyebrow mb-5">دسته‌بندی‌ها</h4>
            <ul className="space-y-3 font-body text-sm text-muted-foreground">
              {topCats.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/catalog?category=${c.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              {!topCats.length && (
                <li>
                  <Link to="/catalog" className="transition-colors hover:text-primary">
                    کاتالوگ پرده
                  </Link>
                </li>
              )}
              <li>
                <Link to="/shop" className="transition-colors hover:text-primary">
                  فروشگاه
                </Link>
              </li>
              <li>
                <Link to="/projects" className="transition-colors hover:text-primary">
                  نمونه‌های اجرا شده
                </Link>
              </li>
              <li>
                <Link to="/contact" className="transition-colors hover:text-primary">
                  مشاوره و سفارش
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="eyebrow mb-5">تماس</h4>
            <ul className="space-y-3 font-body text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> ۰۲۱-۱۲۳۴۵۶۷۸
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> info@pardehantik.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> تهران، نمایشگاه دائمی پرده
              </li>
            </ul>
          </div>

          <div>
            <h4 className="eyebrow mb-5">ما را دنبال کنید</h4>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost-gold w-full justify-center"
            >
              <Instagram className="h-4 w-4" /> اینستاگرام پرده آنتیک
            </a>
          </div>
        </div>

        <div className="gold-rule my-12" />

        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#"
              className="group flex items-center gap-3 rounded-xl border border-secondary/70 bg-card/60 px-4 py-3 transition-colors hover:border-primary/60"
              aria-label="نماد اعتماد الکترونیکی اینماد"
            >
              <ShieldCheck className="h-9 w-9 text-primary" strokeWidth={1.5} />
              <div className="leading-tight">
                <p className="font-display text-sm font-black text-foreground">اینماد</p>
                <p className="font-body text-[10px] text-muted-foreground">نماد اعتماد الکترونیکی</p>
              </div>
            </a>
            <a
              href="#"
              className="group flex items-center gap-3 rounded-xl border border-secondary/70 bg-card/60 px-4 py-3 transition-colors hover:border-primary/60"
              aria-label="ساماندهی"
            >
              <BadgeCheck className="h-9 w-9 text-primary" strokeWidth={1.5} />
              <div className="leading-tight">
                <p className="font-display text-sm font-black text-foreground">ساماندهی</p>
                <p className="font-body text-[10px] text-muted-foreground">سامانه نداهندگان</p>
              </div>
            </a>
          </div>

          <div className="text-center md:text-right">
            <p className="font-body text-xs text-muted-foreground">© ۱۴۰۵ پرده آنتیک — تمامی حقوق محفوظ است.</p>
            <p className="mt-1 font-body text-xs text-primary">ANTIQUE DRAPERY</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
