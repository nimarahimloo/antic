import { motion } from "framer-motion";
import WindowCurtainStudio from "@/components/studio/WindowCurtainStudio";
import SavedDesignsGallery from "@/components/studio/SavedDesignsGallery";

/**
 * ابزار اختیاری: عکس پنجرهٔ مشتری.
 * این بخش جایگزین کاتالوگ نیست و با «نمونه نصب» بالای صفحه یکی نیست.
 */
export default function StudioSection() {
  return (
    <section
      id="studio"
      className="relative overflow-hidden border-t border-secondary/40 bg-card/20 py-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <span className="eyebrow mb-3 block">ابزار اختیاری</span>
          <h2 className="font-display text-2xl font-black text-foreground lg:text-3xl">
            استودیو: پرده روی <span className="text-gold-gradient">پنجرهٔ خودتان</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            این بخش جدا از کاتالوگ بالاست. اگر می‌خواهید روی عکس واقعی پنجره منزلتان تست کنید، اینجا عکس
            آپلود کنید. برای دیدن مدل‌های کاتالوگ همان بخش بالای صفحه کافی است.
          </p>
        </motion.div>

        <WindowCurtainStudio />

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">گالری طرح‌های ذخیره‌شده</h3>
          </div>
          <SavedDesignsGallery limit={8} />
        </div>
      </div>
    </section>
  );
}
