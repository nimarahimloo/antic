import { motion } from "framer-motion";
import WindowCurtainStudio from "@/components/studio/WindowCurtainStudio";
import SavedDesignsGallery from "@/components/studio/SavedDesignsGallery";

export default function StudioSection() {
  return (
    <section id="studio" className="relative overflow-hidden bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <span className="eyebrow mb-3 block">استودیوی مجازی</span>
          <h2 className="font-display text-2xl font-black text-foreground lg:text-4xl">
            پرده را روی <span className="text-gold-gradient">پنجره خودتان</span> ببینید
          </h2>
          <p className="mx-auto mt-3 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            عکس پنجره‌تان را آپلود کنید، مدل پرده را انتخاب کنید و نتیجه را ذخیره یا در شبکه‌های اجتماعی به اشتراک بگذارید.
          </p>
        </motion.div>

        <WindowCurtainStudio />

        {/* گالری طرح‌های ذخیره‌شده */}
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