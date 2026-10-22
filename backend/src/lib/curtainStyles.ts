/**
 * ماتریس سبک‌های نصب پرده آنتیک
 *
 * هر مدل کاتالوگ با این ابعاد توصیف می‌شود:
 *  1) mechanism / style  → قالب chroma (یک عکس سبز برای آن سازوکار)
 *  2) fabric image       → رنگ، طرح، بافت پارچه
 *  3) material profile   → رفتار نور (مخمل / ابریشم / تور / نخی)
 *  4) color / code       → متادیتای نمایشی
 *
 * تعداد خروجی‌های install_image ≈ تعداد مدل‌هایی که image دارند
 * تعداد قالب‌های لازم ≈ تعداد styleهای زیر (حدود ۱۲)، نه تعداد مدل‌ها
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
  drape: {
    label: "پرده کلاسیک / چین‌دار",
    mount: "میله با پایه و سرریل",
    note: "دو پنل، چین عمودی نرم، مناسب نشیمن و کلاسیک",
  },
  wave: {
    label: "اورسی موجی",
    mount: "میله / ریل موج",
    note: "موج S منظم‌تر از کلاسیک",
  },
  panel: {
    label: "ترک پنل",
    mount: "ریل سقفی",
    note: "پنل‌های صاف جدا از هم",
  },
  roman: {
    label: "رومن",
    mount: "داخل فریم + کاست",
    note: "چین افقی طبقه‌ای",
  },
  zebra: {
    label: "زبرا",
    mount: "داخل فریم + کاست",
    note: "نوار پارچه/تور متناوب",
  },
  "pleated-manual": {
    label: "پلیسه دستی",
    mount: "داخل فریم",
    note: "آکاردئون ریز عمودی",
  },
  "pleated-chain": {
    label: "پلیسه زنجیری",
    mount: "کاست بیرونی + زنجیر",
    note: "پلیسه با مکانیزم زنجیر",
  },
  "pleated-sheer": {
    label: "پلیسه توری",
    mount: "کاست + زنجیر",
    note: "پلیسه شفاف، عبور نور",
  },
  shade: {
    label: "شید",
    mount: "کاست بیرونی",
    note: "سطح صاف، کنترل نور",
  },
  double: {
    label: "دبل شید",
    mount: "کاست بیرونی",
    note: "دو لایه زمینه + تور",
  },
  roller: {
    label: "کرکره",
    mount: "کاست + اسلات",
    note: "تیغه‌های افقی فلزی/چوبی",
  },
};

/** category_slug (+ subcategory) → style قالب */
export function resolveStyle(model: {
  categorySlug?: string | null;
  subcategory?: string | null;
  category_slug?: string | null;
}): CurtainStyleKey {
  const cat = (model.categorySlug || model.category_slug || "").toLowerCase();
  const sub = (model.subcategory || "").toLowerCase();

  if (cat === "pleated") return sub === "chain" ? "pleated-chain" : "pleated-manual";
  if (cat === "pleated-mesh" || cat === "pleated-sheer") return "pleated-sheer";

  const map: Record<string, CurtainStyleKey> = {
    roman: "roman",
    shade: "shade",
    "double-shade": "double",
    double: "double",
    roller: "roller",
    blinds: "roller",
    zebra: "zebra",
    printed: "drape",
    aurora: "wave",
    wave: "wave",
    "turk-panel": "panel",
    panel: "panel",
    cubism: "drape",
    sheer: "drape",
    silk: "drape",
    velvet: "drape",
    cotton: "drape",
    outdoor: "shade",
    motorized: "shade",
    drape: "drape",
    classic: "drape",
    accessories: "shade",
  };

  return map[cat] || "drape";
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

export const ALL_STYLE_KEYS = Object.keys(STYLE_META) as CurtainStyleKey[];
