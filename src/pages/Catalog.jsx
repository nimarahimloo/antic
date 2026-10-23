import { useSearchParams } from "react-router-dom";
import InteractiveCatalog from "@/components/sections/InteractiveCatalog";

/**
 * کاتالوگ = فقط انتخاب مدل + نمونه نصب (هم‌تراز ادمین).
 * استودیوی آپلود پنجره موقتاً غیرفعال است.
 */
export default function Catalog() {
  const [params] = useSearchParams();
  const initialCategory = params.get("category");

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
          <span className="eyebrow mb-4 block">کاتالوگ فیزیکی</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-5xl">
            کاتالوگ <span className="text-gold-gradient">پارچه و نصب</span>
          </h1>
          <p className="mt-4 max-w-2xl font-body text-sm leading-7 text-muted-foreground">
            مدل را انتخاب کنید؛ تصویر بزرگ همان نمونه نصب تأییدشده از پنل ادمین است — پارچهٔ واقعی روی فرم
            همان دسته.
          </p>
        </div>
      </section>

      <InteractiveCatalog initialCategory={initialCategory} />
    </div>
  );
}
