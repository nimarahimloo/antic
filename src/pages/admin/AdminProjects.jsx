import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { api } from "@/api/client";
import { apiErrorMessage } from "@/lib/apiError";
import { allCategorySelectOptions } from "@/lib/categoryTree";

/** نمونه‌های اجرا — گالری چندتصویری (تا ۲۰ تصویر) مثل کاور */
export default function AdminProjects() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.entities.CurtainCategory.list("order", 500)
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch((err) => {
        console.error("Failed to load categories:", apiErrorMessage(err));
        setCategories([]);
      });
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
      render: (v) =>
        v ? <img src={v} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "title",
      label: "عنوان",
      render: (v) => <span className="font-display font-bold text-foreground">{v}</span>,
    },
    {
      key: "category_slug",
      label: "دسته",
      render: (v) => {
        const cat = categories.find((c) => c.slug === v);
        return cat?.name || v || "—";
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
