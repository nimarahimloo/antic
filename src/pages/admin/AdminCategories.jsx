import AdminEntityPage from "@/components/admin/AdminEntityPage";

export default function AdminCategories() {
  const fields = [
    { key: "name", label: "نام دسته", required: true, placeholder: "مثلاً: زبرا" },
    { key: "slug", label: "شناسه", required: true, placeholder: "مثلاً: zebra" },
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
    { key: "name", label: "نام", render: (v) => <span className="font-display font-bold text-foreground">{v}</span> },
    { key: "slug", label: "شناسه" },
    { key: "order", label: "ترتیب" },
    {
      key: "subcategories",
      label: "زیردسته‌ها",
      render: (v) => (Array.isArray(v) ? v.length : 0),
    },
  ];

  return (
    <AdminEntityPage
      title="دسته‌بندی‌ها"
      entity="CurtainCategory"
      fields={fields}
      columns={columns}
      sortBy="order"
    />
  );
}