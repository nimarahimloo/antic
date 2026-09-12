import AdminEntityPage from "@/components/admin/AdminEntityPage";

export default function AdminProjects() {
  const fields = [
    { key: "title", label: "عنوان پروژه", required: true },
    { key: "space_type", label: "نوع فضا", required: true, placeholder: "مثلاً: پذیرایی" },
    { key: "location", label: "موقعیت", placeholder: "مثلاً: تهران" },
    { key: "date", label: "تاریخ", type: "date" },
    { key: "featured", label: "پروژه ویژه", type: "boolean", placeholder: "نمایش در پروژه‌های ویژه" },
    { key: "cover_image", label: "تصویر کاور", type: "image" },
    { key: "images", label: "گالری تصاویر", type: "list", help: "آدرس تصاویر را با کاما از هم جدا کنید" },
    { key: "products_used", label: "محصولات استفاده‌شده", type: "list", help: "با کاما از هم جدا کنید" },
    { key: "description", label: "توضیحات", type: "textarea" },
  ];

  const columns = [
    {
      key: "cover_image",
      label: "کاور",
      render: (v) =>
        v ? <img src={v} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    { key: "title", label: "عنوان", render: (v) => <span className="font-display font-bold text-foreground">{v}</span> },
    { key: "space_type", label: "نوع فضا" },
    { key: "location", label: "موقعیت" },
    {
      key: "featured",
      label: "ویژه",
      render: (v) =>
        v ? <span className="rounded-full border border-primary/50 px-2.5 py-1 font-body text-[10px] text-primary">ویژه</span> : "—",
    },
  ];

  return <AdminEntityPage title="پروژه‌ها" entity="Project" fields={fields} columns={columns} />;
}