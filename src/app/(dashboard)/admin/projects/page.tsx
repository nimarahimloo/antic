"use client";

import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { useCurtainCategories, allCategorySelectOptions } from "@/hooks/useCurtainCategories";
import { api } from "@/api";

/** نمونه‌های اجرا — گالری چندتصویری (تا ۲۰ تصویر) مثل کاور */
export default function AdminProjectsPage() {
  const { categories } = useCurtainCategories();
  const [collectionOptions, setCollectionOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    api.entities.Collection.list("order", 500)
      .then((data) => setCollectionOptions(
        (data as Array<{ id: string; title: string }> || []).map((c) => ({ value: c.id, label: c.title }))
      ))
      .catch(console.error);
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
    {
      key: "collectionIds",
      label: "مجموعه‌ها",
      type: "multiselect",
      placeholder: "مجموعه‌ها را انتخاب کنید",
      options: collectionOptions,
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
      options={{ 
        category_slug: allCategorySelectOptions(categories),
        collectionIds: collectionOptions,
      }}
    />
  );
}