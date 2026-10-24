import { useSearchParams } from "react-router-dom";
import InteractiveCatalog from "@/components/sections/InteractiveCatalog";

/**
 * صفحه کاتالوگ:
 * - قاب پنجره بالا (InteractiveCatalog) همیشه سر جایش
 * - استودیوی آپلود پنجره مشتری موقتاً غیرفعال
 */
export default function Catalog() {
  const [params] = useSearchParams();
  const initialCategory = params.get("category");

  return (
    <div className="bg-background">
      <section className="border-b border-secondary/50 bg-card/40">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
          <span className="eyebrow mb-3 block">کاتالوگ</span>
          <h1 className="font-display text-3xl font-bold text-foreground lg:text-4xl">
            مدل‌ها و <span className="text-gold-gradient">نمونه نصب</span>
          </h1>
          <p className="mt-3 max-w-xl font-body text-sm leading-7 text-muted-foreground">
            هر مدل همان تصویری را نشان می‌دهد که در پنل ادمین برایش ساخته شده است.
          </p>
        </div>
      </section>

      <InteractiveCatalog initialCategory={initialCategory} />
    </div>
  );
}
