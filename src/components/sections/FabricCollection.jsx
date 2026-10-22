import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { FABRIC_COLLECTION } from "@/lib/catalogData";

const FA_DIGITS = ["۰۱", "۰۲", "۰۳", "۰۴"];

export default function FabricCollection() {
  return (
    <section className="relative overflow-hidden bg-background py-24 lg:py-32">
      <div className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-primary/6 blur-[140px]" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-10">
        <div className="mb-14 text-center">
          <span className="eyebrow mb-4 block">پارچه‌های فاخر</span>
          <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-5xl">
            هارمونی <span className="text-gold-gradient">بافت</span> و رنگ
          </h2>
          <div className="mx-auto mt-6 h-px w-24 bg-primary/60" />
          <p className="mx-auto mt-6 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            چهار پارچهٔ فاخر ما؛ هر کدام با شخصیتی متفاوت، برای فضاهایی که می‌خواهند خاص بمانند.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {FABRIC_COLLECTION.map((fabric, i) => (
            <motion.div
              key={fabric.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                to={`/catalog?category=${fabric.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-secondary/60 bg-card transition-all duration-500 hover:border-primary"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img src={fabric.image} alt={fabric.name} className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <span className="absolute right-3 top-3 font-display text-2xl font-black text-primary/70">{FA_DIGITS[i]}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-xl font-black text-foreground lg:text-2xl">{fabric.name}</h3>
                  <div className="mt-3 h-px w-10 bg-primary" />
                  <p className="mt-3 font-body text-xs leading-6 text-muted-foreground">{fabric.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-display text-xs font-bold text-primary">
                    مشاهده کالکشن
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}