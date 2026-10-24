/**
 * دسته‌هایی که برای «قالب نصب / نمونه اجرای واقعی» معنا دارند
 * (نه فضاهای صرفاً نمونه‌کار مثل پذیرایی / هتل).
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

/**
 * @param {{ slug?: string, mechanism?: string|null, name?: string }} cat
 */
export function isInstallCategory(cat) {
  if (!cat?.slug) return false;
  const slug = String(cat.slug).toLowerCase().trim();
  if (SPACE_ONLY.has(slug)) return false;
  if (cat.mechanism && String(cat.mechanism).trim()) return true;
  if (FABRIC_HINT.test(slug)) return true;
  // نام فارسی فنی
  const name = String(cat.name || "");
  if (/شید|رومن|پلیسه|زبرا|کرکره|حریر|مخمل|تور|پنل|اورسی|کوبیسم/.test(name)) return true;
  return false;
}

export function filterInstallCategories(categories) {
  return (Array.isArray(categories) ? categories : []).filter(isInstallCategory);
}
