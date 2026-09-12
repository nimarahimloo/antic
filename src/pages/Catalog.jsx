import { useSearchParams } from "react-router-dom";
import InteractiveCatalog from "@/components/sections/InteractiveCatalog";

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
            هر دسته را انتخاب کنید، زیردسته و کد محصول را تغییر دهید و پرده را روی پنجره واقعی ببینید. بافت، رنگ و جنس هر مدل واقعی نمایش داده می‌شود.
          </p>
        </div>
      </section>
      <InteractiveCatalog initialCategory={initialCategory} />
    </div>
  );
}