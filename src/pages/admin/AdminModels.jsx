import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import FabricSwatch from "@/components/catalog/FabricSwatch";
import { api } from "@/api/client";

function parseSubs(c) {
  let subs = c?.subcategories;
  if (typeof subs === "string") {
    try {
      subs = JSON.parse(subs);
    } catch {
      subs = [];
    }
  }
  return Array.isArray(subs) ? subs : [];
}

export default function AdminModels() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.entities.CurtainCategory.list("order", 100)
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
  }, []);

  const subOptions = categories.flatMap((c) =>
    parseSubs(c).map((s) => {
      const value = typeof s === "string" ? s : s.slug || s.id || s.name;
      const label = typeof s === "string" ? s : s.name || s.slug || value;
      return { value: String(value), label: `${c.name} → ${label}` };
    })
  );

  // فقط فیلدهای ضروری برای بارگذاری سریع
  const fields = [
    {
      key: "image",
      label: "عکس پارچه",
      type: "image",
      required: true,
    },
    {
      key: "code",
      label: "کد محصول",
      required: true,
      placeholder: "مثلاً ZB-001",
    },
    {
      key: "name",
      label: "نام (اختیاری)",
      placeholder: "خالی = همان کد محصول",
    },
    {
      key: "category_slug",
      label: "دسته",
      required: true,
      type: "select",
    },
    {
      key: "subcategory",
      label: "زیردسته (اختیاری)",
      type: subOptions.length ? "select" : "text",
    },
    {
      key: "description",
      label: "یادداشت (اختیاری)",
      type: "textarea",
    },
  ];

  const columns = [
    {
      key: "image",
      label: "نمایش",
      render: (_v, r) => (
        <div className="h-14 w-20 overflow-hidden rounded-lg border border-secondary/60">
          {r.install_image ? (
            <img src={r.install_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <FabricSwatch fabric={r} />
          )}
        </div>
      ),
    },
    {
      key: "code",
      label: "کد",
      render: (v, r) => (
        <span className="font-display font-bold text-primary">{v || r.name}</span>
      ),
    },
    { key: "category_slug", label: "دسته" },
    {
      key: "install_status",
      label: "نصب",
      render: (v, r) => {
        if (r.install_pending === "rendering")
          return <span className="text-[10px] text-primary">رندر…</span>;
        if (r.install_image)
          return (
            <span className="text-[10px] text-primary">
              آماده{r.install_score != null ? ` · ${r.install_score}` : ""}
            </span>
          );
        return <span className="text-[10px] text-muted-foreground">—</span>;
      },
    },
  ];

  return (
    <AdminEntityPage
      title="مدل‌های پرده"
      entity="CurtainModel"
      fields={fields}
      columns={columns}
      autoAnalyzeFabric
      options={{
        category_slug: categories.map((c) => ({ value: c.slug, label: c.name })),
        subcategory: subOptions,
      }}
    />
  );
}
