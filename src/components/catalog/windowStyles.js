/**
 * windowStyles — سبک‌های اجرای «واقعی» هر مدل پرده (مسیر تعاملی WebGL)
 *
 * تشخیص سازوکار از @/lib/curtainStyleResolve — یک منبع با کاتالوگ عکس‌محور و بک‌اند.
 */

export { resolveStyle } from "@/lib/curtainStyleResolve";

export function shade(hex, amt) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return "#3b352c";
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const nums = h.match(/../g).map((x) => parseInt(x, 16));
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return (
    "#" +
    nums.map((v) => Math.round((t - v) * p + v).toString(16).padStart(2, "0")).join("")
  );
}

/** پارچهٔ تور/شفاف؟ — روی شفافیت و نحوهٔ عبور نور اثر دارد */
export function isSheer(fabric) {
  const hay = [fabric?.fabric, fabric?.name, fabric?.texture, fabric?.subcategory]
    .map((v) => (v || "").toLowerCase())
    .join(" ");
  return (
    /توری|تور |شيفون|شيون|voile|sheer|ژزوین/.test(hay) ||
    fabric?.category_slug === "pleated-mesh"
  );
}

const fold = (background, blend = "multiply", opacity = 1) => ({ background, blend, opacity });

const PLEAT_FOLDS = [
  fold(
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.26) 0px, rgba(255,255,255,0.07) 5px, rgba(0,0,0,0.26) 10px, rgba(0,0,0,0.5) 13px, rgba(0,0,0,0.26) 16px, rgba(255,255,255,0.05) 21px, rgba(255,255,255,0.26) 24px)",
    "overlay"
  ),
  fold(
    "repeating-linear-gradient(90deg, transparent 0px, rgba(0,0,0,0.14) 12px, transparent 24px)",
    "multiply"
  ),
];

const DRAPE_FOLDS = [
  fold(
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.17) 0px, rgba(255,255,255,0.05) 40px, transparent 78px, rgba(0,0,0,0.05) 105px, rgba(0,0,0,0.36) 132px, rgba(0,0,0,0.05) 158px, transparent 184px)",
    "overlay"
  ),
  fold(
    "repeating-linear-gradient(90deg, transparent 0 62px, rgba(0,0,0,0.30) 128px, transparent 190px)",
    "multiply"
  ),
];

const WAVE_FOLDS = [
  fold(
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.06) 26px, transparent 50px, rgba(0,0,0,0.04) 62px, rgba(0,0,0,0.34) 82px, rgba(0,0,0,0.04) 100px, transparent 114px)",
    "overlay"
  ),
  fold(
    "repeating-linear-gradient(90deg, transparent 0 44px, rgba(0,0,0,0.3) 76px, transparent 110px)",
    "multiply"
  ),
];

export const STYLE_CFG = {
  drape: {
    mount: "rod",
    tile: "38% auto",
    folds: DRAPE_FOLDS,
    panelGap: true,
    heading: true,
    sheerAlpha: 0.84,
  },
  wave: {
    mount: "rod",
    tile: "36% auto",
    folds: WAVE_FOLDS,
    heading: true,
    hem: true,
    sheerAlpha: 0.86,
  },
  panel: {
    mount: "track",
    tile: "34% auto",
    panelCount: 3,
    panelEdge: true,
  },
  roman: {
    mount: "inside",
    cassette: true,
    tile: "34% auto",
    stack: true,
    pockets: true,
    bodyBottom: "14%",
  },
  zebra: {
    mount: "inside",
    cassette: true,
    tile: "120px 120px",
    bands: { period: 120, fabricBand: 60 },
    bar: true,
  },
  "pleated-manual": {
    mount: "inside",
    cassette: true,
    tile: "30% auto",
    folds: PLEAT_FOLDS,
    bar: true,
    sheerAlpha: 0.9,
  },
  "pleated-chain": {
    mount: "box",
    cassette: true,
    tile: "30% auto",
    folds: PLEAT_FOLDS,
    bar: true,
    chain: true,
    sheerAlpha: 0.9,
  },
  "pleated-sheer": {
    mount: "box",
    cassette: true,
    tile: "30% auto",
    folds: PLEAT_FOLDS,
    bar: true,
    chain: true,
    sheerAlpha: 0.62,
  },
  shade: {
    mount: "box",
    cassette: true,
    tile: "32% auto",
    smooth: true,
    bar: true,
    chain: true,
  },
  double: {
    mount: "box",
    cassette: true,
    tile: "32% auto",
    double: true,
    bar: true,
    chain: true,
  },
  roller: {
    mount: "box",
    cassette: true,
    tile: "32% auto",
    slats: true,
    ladder: true,
    pullCord: true,
  },
};

export const DEFAULT_SETTINGS = {
  wall_color: "#75634f",
  frame_color: "#3b352c",
  rail_color: "#C9A227",
  view_image: "",
};
