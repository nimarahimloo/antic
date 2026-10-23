import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import FabricSwatch from "@/components/catalog/FabricSwatch";
import { api } from "@/api/client";

/**
 * کاتالوگ فیزیکی: هر ورق = یک مدل.
 * هویت مدل = تصویر تکهٔ پارچه (طرح، رنگ، بافت واقعی).
 * فیلدهای متنی اختیاری‌اند؛ مشتری پارچه را می‌بیند نه نام رنگ.
 */
export default function AdminModels() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.entities.CurtainCategory.list("-order", 100)
      .then((rows) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]));
  }, []);

  const subOptions = categories.flatMap((c) => {
    let subs = [];
    try {
      subs = c.subcategories ? JSON.parse(c.subcategories) : [];
    } catch {
      subs = [];
    }
    if (!Array.isArray(subs)) return [];
    return subs.map((s) => {
      const value = typeof s === "string" ? s : s.slug || s.id || s.name;
      const label = typeof s === "string" ? s : s.name || s.slug || value;
      return { value: String(value), label: `${c.name} → ${label}` };
    });
  });

  const fields = [
    {
      key: "image",
      label: "تکه پارچه (ورق کاتالوگ)",
      type: "image",
      required: true,
      help: "فقط یک تکه واضح از همان ورق پارچه. همین تصویر با تمام طرح و جزئیات روی پنجره رندر می‌شود — نیازی به پر کردن رنگ نیست.",
    },
    {
      key: "code",
      label: "کد محصول",
      required: true,
      placeholder: "کد روی ورق کاتالوگ",
      help: "همان کدی که روی کاتالوگ فیزیکی نوشته شده؛ نام مدل هم می‌شود.",
    },
    {
      key: "name",
      label: "نام (اختیاری)",
      placeholder: "خالی = همان کد",
      help: "اگر خالی باشد همان کد ذخیره می‌شود.",
    },
    { key: "category_slug", label: "دسته (سبک نصب)", required: true, type: "select" },
    {
      key: "subcategory",
      label: "زیردسته",
      type: subOptions.length ? "select" : "text",
      help: "از لیست دسته انتخاب کنید.",
    },
    {
      key: "fabric",
      label: "نوع پارچه (اختیاری)",
      placeholder: "زبرا، مخمل، تور…",
    },
    {
      key: "material",
      label: "جنس (اختیاری — فقط برای نور رندر)",
      placeholder: "نخی، مخمل، ابریشم، تور",
      help: "فقط رفتار نور را عوض می‌کند؛ رنگ و طرح از خود عکس می‌آید.",
    },
    {
      key: "description",
      label: "یادداشت داخلی (اختیاری)",
      type: "textarea",
    },
  ];

  const columns = [
    {
      key: "image",
      label: "پارچه",
      render: (_v, r) => (
        <div className="h-14 w-20 overflow-hidden rounded-lg border border-secondary/60">
          <FabricSwatch fabric={r} />
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
    { key: "subcategory", label: "زیردسته" },
  ];

  return (
    <AdminEntityPage
      title="مدل‌های پرده"
      entity="CurtainModel"
      fields={fields}
      columns={columns}
      options={{
        category_slug: categories.map((c) => ({ value: c.slug, label: c.name })),
        subcategory: subOptions,
      }}
      normalizeBeforeSave={(form) => {
        const code = String(form.code || "").trim();
        const name = String(form.name || "").trim() || code;
        return { ...form, code, name };
      }}
    />
  );
}
