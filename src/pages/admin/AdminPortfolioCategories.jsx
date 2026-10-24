import AdminEntityPage from "@/components/admin/AdminEntityPage";

/** دسته‌بندی نمونه‌های اجرا — جدا از کاتالوگ پرده */
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
    <AdminEntityPage
      title="دسته‌بندی نمونه‌های اجرا"
      entity="PortfolioCategory"
      fields={fields}
      columns={columns}
      sortBy="order"
    />
  );
}
