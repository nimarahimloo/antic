/**
 * Shared catalog style resolution — one source for site + admin.
 *
 * styleFabricScale = سهم عرض پنجره که یک تصویر پارچه می‌پوشاند.
 * نزدیک ۱ = تقریباً یک‌بار پهن می‌شود (بدون تکرار کارتونی).
 */

export const MECHANISM_KEYS = [
  "drape",
  "wave",
  "panel",
  "roman",
  "zebra",
  "pleated-manual",
  "pleated-chain",
  "pleated-sheer",
  "shade",
  "double",
  "roller",
];

export const MECHANISM_LABELS = {
  drape: "پرده کلاسیک / چین‌دار",
  wave: "اورسی موجی",
  panel: "ترک پنل",
  roman: "رومن",
  zebra: "زبرا",
  "pleated-manual": "پلیسه دستی",
  "pleated-chain": "پلیسه زنجیری / کاست",
  "pleated-sheer": "پلیسه توری",
  shade: "شید",
  double: "دبل شید",
  roller: "کرکره",
};

/**
 * یک واحد ≈ عرض کامل ناحیه پارچه. مقادیر نزدیک ۱ = تکرار کم و طبیعی.
 */
export function styleFabricScale(style) {
  switch (style) {
    case "zebra":
      return 1.05;
    case "roman":
      return 1.1;
    case "shade":
    case "double":
      return 1.12;
    case "roller":
      return 1.08;
    case "panel":
      return 0.95;
    case "pleated-manual":
    case "pleated-chain":
    case "pleated-sheer":
      return 1.0;
    case "wave":
      return 0.9;
    case "drape":
      return 0.85;
    default:
      return 1.05;
  }
}

export function resolveStyle(fabric) {
  if (!fabric) return "drape";
  const cat = String(fabric.category_slug || fabric.categorySlug || "")
    .toLowerCase()
    .trim();
  const sub = String(fabric.subcategory || "")
    .toLowerCase()
    .trim();
  const name = String(fabric.name || "").toLowerCase();
  const code = String(fabric.code || "").toLowerCase();
  const hay = `${cat} ${sub} ${name} ${code}`;

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

  const map = {
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
  if (MECHANISM_KEYS.includes(cat)) return cat;
  return "drape";
}

export function pickTemplateUrl(fabric, templatesByKey) {
  if (!templatesByKey || typeof templatesByKey !== "object") return null;
  const style = resolveStyle(fabric);
  const cat = String(fabric?.category_slug || fabric?.categorySlug || "")
    .toLowerCase()
    .trim();
  const sub = String(fabric?.subcategory || "")
    .toLowerCase()
    .trim();
  const keys = [cat, sub, style].filter(Boolean);
  for (const k of keys) {
    const url = templatesByKey[k] || templatesByKey[k.toLowerCase()];
    if (url) return { url, key: k, style };
  }
  return { url: null, key: style, style };
}
