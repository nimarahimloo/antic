import { toast } from "@/components/ui/use-toast";

const DURATION = 4200;

/**
 * پیام شناور متناسب با عملیات ادمین
 * @param {"create"|"update"|"delete"|"error"|"info"} action
 * @param {string} [entityLabel] مثلاً «مدل»، «دسته»
 * @param {string} [detail] نام مورد
 */
export function adminToast(action, entityLabel = "مورد", detail = "") {
  const name = detail ? ` «${detail}»` : "";
  const label = entityLabel || "مورد";

  if (action === "create") {
    toast({
      title: "افزوده شد",
      description: `${label}${name} با موفقیت ثبت شد.`,
      duration: DURATION,
      className: "border-emerald-500/40 bg-card text-foreground",
    });
    return;
  }
  if (action === "update") {
    toast({
      title: "ویرایش شد",
      description: `${label}${name} با موفقیت به‌روزرسانی شد.`,
      duration: DURATION,
      className: "border-primary/40 bg-card text-foreground",
    });
    return;
  }
  if (action === "delete") {
    toast({
      title: "حذف شد",
      description: `${label}${name} حذف شد.`,
      duration: DURATION,
      className: "border-destructive/40 bg-card text-foreground",
    });
    return;
  }
  if (action === "error") {
    toast({
      variant: "destructive",
      title: "خطا",
      description: detail || "عملیات ناموفق بود.",
      duration: DURATION,
    });
    return;
  }
  toast({
    title: "انجام شد",
    description: detail || entityLabel,
    duration: DURATION,
  });
}
