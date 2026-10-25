import { useSearchParams } from "react-router-dom";
import InteractiveCatalog from "@/components/sections/InteractiveCatalog";

export default function Catalog() {
  const [params] = useSearchParams();
  const initialCategory = params.get("category");

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
          <span className="eyebrow mb-3 block">کاتالوگ پرده</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
            مدل‌ها و <span className="text-gold-gradient">نمای نصب</span>
          </h1>
          <p className="mt-3 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            دسته‌ها را مرور کنید، مدل مورد نظر را انتخاب کنید و کد، رنگ و نمای نصب را ببینید.
          </p>
        </div>
      </section>

      <InteractiveCatalog initialCategory={initialCategory} />
    </div>
  );
}
