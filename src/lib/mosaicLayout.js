/** کلاس‌های موزاییک فقط دسکتاپ (lg+) — موبایل دست‌نخورده */
export function mosaicItemClass(index) {
  const patterns = [
    "lg:col-span-7 lg:row-span-2",
    "lg:col-span-5 lg:row-span-1",
    "lg:col-span-5 lg:row-span-1",
    "lg:col-span-4 lg:row-span-1",
    "lg:col-span-4 lg:row-span-1",
    "lg:col-span-4 lg:row-span-1",
    "lg:col-span-6 lg:row-span-1",
    "lg:col-span-6 lg:row-span-1",
  ];
  return patterns[index % patterns.length];
}

export const mosaicGridClass =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-12 lg:auto-rows-[minmax(200px,220px)] lg:gap-4";
