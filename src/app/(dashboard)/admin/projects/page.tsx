"use client";

import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { useCurtainCategories, allCategorySelectOptions } from "@/hooks/useCurtainCategories";

/** نمونه‌های اجرا — گالری چندتصویری (تا ۲۰ تصویر) مثل کاور */
export default function AdminProjectsPage() {
  const { categories } = useCurtainCategories();

  const fields = [
    { key: "title", label: "عنوان", required: true },
    { key: "cover_image", label: "کاور", type: "image", required: true },
    {
      key: "category_slug",
      label: "دسته",
      type: "select",
      required: true,
    },
    { key: "description", label: "توضیح", type: "textarea" },
    {
      key: "images",
      label: "گالری (اختیاری)",
      type: "gallery",
      help: "مانند کاور — تا ۲۰ تصویر، انتخاب چندتایی از دستگاه",
    },
  ];

  const columns = [
    {
      key: "cover_image",
      label: "کاور",
      render: (v: unknown) =>
        v ? <img src={String(v)} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "title",
      label: "عنوان",
      render: (v: unknown) => <span className="font-display font-bold text-foreground">{String(v)}</span>,
    },
    {
      key: "category_slug",
      label: "دسته",
      render: (v: unknown) => {
        const cat = categories.find((c) => c.slug === String(v));
        return cat?.name || String(v || "—");
      },
    },
  ];

  return (
    <AdminEntityPage
      title="نمونه‌های اجرا"
      entity="Project"
      fields={fields}
      columns={columns}
      options={{ category_slug: allCategorySelectOptions(categories) }}
    />
  );
}