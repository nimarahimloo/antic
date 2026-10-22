import { useState } from "react";
import { Download, ArrowLeft, Phone } from "lucide-react";
import { Image } from "@/components/ui/image";

const FABRICS = [
  {
    name: "مخمل",
    en: "Velvet",
    desc: "پارچه‌ای سنگین و مخملی با درخشش عمیق — برای فضاهای رسمی و گرم.",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e47e7a9fe_generated_7545d3f6.jpg",
    alt: "بافت مخمل زغالی در نمای ماکرو",
  },
  {
    name: "تور",
    en: "Sheer",
    desc: "پارچه‌ای شفاف و سبک که نور را نرم فیلتر می‌کند — برای پذیرایی و آشپزخانه.",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/d38089208_generated_14b2bdde.jpg",
    alt: "بافت تور کتانی شفاف در نمای ماکرو",
  },
  {
    name: "حریر",
    en: "Silk",
    desc: "پارچه‌ای درخشان و لطیف با چین‌های ظریف — برای اتاق خواب و فضاهای لوکس.",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/54eb13e59_generated_65d4aa25.jpg",
    alt: "بافت حریر درخشان شامپانی در نمای ماکرو",
  },
  {
    name: "کتان",
    en: "Cotton",
    desc: "پارچه‌ای طبیعی با بافت آشکار — برای فضاهای مینیمال و روزمره.",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/b585b8cc6_generated_0defa845.jpg",
    alt: "بافت کتان طبیعی استخوانی در نمای ماکرو",
  },
];

export default function FabricLibrary() {
  const [active, setActive] = useState(0);

  return (
    <section id="fabrics" className="border-t border-secondary/40 bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow mb-4 block">دسته‌بندی · کتابخانه پارچه</span>
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground lg:text-4xl">
              حس <span className="text-gold-gradient">بافت</span> را کشف کنید
            </h2>
          </div>
          <p className="max-w-md font-body text-sm leading-7 text-muted-foreground">
            چهار خانواده پارچه — هر کدام با نمونه‌های اجرا شده و کاتالوگ دیجیتال. روی هر تیکه بروید تا باز شود.
          </p>
        </div>

        {/* تیکه‌های بازشونده */}
        <div className="hidden gap-3 md:flex md:h-[460px]">
          {FABRICS.map((f, i) => (
            <button
              key={f.name}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`group light-leak relative overflow-hidden rounded-2xl border transition-all duration-700 ease-out ${
                active === i ? "flex-[5] border-primary/50" : "flex-[1] border-secondary/60"
              }`}
            >
              <Image
                src={f.image}
                alt={f.alt}
                className="absolute inset-0 h-full w-full transition-transform duration-[1.4s] ease-out group-hover:scale-105"
                fittingType="fill"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-right">
                <span className="font-display text-[10px] tracking-[0.3em] text-primary">{f.en}</span>
                <h3 className={`font-display font-bold text-foreground transition-all duration-500 ${active === i ? "text-3xl" : "text-xl"}`}>
                  {f.name}
                </h3>
                {active === i && (
                  <div className="mt-3 animate-fade-up">
                    <p className="font-body text-sm leading-7 text-foreground/75">{f.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href="tel:02112345678" className="btn-ghost-gold text-xs">
                        <Phone className="h-3.5 w-3.5" /> نمونه‌های اجرا شده
                      </a>
                      <span className="btn-ghost-gold text-xs">
                        <Download className="h-3.5 w-3.5" /> کاتالوگ دیجیتال
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* موبایل: کارت‌های عمودی */}
        <div className="grid gap-5 md:hidden">
          {FABRICS.map((f) => (
            <article key={f.name} className="light-leak overflow-hidden rounded-2xl border border-secondary/60 bg-card">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={f.image} alt={f.alt} className="h-full w-full" fittingType="fill" />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute bottom-4 right-5">
                  <span className="font-display text-[10px] tracking-[0.3em] text-primary">{f.en}</span>
                  <h3 className="font-display text-2xl font-bold text-foreground">{f.name}</h3>
                </div>
              </div>
              <div className="p-6">
                <p className="font-body text-sm leading-7 text-muted-foreground">{f.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="tel:02112345678" className="btn-ghost-gold text-xs"><Phone className="h-3.5 w-3.5" /> نمونه‌ها</a>
                  <span className="btn-ghost-gold text-xs"><Download className="h-3.5 w-3.5" /> کاتالوگ</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-center gap-3 text-center">
          <a href="tel:02112345678" className="font-body text-sm text-muted-foreground transition-colors hover:text-primary">
            درخواست نمونه فیزیکی پارچه
          </a>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </div>
      </div>
    </section>
  );
}