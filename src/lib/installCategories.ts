/**
 * دسته‌هایی که برای «قالب نصب / نمونه اجرای واقعی» معنا دارند
 * (نه فضاهای صرفاً نمونه‌کار مثل پذیرایی / هتل).
 * و نه دسته‌هایی که تیک کاتالوگ‌شان خاموش است.
 */

const SPACE_ONLY = new Set([
  "living-room",
  "bedroom",
  "hotel",
  "villa",
  "living",
  "guest-room",
  "lobby",
  "hall",
  "terrace",
  "master",
  "kids",
  "classic",
  "modern",
  "neo-classic",
  "meeting",
  "manager",
]);

const FABRIC_HINT =
  /shade|roman|pleated|zebra|roller|silk|velvet|sheer|panel|turk|kitchen|office|cubism|printed|aurora|cotton|drape|wave|double|blind/;

interface Category {
  id?: string;
  name: string;
  slug: string;
  mechanism?: string | undefined;
  inCatalog?: boolean;
  in_catalog?: boolean;
}

function isInCatalog(cat: Category): boolean {
  const raw = cat.in_catalog ?? cat.inCatalog;
  // پیش‌فرض: در کاتالوگ هست؛ فقط اگر صریحاً false باشد حذف شود
  if (raw === false || String(raw) === "false" || String(raw) === "0") return false;
  return true;
}

export function isInstallCategory(cat: Category | null | undefined): boolean {
  if (!cat?.slug) return false;
  // بدون تیک کاتالوگ → اصلاً در صفحه قالب نصب نیاید
  if (!isInCatalog(cat)) return false;
  const slug = String(cat.slug).toLowerCase().trim();
  if (SPACE_ONLY.has(slug)) return false;
  if (cat.mechanism && String(cat.mechanism).trim()) return true;
  if (FABRIC_HINT.test(slug)) return true;
  // نام فارسی فنی
  const name = String(cat.name || "");
  if (/شید|رومن|پلیسه|زبرا|کرکره|حریر|مخمل|تور|پنل|اورسی|کوبیسم/.test(name)) return true;
  return false;
}

export function filterInstallCategories(categories: Category[] | null | undefined): Category[] {
  return (Array.isArray(categories) ? categories : []).filter(isInstallCategory);
}
