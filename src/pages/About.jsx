import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Ruler, Scissors, ArrowLeft } from "lucide-react";

const STATS = [
  { value: "+۱۵", label: "سال تجربه" },
  { value: "+۸۰۰", label: "پروژه اجرا شده" },
  { value: "+۵۰", label: "بافت و رنگ اختصاصی" },
  { value: "۹۸٪", label: "رضایت مشتریان" },
];

const VALUES = [
  {
    icon: Award,
    title: "کیفیت بی‌تعارض",
    desc: "پارچه‌های وارداتی و دوخت استاندارد؛ کیفیت را با چشم می‌بینید و با دست لمس می‌کنید.",
  },
  {
    icon: Ruler,
    title: "طراحی اختصاصی",
    desc: "هر فضا داستان خودش را دارد؛ ما پرده را برای خانهٔ شما طراحی می‌کنیم، نه برای کاتالوگ.",
  },
  {
    icon: Scissors,
    title: "اجرای دقیق",
    desc: "از متراژ تا نصب، همه‌چیز با وسواس و در زمان‌بندی توافقی اجرا می‌شود.",
  },
];

const STEPS = [
  { num: "۰۱", title: "مشاوره و بازدید", desc: "کارشناس ما در محل شما حضور می‌یابد؛ فضا، نور و سبک زندگی‌تان را می‌شناسد." },
  { num: "۰۲", title: "انتخاب پارچه", desc: "از میان ده‌ها بافت و رنگ، پارچه‌ای را انتخاب می‌کنید که با فضای شما هم‌خوان است." },
  { num: "۰۳", title: "دوخت و ساخت", desc: "پرده با دقت میلیمتری برای ابعاد پنجرهٔ شما دوخته و آماده می‌شود." },
  { num: "۰۴", title: "نصب و تحویل", desc: "نصب تمیز و بی‌دردسر؛ فضا در نهایت ظرافت به شما تحویل داده می‌شود." },
];

export default function About() {
  return (
    <div className="bg-background">
      {/* هدر صفحه */}
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
          <span className="eyebrow mb-4 block">داستان پرده آنتیک</span>
          <h1 className="font-display text-3xl font-black leading-tight text-foreground lg:text-6xl">
            هنرِ <span className="text-gold-gradient">پرده</span>، با وسواس
          </h1>
          <p className="mt-5 max-w-2xl font-body text-sm leading-8 text-muted-foreground">
            پرده آنتیک خانهٔ لوکس پرده و پارچه است؛ جایی که هر پرده نه یک محصول، بلکه یک اثر معماری برای فضای شماست.
          </p>
        </div>
      </section>

      {/* داستان ما */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="overflow-hidden rounded-3xl border border-secondary/60">
              <img
                src="https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/dc534e002_generated_image.png"
                alt="پارچه حریر پرده آنتیک"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-8 -left-4 hidden w-44 overflow-hidden rounded-2xl border border-primary/40 lg:block lg:w-52">
              <img
                src="https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/4c8e23e61_generated_image.png"
                alt="پارچه مخمل پرده آنتیک"
                className="aspect-square w-full object-cover"
              />
            </div>
          </motion.div>

          <div>
            <span className="eyebrow mb-4 block">چهارده سال، یک وسواس</span>
            <h2 className="font-display text-2xl font-black leading-snug text-foreground lg:text-4xl">
              از یک پارچهٔ خوب، <span className="text-gold-gradient">بیش از</span> پرده می‌سازیم
            </h2>
            <div className="gold-rule my-6" />
            <p className="font-body text-sm leading-8 text-muted-foreground">
              پرده آنتیک با یک باور ساده آغاز شد: پرده، اولین چیزی است که صبح با آن روبرو می‌شوید و آخرین چیزی که شب چشم از آن می‌گیرید.
              همین جایگاه، مسئولیتی سنگین روی دوش ما می‌گذارد.
            </p>
            <p className="mt-4 font-body text-sm leading-8 text-muted-foreground">
              امروز با تیمی از طراحان، استادکاران و نصابان حرفه‌ای، از مشاورهٔ اولیه تا آخرین حلقهٔ نصب، کنار شما هستیم تا پرده‌ای
              تحویل بگیرید که دقیقاً همان است که در ذهن داشتید.
            </p>
            <Link to="/projects" className="btn-ghost-gold mt-8">
              مشاهده پروژه‌های ما <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* آمار */}
      <section className="border-y border-secondary/50 bg-card/40 py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 lg:grid-cols-4 lg:px-10">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center"
            >
              <p className="font-display text-3xl font-black text-gold-gradient lg:text-5xl">{s.value}</p>
              <p className="mt-2 font-body text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ارزش‌ها */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
        <div className="mb-12 text-center">
          <span className="eyebrow mb-4 block">چرا پرده آنتیک</span>
          <h2 className="font-display text-2xl font-black text-foreground lg:text-4xl">
            سه ستون <span className="text-gold-gradient">اعتماد</span> شما
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="light-leak rounded-3xl border border-secondary/60 bg-card p-8 transition-colors hover:border-primary/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 text-primary">
                <v.icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <h3 className="mt-5 font-display text-lg font-black text-foreground">{v.title}</h3>
              <div className="gold-rule my-4" />
              <p className="font-body text-xs leading-7 text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* فرآیند کار */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-10 lg:pb-28">
        <div className="mb-12 text-center">
          <span className="eyebrow mb-4 block">مسیر همکاری</span>
          <h2 className="font-display text-2xl font-black text-foreground lg:text-4xl">
            از ایده تا <span className="text-gold-gradient">اجرا</span>، در چهار گام
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl border border-secondary/60 bg-card p-6"
            >
              <span className="font-display text-3xl font-black text-primary/30">{s.num}</span>
              <h3 className="mt-3 font-display text-base font-black text-foreground">{s.title}</h3>
              <div className="gold-rule my-3 w-10" />
              <p className="font-body text-xs leading-6 text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* دعوت به تماس */}
      <section className="border-t border-secondary/50 bg-card/40 py-16 text-center lg:py-20">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="font-display text-2xl font-black text-foreground lg:text-3xl">
            فضای شما، <span className="text-gold-gradient">داستان</span> بعدی ماست
          </h2>
          <p className="mt-4 font-body text-sm leading-7 text-muted-foreground">
            برای مشاورهٔ اختصاصی و بازدید حضوری، با ما در تماس باشید.
          </p>
          <Link to="/contact" className="btn-gold mt-8">درخواست مشاوره</Link>
        </div>
      </section>
    </div>
  );
}