import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ALL_CATEGORIES } from "@/lib/catalogData";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import FabricSwatch from "@/components/catalog/FabricSwatch";

export default function AdminModels() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    base44.entities.CurtainCategory
      .list("order", 100)
      .then((data) => setCategories(data?.length ? data : ALL_CATEGORIES))
      .catch(() => setCategories(ALL_CATEGORIES));
  }, []);

  const fields = [
    { key: "code", label: "کد محصول", required: true, placeholder: "مثلاً ZB-01" },
    { key: "name", label: "نام مدل", required: true, placeholder: "مثلاً: زبرا کرمی" },
    { key: "category_slug", label: "دسته‌بندی", required: true, type: "select" },
    { key: "subcategory", label: "زیردسته", help: "شناسه زیردسته، مثل plain یا patterned" },
    { key: "fabric", label: "نوع پارچه", placeholder: "مثلاً: زبرا" },
    { key: "color", label: "رنگ", placeholder: "مثلاً: کرمی" },
    { key: "color_code", label: "کد رنگ", placeholder: "#C9A227" },
    { key: "material", label: "ترکیب جنس" },
    { key: "texture", label: "بافت" },
    { key: "image", label: "تصویر مدل", type: "image" },
    { key: "install_image", label: "تصویر نصب اجراشده", type: "image", help: "عکس واقعی از نصب پرده روی پنجره" },
    { key: "description", label: "توضیحات", type: "textarea" },
  ];

  const columns = [
    {
      key: "image",
      label: "نمونه پارچه",
      render: (v, r) => (
        <div className="h-12 w-16 overflow-hidden rounded-lg border border-secondary/60">
          <FabricSwatch fabric={r} />
        </div>
      ),
    },
    { key: "code", label: "کد", render: (v) => <span className="font-display font-bold text-primary">{v}</span> },
    { key: "name", label: "نام" },
    { key: "category_slug", label: "دسته" },
    {
      key: "color",
      label: "رنگ",
      render: (v, r) => (
        <span className="flex items-center gap-2">
          {r.color_code && (
            <span
              className="h-3.5 w-3.5 rounded-full border border-secondary/60"
              style={{ backgroundColor: r.color_code }}
            />
          )}
          {v || "—"}
        </span>
      ),
    },
  ];

  return (
    <AdminEntityPage
      title="مدل‌های پرده"
      entity="CurtainModel"
      fields={fields}
      columns={columns}
      options={{
        category_slug: categories.map((c) => ({ value: c.slug, label: c.name })),
      }}
    />
  );
}