import { useSearchParams } from "react-router-dom";
import InteractiveCatalog from "@/components/sections/InteractiveCatalog";
import StudioSection from "@/components/sections/StudioSection";

export default function Catalog() {
  const [params] = useSearchParams();
  const initialCategory = params.get("category");

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
          <span className="eyebrow mb-4 block">کاتالوگ تعاملی پرده</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-5xl">
            کاتالوگ <span className="text-gold-gradient">تعاملی</span> پرده آنتیک
          </h1>
          <p className="mt-5 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            مدل و نمونهٔ پارچه را انتخاب کنید و رندر سه‌بعدی نصب آن را ببینید. نمایش فرم، نور و بافت در مرورگر انجام می‌شود؛ تصویر ذخیره‌شده فقط مرجع مقایسه است.
          </p>
        </div>
      </section>
      <InteractiveCatalog initialCategory={initialCategory} />
      <StudioSection />
    </div>
  );
}