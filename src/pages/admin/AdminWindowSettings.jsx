import RenderTemplatesAdmin from "@/components/admin/RenderTemplatesAdmin";
import InstallReviewAdmin from "@/components/admin/InstallReviewAdmin";

/**
 * صفحه ادمین: فقط قالب سبز (آپلود) و بازبینی رندر.
 * حالت تعاملی WebGL و تنظیم رنگ صحنه حذف شد.
 */
export default function AdminWindowSettings() {
  return (
    <div>
      <h1 className="font-display text-xl font-black text-foreground">قالب نصب</h1>
      <p className="mt-1 font-body text-xs leading-6 text-muted-foreground">
        برای هر دسته فنی یک <strong>عکس سبز chroma</strong> آپلود کنید. رندر مدل‌ها فقط از همین
        قالب‌ها ساخته می‌شود — پیش‌نمایش کارتونی WebGL حذف شده است.
      </p>

      <RenderTemplatesAdmin />
      <InstallReviewAdmin />
    </div>
  );
}
