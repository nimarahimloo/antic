/** ناوبری کامل (full page load) با URL مطلق — سازگار با App Router */
export function navigateTo(path: string) {
  if (typeof window === "undefined") return;
  window.location.assign(new URL(path, window.location.origin).toString());
}
