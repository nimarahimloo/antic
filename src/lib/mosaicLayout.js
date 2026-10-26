/**
 * موزاییک فقط دسکتاپ (lg+) — موبایل یک‌ستونه / دوستونه ساده می‌ماند.
 * الگوی نامنظم هنری برای نمونه‌های اجرا.
 */
export function mosaicItemClass(index) {
  const patterns = [
    "lg:col-span-7 lg:row-span-2",
    "lg:col-span-5 lg:row-span-1",
    "lg:col-span-5 lg:row-span-1",
    "lg:col-span-4 lg:row-span-2",
    "lg:col-span-4 lg:row-span-1",
    "lg:col-span-4 lg:row-span-1",
    "lg:col-span-6 lg:row-span-1",
    "lg:col-span-3 lg:row-span-1",
    "lg:col-span-3 lg:row-span-1",
    "lg:col-span-8 lg:row-span-1",
    "lg:col-span-4 lg:row-span-1",
    "lg:col-span-5 lg:row-span-2",
    "lg:col-span-7 lg:row-span-1",
  ];
  return patterns[index % patterns.length];
}

export const mosaicGridClass =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-12 lg:auto-rows-[minmax(180px,240px)] lg:gap-3";
