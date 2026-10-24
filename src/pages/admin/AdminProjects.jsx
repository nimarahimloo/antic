import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { base44 } from "@/api/base44Client";

/** نمونه اجرا — عنوان، توضیح، کاور، گالری + دسته از جدول مادر یکسان */
export default function AdminProjects() {
  const [catOptions, setCatOptions] = useState([]);

  useEffect(() => {
    base44.entities.CurtainCategory.list("order", 200)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setCatOptions(
          list.map((c) => ({
            value: c.slug,
            label: c.name,
          }))
        );
      })
      .catch(() => setCatOptions([]));
  }, []);

  const fields = [
    { key: "title", label: "عنوان", required: true },
    { key: "description", label: "توضیحات", type: "textarea" },
    { key: "cover_image", label: "کاور", type: "image" },
    {
      key: "images",
      label: "گالری",
      type: "list",
      help: "آدرس تصاویر را با کاما جدا کنید",
    },
    {
      key: "category_slug",
      label: "دسته (همان دسته‌بندی کاتالوگ)",
      type: "select",
      help: "از جدول یکسان دسته‌ها — اگر مدل کاتالوگ نباشد همین پروژه‌ها در کاتالوگ دیده می‌شوند",
    },
    {
      key: "subcategory",
      label: "زیردسته (اختیاری)",
      placeholder: "slug زیردسته",
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
      title="نمونه‌های اجرا شده"
      entity="Project"
      fields={fields}
      columns={columns}
      options={{ category_slug: catOptions }}
    />
  );
}
