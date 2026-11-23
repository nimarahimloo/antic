"use client";

import { toast } from "sonner";

const DURATION = 4200;

/**
 * پیام شناور متناسب با عملیات ادمین
 * @param {"create"|"update"|"delete"|"error"|"info"} action
 * @param {string} [entityLabel] مثلاً «مدل»، «دسته»
 * @param {string} [detail] نام مورد
 */
export function adminToast(action: "create" | "update" | "delete" | "error" | "info", entityLabel = "مورد", detail = "") {
  const name = detail ? ` «${detail}»` : "";
  const label = entityLabel || "مورد";

  if (action === "create") {
    toast.success(`${label}${name} با موفقیت ثبت شد.`, {
      duration: DURATION,
    });
    return;
  }
  if (action === "update") {
    toast.success(`${label}${name} با موفقیت به‌روزرسانی شد.`, {
      duration: DURATION,
    });
    return;
  }
  if (action === "delete") {
    toast(`${label}${name} حذف شد.`, {
      duration: DURATION,
    });
    return;
  }
  if (action === "error") {
    toast.error(detail || "عملیات ناموفق بود.", {
      duration: DURATION,
    });
    return;
  }
  toast(detail || entityLabel, {
    duration: DURATION,
  });
}