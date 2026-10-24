import { Link } from "react-router-dom";
import AdminEntityPage from "@/components/admin/AdminEntityPage";

/**
 * دسته‌بندی یکسان با کاتالوگ (CurtainCategory).
 * این صفحه همان جدول را ویرایش می‌کند تا پروژه‌ها و کاتالوگ همگام بمانند.
 */
export default function AdminPortfolioCategories() {
  const fields = [
    { key: "name", label: "نام دسته", required: true, placeholder: "مثلاً: پذیرایی" },
    {
      key: "slug",
      label: "شناسه",
      required: true,
      placeholder: "مثلاً: living-room",
    },
    { key: "order", label: "ترتیب", type: "number" },
    { key: "image", label: "کاور دسته", type: "image" },
    { key: "description", label: "توضیحات", type: "textarea" },
    {
      key: "mechanism",
      label: "مکانیزم نصب (اختیاری)",
      placeholder: "shade / roman / zebra … — برای دسته‌های فنی کاتالوگ",
    },
    {
      key: "subcategories",
      label: "زیردسته‌ها",
      type: "sublist",
      help: "با کاما؛ قالب «نام:شناسه»",
      placeholder: "کلاسیک:classic, مدرن:modern",
    },
  ];

  const columns = [
    {
      key: "image",
      label: "کاور",
      render: (v) =>
        v ? <img src={v} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "name",
      label: "نام",
      render: (v) => <span className="font-display font-bold">{v}</span>,
    },
    { key: "slug", label: "شناسه" },
    { key: "order", label: "ترتیب" },
    {
      key: "subcategories",
      label: "زیردسته",
      render: (v) => (Array.isArray(v) ? v.length : 0),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 font-body text-xs leading-6 text-foreground">
        دسته‌بندی <strong>کاتالوگ</strong> و <strong>نمونه‌های اجرا</strong> یک جدول مشترک است
        (CurtainCategory). تغییرات اینجا در هر دو بخش سایت دیده می‌شود. مدیریت کامل‌تر:{" "}
        <Link to="/admin/categories" className="font-bold text-primary underline">
          دسته‌بندی کاتالوگ
        </Link>
        .
      </div>
      <AdminEntityPage
        title="دسته‌بندی (مشترک کاتالوگ و نمونه‌ها)"
        entity="CurtainCategory"
        fields={fields}
        columns={columns}
        sortBy="order"
      />
    </div>
  );
}
