import AdminEntityPage from "@/components/admin/AdminEntityPage";
import { MECHANISM_KEYS, MECHANISM_LABELS } from "@/lib/curtainStyleResolve";
import { parseSubs } from "@/lib/categoryTree";

/**
 * هر ردیف = یک دسته مادر.
 * زیردسته فقط داخل همین فرم (فیلد زیردسته‌ها) تعریف می‌شود — ردیف جدا نسازید.
 */
export default function AdminCategories() {
  const fields = [
    { key: "name", label: "نام دسته مادر", required: true, placeholder: "مثلاً: شید" },
    {
      key: "slug",
      label: "شناسه انگلیسی",
      required: true,
      placeholder: "shade",
      help: "شناسه یکتا برای دسته مادر — زیردسته‌ها شناسه جدا داخل فیلد پایین دارند",
    },
    {
      key: "mechanism",
      label: "سازوکار نصب",
      type: "select",
    },
    { key: "order", label: "ترتیب", type: "number", placeholder: "1" },
    { key: "image", label: "کاور", type: "image" },
    { key: "description", label: "توضیح کوتاه", type: "textarea" },
    {
      key: "subcategories",
      label: "زیردسته‌ها (اختیاری)",
      type: "sublist",
      placeholder: "شید بلک‌اوت:shade-blackout, شید اسکرین:shade-screen",
      help: "هر زیردسته را اینجا بنویسید؛ آن‌ها را به‌عنوان دسته جدا اضافه نکنید",
    },
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
      label: "دسته مادر",
      render: (v) => <span className="font-display font-bold text-foreground">{v}</span>,
    },
    { key: "slug", label: "شناسه" },
    {
      key: "mechanism",
      label: "سازوکار",
      render: (v) => (v ? MECHANISM_LABELS[v] || v : "—"),
    },
    {
      key: "subcategories",
      label: "زیردسته",
      render: (v) => {
        const n = parseSubs(v).length;
        return n ? `${n} مورد` : "—";
      },
    },
    { key: "order", label: "ترتیب" },
  ];

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 font-body text-xs leading-6 text-foreground">
        <strong>قانون:</strong> فقط <em>دسته مادر</em> اینجا ساخته می‌شود (شید، رومن، زبرا، …).
        زیردسته‌ها داخل همان ردیف در فیلد «زیردسته‌ها» تعریف می‌شوند. اگر قبلاً زیردسته را به‌اشتباه
        به‌عنوان دسته جدا ثبت کرده‌اید، آن ردیف‌های اضافه را حذف کنید.
      </p>
      <AdminEntityPage
        title="دسته‌بندی"
        entity="CurtainCategory"
        fields={fields}
        columns={columns}
        sortBy="order"
        options={{
          mechanism: MECHANISM_KEYS.map((k) => ({
            value: k,
            label: MECHANISM_LABELS[k] || k,
          })),
        }}
      />
    </div>
  );
}
