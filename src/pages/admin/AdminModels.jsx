import { useEffect, useState } from "react";
import AdminEntityPage from "@/components/admin/AdminEntityPage";
import FabricSwatch from "@/components/catalog/FabricSwatch";
import { api } from "@/api/client";

export default function AdminModels() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.entities
      .CurtainCategory
      .list("-order", 100)
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
      return {
        value: String(value),
        label: `${c.name} → ${label}`,
      };
    });
  });

  const fields = [
    {
      key: "code",
      label: "کد محصول / نام مدل",
      required: true,
      placeholder: "مثلاً VL-001",
      help: "نام مدل همان کد محصول است و به‌صورت خودکار در فیلد نام هم نوشته می‌شود.",
    },
    {
      key: "name",
      label: "نام نمایشی",
      required: true,
      placeholder: "معمولاً همان کد",
      help: "اگر خالی بماند، همان کد محصول ذخیره می‌شود.",
    },
    { key: "category_slug", label: "دسته‌بندی", required: true, type: "select" },
    {
      key: "subcategory",
      label: "زیردسته",
      type: subOptions.length ? "select" : "text",
      help: "از زیردسته‌های همان دسته انتخاب کنید (نه مقدار آزاد بی‌ربط).",
    },
    {
      key: "image",
      label: "تصویر پارچه / مدل",
      type: "image",
      required: true,
      help: "با آپلود، رنگ، بافت، جنس و نوع پارچه پیشنهاد می‌شود. پارچه طرح‌دار نیازی به کد رنگ ندارد.",
    },
    {
      key: "fabric",
      label: "نوع پارچه",
      placeholder: "مثلاً زبرا، مخمل، تور",
      help: "پس از آپلود عکس قابل تکمیل خودکار است.",
    },
    {
      key: "color",
      label: "رنگ / ظاهر",
      placeholder: "مثلاً کرمی طرح‌دار",
      help: "برای پارچه طرح‌دار همان توصیف ظاهر کافی است.",
    },
    {
      key: "color_code",
      label: "رنگ غالب (اختیاری)",
      placeholder: "#C9A227",
      help: "فقط برای پارچه ساده — برای طرح‌دار خالی بگذارید. کد رنگ اجباری نیست.",
    },
    {
      key: "material",
      label: "ترکیب جنس",
      placeholder: "مثلاً نخی / مخمل / ابریشم",
    },
    {
      key: "texture",
      label: "بافت",
      placeholder: "ساده، طرح‌دار، ریزبافت…",
    },
    {
      key: "install_image",
      label: "تصویر نصب اجراشده",
      type: "image",
      help: "عکس واقعی نصب روی پنجره (اختیاری؛ موتور رندر هم می‌تواند بسازد).",
    },
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
    {
      key: "code",
      label: "کد / نام",
      render: (v, r) => (
        <span className="font-display font-bold text-primary">{v || r.name}</span>
      ),
    },
    { key: "category_slug", label: "دسته" },
    { key: "subcategory", label: "زیردسته" },
    {
      key: "color",
      label: "رنگ / ظاهر",
      render: (v, r) => (
        <span className="flex items-center gap-2">
          {r.color_code ? (
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-secondary/60"
              style={{ backgroundColor: r.color_code }}
              title="رنگ غالب (اختیاری)"
            />
          ) : null}
          {v || "—"}
        </span>
      ),
    },
    { key: "texture", label: "بافت" },
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
      analyzeImageField="image"
    />
  );
}
