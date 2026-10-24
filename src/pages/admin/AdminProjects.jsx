import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { base44 } from "@/api/base44Client";

export default function AdminProjects() {
  const [catOptions, setCatOptions] = useState([]);

  useEffect(() => {
    base44.entities.CurtainCategory.list("order", 200)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setCatOptions(list.map((c) => ({ value: c.slug, label: c.name })));
      })
      .catch(() => setCatOptions([]));
  }, []);

  const fields = [
    { key: "title", label: "عنوان", required: true },
    { key: "cover_image", label: "کاور", type: "image", required: true },
    {
      key: "category_slug",
      label: "دسته",
      type: "select",
      required: true,
    },
    {
      key: "subcategory",
      label: "زیردسته (اختیاری)",
      placeholder: "مثلاً classic",
    },
    { key: "description", label: "توضیح", type: "textarea" },
    {
      key: "images",
      label: "گالری (اختیاری)",
      type: "list",
      help: "لینک تصاویر با کاما",
    },
  ];

  const columns = [
    {
      key: "cover_image",
      label: "کاور",
      render: (v) =>
        v ? <img src={v} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "title",
      label: "عنوان",
      render: (v) => <span className="font-display font-bold text-foreground">{v}</span>,
    },
    { key: "category_slug", label: "دسته" },
  ];

  return (
    <AdminEntityPage
      title="نمونه‌های اجرا"
      entity="Project"
      fields={fields}
      columns={columns}
      options={{ category_slug: catOptions }}
    />
  );
}
