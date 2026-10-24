import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { MECHANISM_KEYS, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";

/** یک فرم دسته برای کاتالوگ و نمونه‌های اجرا */
export default function AdminCategories() {
  const fields = [
    { key: "name", label: "نام", required: true, placeholder: "مثلاً: زبرا" },
    {
      key: "slug",
      label: "شناسه انگلیسی",
      required: true,
      placeholder: "zebra",
    },
    {
      key: "mechanism",
      label: "سازوکار نصب",
      type: "select",
    },
    { key: "order", label: "ترتیب", type: "number", placeholder: "1" },
    { key: "image", label: "کاور", type: "image" },
    { key: "description", label: "توضیح کوتاه", type: "textarea" },
    {
      key: "subcategories",
      label: "زیردسته‌ها",
      type: "sublist",
      placeholder: "ساده:plain, طرح‌دار:patterned",
      help: "اختیاری — با کاما؛ قالب نام:شناسه",
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
      render: (v) => <span className="font-display font-bold text-foreground">{v}</span>,
    },
    { key: "slug", label: "شناسه" },
    {
      key: "mechanism",
      label: "سازوکار",
      render: (v) => (v ? MECHANISM_LABELS[v] || v : "—"),
    },
    { key: "order", label: "ترتیب" },
  ];

  return (
    <AdminEntityPage
      title="دسته‌بندی"
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
