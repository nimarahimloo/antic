/**
 * ماتریس سبک‌های نصب — هم‌تراز فرانت curtainStyleResolve.js
 */

export type CurtainStyleKey =
  | "drape"
  | "wave"
  | "panel"
  | "roman"
  | "zebra"
  | "pleated-manual"
  | "pleated-chain"
  | "pleated-sheer"
  | "shade"
  | "double"
  | "roller";

export const STYLE_META: Record<
  CurtainStyleKey,
  { label: string; mount: string; note: string }
> = {
  drape: { label: "پرده کلاسیک / چین‌دار", mount: "میله", note: "دو پنل چین‌دار" },
  wave: { label: "اورسی موجی", mount: "ریل موج", note: "موج S" },
  panel: { label: "ترک پنل", mount: "ریل سقفی", note: "پنل صاف" },
  roman: { label: "رومن", mount: "کاست", note: "چین افقی / نیمه‌بالا" },
  zebra: { label: "زبرا", mount: "کاست", note: "نوار متناوب" },
  "pleated-manual": { label: "پلیسه دستی", mount: "لنگه", note: "آکاردئون افقی" },
  "pleated-chain": { label: "پلیسه زنجیری", mount: "کاست+زنجیر", note: "تمام‌عرض" },
  "pleated-sheer": { label: "پلیسه توری", mount: "کاست", note: "شفاف" },
  shade: { label: "شید", mount: "کاست", note: "سطح صاف" },
  double: { label: "دبل شید", mount: "کاست", note: "دو لایه" },
  roller: { label: "کرکره", mount: "کاست", note: "تیغه" },
};

export function resolveStyle(model: {
  categorySlug?: string | null;
  subcategory?: string | null;
  category_slug?: string | null;
  name?: string | null;
  code?: string | null;
}): CurtainStyleKey {
  const cat = (model.categorySlug || model.category_slug || "").toLowerCase().trim();
  const sub = (model.subcategory || "").toLowerCase().trim();
  const hay = `${cat} ${sub} ${model.name || ""} ${model.code || ""}`.toLowerCase();

  if (sub === "chain" || sub === "pleated-chain" || cat === "pleated-chain") return "pleated-chain";
  if (sub === "pleated-touch" || sub === "touch") return "pleated-chain";
  if (sub === "pleated-day-night" || sub === "day-night") return "pleated-chain";
  if (cat === "pleated-mesh" || sub === "pleated-mesh" || cat === "pleated-sheer") return "pleated-sheer";
  if (cat === "pleated" || cat.startsWith("pleated-")) {
    if (/chain|زنجیر|کاست|cassette/.test(hay)) return "pleated-chain";
    if (/mesh|تور|sheer|توری/.test(hay)) return "pleated-sheer";
    return "pleated-manual";
  }

  if (/roman|رومن/.test(hay) || cat === "roman" || sub === "shade-roman") return "roman";
  if (/zebra|زبرا/.test(hay) || cat === "zebra" || cat === "zebra-printed") return "zebra";
  if (cat === "double-shade" || cat === "double" || sub === "double-shade") return "double";
  if (cat === "shade-blackout" || cat === "shade-screen" || cat === "mini-shade" || cat === "shade")
    return "shade";
  if (/roller|کرکره|blind|wooden-blind|metal-blind/.test(hay) || cat === "roller") return "roller";
  if (cat === "turk-panel" || cat === "panel" || cat === "track-panel" || /ترک.?پنل/.test(hay))
    return "panel";
  if (cat === "aurora" || cat === "wave" || /اورسی|موج/.test(hay)) return "wave";

  const map: Record<string, CurtainStyleKey> = {
    printed: "drape",
    cubism: "drape",
    sheer: "drape",
    silk: "drape",
    velvet: "drape",
    cotton: "drape",
    kitchen: "roman",
    office: "zebra",
    outdoor: "shade",
    motorized: "shade",
    accessories: "shade",
    drape: "drape",
    classic: "drape",
  };

  if (map[cat]) return map[cat];
  if ((Object.keys(STYLE_META) as string[]).includes(cat)) return cat as CurtainStyleKey;
  return "drape";
}

export function guessMaterial(model: {
  material?: string | null;
  fabric?: string | null;
  categorySlug?: string | null;
  category_slug?: string | null;
  texture?: string | null;
  name?: string | null;
  subcategory?: string | null;
}): "cotton" | "velvet" | "silk" | "sheer" {
  const hay = [
    model.material,
    model.fabric,
    model.texture,
    model.name,
    model.subcategory,
    model.categorySlug || model.category_slug,
  ]
    .map((v) => (v || "").toLowerCase())
    .join(" ");

  if (/حریر|توری|تور |شیفون|شيفون|ویل|voile|sheer|mesh|pleated-mesh|transparent/.test(hay))
    return "sheer";
  if (/مخمل|velvet|سویید|suede/.test(hay)) return "velvet";
  if (/ساتن|ابریشم|silk|satin|براق|glossy/.test(hay)) return "silk";
  return "cotton";
}

/** Flat surface styles — almost no warp / stretch on UV */
export function isFlatStyle(style?: string): boolean {
  const s = (style || "").toLowerCase();
  return (
    s === "shade" ||
    s === "double" ||
    s === "roller" ||
    s === "roman" ||
    s.includes("shade") ||
    s.includes("roller") ||
    s.includes("roman")
  );
}

/**
 * ~1 = یک تصویر پارچه عرض ناحیه سبز را می‌پوشاند (بدون تکرار ریز).
 * برای استایل‌های صاف کمی بالاتر تا طرح کش نیاید.
 */
export function styleTileFactor(style?: string) {
  if (isFlatStyle(style)) return 1.05;
  switch (style) {
    case "zebra":
      return 1.0;
    case "panel":
      return 0.98;
    case "pleated-manual":
    case "pleated-chain":
    case "pleated-sheer":
      return 1.0;
    case "wave":
      return 0.95;
    case "drape":
      return 0.9;
    default:
      return 1.0;
  }
}

/** Warp strength — near zero for flat styles to avoid geometric stretch */
export function styleWarpFactor(style?: string): number {
  if (isFlatStyle(style)) return 0.006;
  switch (style) {
    case "zebra":
      return 0.018;
    case "panel":
      return 0.012;
    case "pleated-manual":
    case "pleated-chain":
    case "pleated-sheer":
      return 0.022;
    case "wave":
      return 0.028;
    case "drape":
      return 0.032;
    default:
      return 0.025;
  }
}

export const ALL_STYLE_KEYS = Object.keys(STYLE_META) as CurtainStyleKey[];
