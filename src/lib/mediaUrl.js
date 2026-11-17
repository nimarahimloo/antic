/**
 * نرمال‌سازی URL رسانه برای سایت و ادمین.
 * مسیرهای نسبی /uploads/... روی همان origin سرو می‌شوند (پراکسی Vite / nginx).
 */
export function mediaUrl(src) {
  if (!src || typeof src !== "string") return "";
  const s = src.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;
  if (s.startsWith("/")) return s;
  return `/uploads/${s.replace(/^\.?\/?uploads\//, "")}`;
}
