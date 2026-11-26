"use client";

import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { useCurtainCategories, allCategorySelectOptions } from "@/hooks/useCurtainCategories";
import { api } from "@/api/client";

export default function AdminCategoriesPage() {
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
    { key: "name", label: "نام دسته", required: true, placeholder: "مثلاً: شید" },
    {
      key: "slug",
      label: "شناسه انگلیسی",
      required: true,
      placeholder: "shade",
    },
    {
      key: "mechanism",
      label: "دسته بندی",
      type: "select",
    },
    { key: "order", label: "ترتیب", type: "number", placeholder: "1" },
    {
      key: "in_catalog",
      label: "کاتالوگ دارد",
      type: "boolean",
      default: true,
    },
    { key: "image", label: "کاور", type: "image" },
    { key: "description", label: "توضیح کوتاه", type: "textarea" },
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
      key: "image",
      label: "کاور",
      render: (v: unknown) =>
        v ? <img src={String(v)} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "name",
      label: "نام",
      render: (v: unknown) => <span className="font-display font-bold text-foreground">{String(v)}</span>,
    },
    { key: "slug", label: "شناسه" },
    {
      key: "mechanism",
      label: "دسته بندی",
      render: (v: unknown) => {
        if (!v) return "—";
        const cat = categories.find((c) => c.slug === String(v).toLowerCase());
        return cat?.name || String(v);
      },
    },
    {
      key: "in_catalog",
      label: "کاتالوگ",
      render: (v: unknown) =>
        v === false || v === 0 || v === "false" ? (
          <span className="text-muted-foreground">خیر</span>
        ) : (
          <span className="font-bold text-primary">بله</span>
        ),
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
        mechanism: allCategorySelectOptions(categories),
        collectionIds: collectionOptions,
      }}
    />
  );
}