// پروفایل‌های نوری پارچه. target = گستره سایه‌روشن در عکس نصب واقعی.
const PROFILES = {
  cotton: { id: 0, target: 0.28, sheen: 0.06, detail: 0.38, warp: 0.15, ao: 0.48 },
  velvet: { id: 1, target: 0.42, sheen: 0.5, detail: 0.32, warp: 0.16, ao: 0.55 },
  silk:   { id: 2, target: 0.36, sheen: 0.68, detail: 0.3, warp: 0.14, ao: 0.4 },
  sheer:  { id: 3, target: 0.18, sheen: 0.12, detail: 0.2, warp: 0.08, ao: 0.25 },
};

export function materialOf(fabric, analysis) {
  if (analysis?.material && analysis.material !== "cotton") return analysis.material;
  const hay = [fabric?.fabric, fabric?.name, fabric?.texture, fabric?.material, fabric?.subcategory, fabric?.category_slug]
    .map((v) => (v || "").toLowerCase())
    .join(" ");
  if (/حریر|توری|تور |شیفون|ویل|voile|sheer|mesh|pleated-mesh/.test(hay)) return "sheer";
  if (/مخمل|velvet/.test(hay)) return "velvet";
  if (/ساتن|ابریشم|silk|satin|براق/.test(hay)) return "silk";
  return "cotton";
}

export function profileFor(fabric, info, analysis) {
  const mat = materialOf(fabric, analysis);
  const p = PROFILES[mat] || PROFILES.cotton;
  return {
    ...p,
    contrast: Math.min(1.75, Math.max(0.65, p.target / Math.max(info.logStd || 0.12, 0.05))),
  };
}
