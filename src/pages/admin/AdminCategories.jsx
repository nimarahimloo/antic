import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { MECHANISM_LABELS } from "@/lib/curtainStyleResolve";
import { mechanismSelectOptions } from "@/lib/categoryTree";
import { base44 } from "@/api/base44Client";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    base44.entities.CurtainCategory.list("order", 500)
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
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
      label: "سازوکار نصب",
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
      render: (v) => <span className="font-display font-bold text-foreground">{v}</span>,
    },
    { key: "slug", label: "شناسه" },
    {
      key: "mechanism",
      label: "سازوکار",
      render: (v) => (v ? MECHANISM_LABELS[v] || v : "—"),
    },
    {
      key: "in_catalog",
      label: "کاتالوگ",
      render: (v) =>
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
        mechanism: mechanismSelectOptions(categories, MECHANISM_LABELS),
      }}
    />
  );
}
