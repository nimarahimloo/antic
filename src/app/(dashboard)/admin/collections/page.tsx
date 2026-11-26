"use client";

import AdminEntityPage from "@/components/admin/AdminEntityPage";

export default function AdminCollectionsPage() {
  const fields = [
    { key: "title", label: "عنوان", required: true, placeholder: "مثلاً: آشپزخانه" },
    {
      key: "slug",
      label: "شناسه انگلیسی",
      required: true,
      placeholder: "kitchen",
    },
    { key: "description", label: "توضیح کوتاه", type: "textarea" },
    { key: "coverImage", label: "تصویر کاور", type: "image" },
    { key: "order", label: "ترتیب نمایش", type: "number", placeholder: "1" },
    {
      key: "active",
      label: "فعال",
      type: "boolean",
      default: true,
      placeholder: "نمایش در صفحه اصلی",
    },
  ];

  const columns = [
    {
      key: "coverImage",
      label: "کاور",
      render: (v: unknown) =>
        v ? <img src={String(v)} alt="" className="h-10 w-10 rounded-lg object-cover" /> : "—",
    },
    {
      key: "title",
      label: "عنوان",
      render: (v: unknown) => <span className="font-display font-bold text-foreground">{String(v)}</span>,
    },
    { key: "slug", label: "شناسه" },
    {
      key: "active",
      label: "وضعیت",
      render: (v: unknown) =>
        v === false || v === 0 || v === "false" ? (
          <span className="text-muted-foreground">غیرفعال</span>
        ) : (
          <span className="font-bold text-primary">فعال</span>
        ),
    },
    { key: "order", label: "ترتیب" },
  ];

  return (
    <AdminEntityPage
      title="مجموعه‌ها"
      entity="Collection"
      fields={fields}
      columns={columns}
      sortBy="order"
    />
  );
}