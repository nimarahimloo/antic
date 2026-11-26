"use client";

import { toast } from "sonner";

const DURATION = 4200;

export interface AdminToastOptions {
  /** نام موجودیت (مثلاً «مدل»، «دسته»، «محصول») */
  entity?: string;
  /** نام یا شناسه مورد (مثلاً کد محصول) */
  detail?: string;
  /** متن سفارشی برای جایگزینی پیام پیش‌فرض */
  customMessage?: string;
  /** مدت نمایش (میلی‌ثانیه) */
  duration?: number;
}

/**
 * پیام شناور متناسب با عملیات ادمین
 * @param action نوع عملیات: create, update, delete, error, info, warning, success
 * @param entityOrOptions نام موجودیت (string) یا شیء گزینه‌ها (AdminToastOptions)
 * @param detail نام مورد (فقط زمانی که entityOrOptions از نوع string است)
 */
export function adminToast(
  action: "create" | "update" | "delete" | "error" | "info" | "warning" | "success",
  entityOrOptions?: string | AdminToastOptions,
  detail?: string
) {
  let entity = "مورد";
  let name = "";
  let customMessage: string | undefined;
  let duration = DURATION;

  if (typeof entityOrOptions === "string") {
    entity = entityOrOptions;
    if (detail) name = ` «${detail}»`;
  } else if (entityOrOptions && typeof entityOrOptions === "object") {
    entity = entityOrOptions.entity || "مورد";
    if (entityOrOptions.detail) name = ` «${entityOrOptions.detail}»`;
    customMessage = entityOrOptions.customMessage;
    duration = entityOrOptions.duration || DURATION;
  }

  const label = entity || "مورد";

  if (action === "create") {
    toast.success(customMessage || `${label}${name} با موفقیت ثبت شد.`, { duration });
    return;
  }
  if (action === "update") {
    toast.success(customMessage || `${label}${name} با موفقیت به‌روزرسانی شد.`, { duration });
    return;
  }
  if (action === "delete") {
    toast(customMessage || `${label}${name} حذف شد.`, { duration });
    return;
  }
  if (action === "error") {
    toast.error(customMessage || "عملیات ناموفق بود.", { duration });
    return;
  }
  if (action === "warning") {
    toast.warning(customMessage || "هشدار", { duration });
    return;
  }
  if (action === "success") {
    toast.success(customMessage || "عملیات با موفقیت انجام شد.", { duration });
    return;
  }
  toast(customMessage || entity, { duration });
}

/**
 * توابع کمکی برای عملیات رایج
 */
export const adminToasts = {
  /** ثبت موفقیت‌آمیز */
  created: (entity: string, detail?: string) => adminToast("create", { entity, detail }),

  /** به‌روزرسانی موفقیت‌آمیز */
  updated: (entity: string, detail?: string) => adminToast("update", { entity, detail }),

  /** حذف موفقیت‌آمیز */
  deleted: (entity: string, detail?: string) => adminToast("delete", { entity, detail }),

  /** خطا */
  error: (message: string) => adminToast("error", { customMessage: message }),

  /** هشدار */
  warning: (message: string) => adminToast("warning", { customMessage: message }),

  /** موفقیت عمومی */
  success: (message: string) => adminToast("success", { customMessage: message }),

  /** اطلاعات */
  info: (message: string) => adminToast("info", { customMessage: message }),

  /** ذخیره تنظیمات */
  settingsSaved: (detail?: string) => adminToast("success", { entity: "تنظیمات", detail, customMessage: "تنظیمات با موفقیت ذخیره شد." }),

  /** تأیید */
  approved: (entity: string, detail?: string) => adminToast("success", { entity, detail, customMessage: `${entity || "مورد"}${detail ? ` «${detail}»` : ""} تأیید شد.` }),

  /** رد */
  rejected: (entity: string, detail?: string) => adminToast("info", { entity, detail, customMessage: `${entity || "مورد"}${detail ? ` «${detail}»` : ""} رد شد.` }),

  /** بازتولید/تولید مجدد */
  regenerated: (entity: string, detail?: string) => adminToast("success", { entity, detail, customMessage: `${entity || "مورد"}${detail ? ` «${detail}»` : ""} مجدداً تولید شد.` }),

  /** آپلود */
  uploaded: (entity: string, detail?: string) => adminToast("create", { entity, detail, customMessage: `${entity || "فایل"}${detail ? ` «${detail}»` : ""} آپلود شد.` }),

  /** کپی/تکرار */
  duplicated: (entity: string, detail?: string) => adminToast("create", { entity, detail, customMessage: `${entity || "مورد"}${detail ? ` «${detail}»` : ""} کپی شد.` }),

  /** تغییر وضعیت */
  statusChanged: (entity: string, detail?: string, status?: string) =>
    adminToast("update", { entity, detail, customMessage: `وضعیت ${entity || "مورد"}${detail ? ` «${detail}»` : ""}${status ? ` به ${status}` : ""} تغییر کرد.` }),

  // Backward compatibility - old 3-argument style
  create: (entity: string, detail?: string) => adminToast("create", { entity, detail }),
  update: (entity: string, detail?: string) => adminToast("update", { entity, detail }),
  delete: (entity: string, detail?: string) => adminToast("delete", { entity, detail }),
  errorToast: (entity: string, detail?: string) => adminToast("error", { customMessage: detail || entity }),
};