import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ChevronRight, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const FALLBACK_SLIDES = [
  {
    space: "پذیرایی",
    title: "فضای پذیرایی",
    subtitle: "پرده‌های شیک برای فضای پذیرایی",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/2be489b62_generated_image.png",
  },
  {
    space: "آشپزخانه",
    title: "آشپزخانه",
    subtitle: "کنترل نور و هماهنگی با دکوراسیون آشپزخانه",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/e29f4aed1_generated_image.png",
  },
  {
    space: "اتاق خواب",
    title: "اتاق خواب",
    subtitle: "حریم خصوصی و آرامش برای اتاق خواب",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/58350d5ba_generated_image.png",
  },
  {
    space: "فضاهای ویژه",
    title: "فضاهای ویژه",
    subtitle: "راهکار اختصاصی برای فضاهای خاص",
    image: "https://media.base44.com/images/public/6a9f0b12fbe31e2b02fd6664/7480c6599_generated_image.png",
  },
];

export default function HeroSlider() {
  const { appPublicSettings } = useAuth();
  const slides = useMemo(() => {
    const raw =
      appPublicSettings?.public_settings?.hero_slides ||
      appPublicSettings?.public_settings?.heroSlides;
    if (Array.isArray(raw) && raw.length) {
      const normalized = raw
        .map((s) => ({
          space: String(s.space || s.title || ""),
          title: String(s.title || s.space || ""),
          subtitle: String(s.subtitle || ""),
          image: String(s.image || ""),
        }))
        .filter((s) => s.image);
      if (normalized.length) return normalized;
    }
    return FALLBACK_SLIDES;
  }, [appPublicSettings]);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  const paginate = useCallback(
    (dir) => {
      setDirection(dir);
      setIndex((prev) => (prev + dir + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[index] || slides[0];

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
          <img src={slide.image} alt={`پرده برای ${slide.title}`} className="h-full w-full object-cover" />
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
        <Link to="/projects" className="btn-gold">
          نمونه‌های اجرا شده
          <ArrowDown className="h-4 w-4" />
        </Link>
      </motion.div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => paginate(-1)}
            className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-secondary/60 bg-background/70 text-foreground backdrop-blur md:right-8"
            aria-label="اسلاید قبلی"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => paginate(1)}
            className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-secondary/60 bg-background/70 text-foreground backdrop-blur md:left-8"
            aria-label="اسلاید بعدی"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-8 bg-primary" : "w-2 bg-secondary"
                }`}
                aria-label={`اسلاید ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
