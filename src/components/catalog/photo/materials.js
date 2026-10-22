// پروفایل‌های نوری پارچه. `target` = گستره سایه‌روشن پارچه در عکس نصب واقعی.
// جنس ابتدا از تحلیل تصویر (analysis) و در نبود آن از تطبیق متن تشخیص داده می‌شود.
const PROFILES = {
  cotton: { id: 0, target: .26, sheen: 0, detail: .35 },
  velvet: { id: 1, target: .40, sheen: .55, detail: .25 },
  silk:   { id: 2, target: .34, sheen: .7, detail: .3 },
  sheer:  { id: 3, target: .16, sheen: .15, detail: .2 },
};

export function materialOf(fabric, analysis) {
  // اولویت با تحلیل تصویر هنگام تشخیص قطعی
  if (analysis?.material && analysis.material !== "cotton") return analysis.material;
  const hay = [fabric?.fabric, fabric?.name, fabric?.texture, fabric?.material, fabric?.subcategory, fabric?.category_slug]
    .map(v => (v || '').toLowerCase()).join(' ');
  if (/حریر|توری|تور |شیفون|شيفون|ویل|voile|sheer|mesh|pleated-mesh/.test(hay)) return 'sheer';
  if (/مخمل|velvet/.test(hay)) return 'velvet';
  if (/ساتن|ابریشم|silk|satin|براق/.test(hay)) return 'silk';
  return 'cotton';
}

export function profileFor(fabric, info, analysis) {
  const mat = materialOf(fabric, analysis);
  const p = PROFILES[mat];
  return { ...p, contrast: Math.min(1.8, Math.max(.6, p.target / Math.max(info.logStd, .05))) };
}