import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ChevronRight, ChevronLeft } from "lucide-react";

const SLIDES = [
  {
    space: "پذیرایی",
    title: "فضای پذیرایی",
    subtitle: "پرده‌های لوکس برای لحظات خاصِ زندگی",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/2be489b62_generated_image.png",
  },
  {
    space: "آشپزخانه",
    title: "آشپزخانه",
    subtitle: "نور و زیبایی در قلب خانه",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e29f4aed1_generated_image.png",
  },
  {
    space: "اتاق خواب",
    title: "اتاق خواب",
    subtitle: "آرامش و شکوه در هر صبح",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/58350d5ba_generated_image.png",
  },
  {
    space: "فضاهای ویژه",
    title: "فضاهای ویژه",
    subtitle: "طراحی منحصر به فرد برای فضاهای خاص",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/7480c6599_generated_image.png",
  },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const paginate = useCallback((dir) => {
    setDirection(dir);
    setIndex((prev) => (prev + dir + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <section className="relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-background">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <img src={slide.image} alt={`پرده لوکس برای ${slide.title}`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <motion.div
          key={`text-${index}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <h1 className="font-display text-5xl font-black leading-[1.05] text-foreground lg:text-7xl">
            {slide.title}
          </h1>
          <p className="mx-auto mt-6 max-w-md font-body text-sm leading-8 text-muted-foreground lg:text-lg">
            {slide.subtitle}
          </p>
        </motion.div>
      </div>

      <motion.div
        key={`cta-${index}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 lg:bottom-28"
      >
        <Link to={`/projects?space=${encodeURIComponent(slide.space)}`} className="btn-gold">
          مشاهده پروژه‌ها
          <ArrowDown className="h-4 w-4" />
        </Link>
      </motion.div>

      <button
        onClick={() => paginate(-1)}
        className="absolute right-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-background/30 text-primary backdrop-blur-md transition-all hover:bg-primary hover:text-primary-foreground"
        aria-label="اسلاید قبلی"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <button
        onClick={() => paginate(1)}
        className="absolute left-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-background/30 text-primary backdrop-blur-md transition-all hover:bg-primary hover:text-primary-foreground"
        aria-label="اسلاید بعدی"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === index ? "w-10 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
            }`}
            aria-label={`اسلاید ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}