import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { MECHANISM_KEYS, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";

/** تنها منبع دسته‌های کاتالوگ پرده (غیر از اکسسوری فروشگاه) */
export default function AdminCategories() {
  const fields = [
    { key: "name", label: "نام دسته", required: true, placeholder: "مثلاً: زبرا" },
    {
      key: "slug",
      label: "شناسه",
      required: true,
      placeholder: "مثلاً: zebra",
      help: "کلید فیلتر کاتالوگ و قالب نصب. بعد از ذخیره، قالب chroma این دسته خودکار ساخته می‌شود.",
    },
    {
      key: "mechanism",
      label: "سبک رندر پنجره",
      type: "select",
      help: "اگر خالی باشد از روی شناسه حدس زده می‌شود. برای دسته‌های جدید تنظیم کنید.",
    },
    { key: "order", label: "ترتیب نمایش", type: "number", placeholder: "مثلاً: 1" },
    { key: "image", label: "تصویر", type: "image" },
    { key: "description", label: "توضیحات", type: "textarea" },
    {
      key: "subcategories",
      label: "زیردسته‌ها",
      type: "sublist",
      help: "با کاما جدا کنید؛ برای شناسه سفارشی از قالب «نام:شناسه» استفاده کنید",
      placeholder: "ساده:plain, طرح‌دار:patterned",
    },
  ];

  const columns = [
    {
      key: "image",
      label: "تصویر",
      render: (v) =>
        v ? <img src={v} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "name",
      label: "نام",
      render: (v) => <span className="font-display font-bold text-foreground">{v}</span>,
    },
    { key: "slug", label: "شناسه" },
    {
      key: "mechanism",
      label: "رندر",
      render: (v) => (v ? MECHANISM_LABELS[v] || v : "خودکار"),
    },
    { key: "order", label: "ترتیب" },
    {
      key: "subcategories",
      label: "زیردسته‌ها",
      render: (v) => (Array.isArray(v) ? v.length : 0),
    },
  ];

  return (
    <AdminEntityPage
      title="دسته‌بندی کاتالوگ پرده"
      entity="CurtainCategory"
      fields={fields}
      columns={columns}
      sortBy="order"
      options={{
        mechanism: MECHANISM_KEYS.map((k) => ({
          value: k,
          label: MECHANISM_LABELS[k] || k,
        })),
      }}
    />
  );
}
