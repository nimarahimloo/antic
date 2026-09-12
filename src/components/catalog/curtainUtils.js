/**
 * curtainUtils — توابع مشترک موتور رندر پرده.
 * تصویر پارچۀ بارگذاری‌شده از پنل ادمین به‌عنوان «پوسته» روی فرم پرده اعمال می‌شود.
 */

/** تیره/روشن کردن رنگ hex */
export function shade(hex, amt) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return "#3b352c";
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const nums = h.match(/../g).map((x) => parseInt(x, 16));
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return "#" + nums.map((v) => Math.round((t - v) * p + v).toString(16).padStart(2, "0")).join("");
}

/** hex به rgba با شفافیت */
export function hexToRgba(hex, a) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return `rgba(201,162,39,${a})`;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = h.match(/../g).map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${a})`;
}

/** ساخت پوستۀ پارچه — تصویر دقیق (کشش کامل روی پرده) یا رنگ */
export function makeSkin(fabric, back) {
  const color = fabric?.color_code || "#C9A227";
  if (fabric?.image) {
    return {
      backgroundImage: `url("${fabric.image}")`,
      backgroundSize: "100% 100%",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return { backgroundColor: back ? shade(color, 0.45) : color };
}