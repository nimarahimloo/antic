/**
 * ماتریس سبک‌های نصب پرده آنتیک
 *
 * هر مدل کاتالوگ با این ابعاد توصیف می‌شود:
 *  1) mechanism / style  → قالب chroma یا نمونه نصب واقعی (یک عکس برای آن سازوکار)
 *  2) fabric image       → رنگ، طرح، بافت پارچه از ورق کاتالوگ
 *  3) material profile   → رفتار نور (مخمل / ابریشم / تور / نخی)
 *
 * کیفیت هدف: عکس محصول مثل رومن نیمه‌بالا، پلیسه روی دو لنگه، پلیسه کاست‌دار.
 * هر سازوکار فرم نصب جدا دارد — قالب سبز باید همان هندسه را داشته باشد.
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
    mount: "کاست + چین افقی",
    note: "چین افقی طبقه‌ای — مثل نمونه Roman80 نیمه‌بالا",
  },
  zebra: {
    label: "زبرا",
    mount: "داخل فریم + کاست",
    note: "نوار پارچه/تور متناوب",
  },
  "pleated-manual": {
    label: "پلیسه دستی",
    mount: "داخل فریم / لنگه پنجره",
    note: "آکاردئون افقی ریز — مثل نصب روی دو لنگه (PX2607)",
  },
  "pleated-chain": {
    label: "پلیسه زنجیری / کاست",
    mount: "کاست بیرونی + زنجیر",
    note: "پلیسه تمام‌عرض با کاست و زنجیر — مثل PNF1210",
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
  if (cat === "turk-panel" || cat === "panel" || /ترک.?پنل/.test(hay)) return "panel";
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

/** Fabric tile factor — keep in sync with frontend styleFabricScale */
export function styleTileFactor(style?: string) {
  switch (style) {
    case "zebra":
      return 0.72;
    case "roman":
      return 0.78;
    case "shade":
    case "double":
      return 0.74;
    case "roller":
      return 0.7;
    case "panel":
      return 0.8;
    case "pleated-manual":
    case "pleated-chain":
    case "pleated-sheer":
      return 0.68;
    case "wave":
      return 0.85;
    default:
      return 0.82;
  }
}

export const ALL_STYLE_KEYS = Object.keys(STYLE_META) as CurtainStyleKey[];
