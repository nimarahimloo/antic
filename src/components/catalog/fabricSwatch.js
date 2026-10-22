// تولید لوکال نمونهٔ پارچه روی Canvas — رنگ، جنس و بافت از فیلدهای مدل گرفته می‌شود.
// کاملاً در مرورگر اجرا می‌شود؛ بدون API و بدون اعتبار.

function detectMaterial(fabric) {
  const hay = [fabric?.material, fabric?.fabric, fabric?.texture, fabric?.subcategory, fabric?.category_slug]
    .map(v => (v || "").toLowerCase()).join(" ");
  if (/مخمل|velvet/.test(hay)) return "velvet";
  if (/ساتن|ابریشم|silk|satin|براق/.test(hay)) return "silk";
  if (/توری|تور|شیفون|sheer|voile|mesh/.test(hay)) return "sheer";
  return "cotton";
}

function hexToRgb(hex) {
  const h = (hex || "#cfc3ad").replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function shift(c, amt) {
  return {
    r: Math.max(0, Math.min(255, c.r + amt)),
    g: Math.max(0, Math.min(255, c.g + amt)),
    b: Math.max(0, Math.min(255, c.b + amt)),
  };
}

function rgb(c, a) {
  return a < 1 ? `rgba(${c.r},${c.g},${c.b},${a})` : `rgb(${c.r},${c.g},${c.b})`;
}

// بافت شبکه‌ای (لانه زنبوری) برای پلیسه‌ها
function drawMesh(ctx, w, h, base) {
  const dark = shift(base, -28);
  ctx.strokeStyle = rgb(dark, 0.35);
  ctx.lineWidth = 0.7;
  const s = 8;
  for (let y = 0; y < h + s; y += s * 0.866) {
    const off = (Math.floor(y / (s * 0.866)) % 2) * (s / 2);
    for (let x = -s; x < w + s; x += s) {
      ctx.beginPath();
      ctx.moveTo(x + off, y);
      ctx.lineTo(x + off + s / 2, y - s * 0.433);
      ctx.lineTo(x + off + s, y);
      ctx.lineTo(x + off + s / 2, y + s * 0.433);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

// بافت پارچه‌بافی (تار و پود)
function drawWeave(ctx, w, h, base) {
  const light = shift(base, 22);
  const dark = shift(base, -22);
  ctx.globalAlpha = 0.2;
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = rgb(light);
    ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = rgb(dark);
    ctx.fillRect(0, y + 1.5, w, 1);
  }
  for (let x = 0; x < w; x += 3) {
    ctx.fillStyle = rgb(dark);
    ctx.fillRect(x, 0, 1, h);
    ctx.fillStyle = rgb(light);
    ctx.fillRect(x + 1.5, 0, 1, h);
  }
  ctx.globalAlpha = 1;
}

// پرز نرم مخمل — تغییر نور عمودی
function drawVelvetNap(ctx, w, h) {
  for (let x = 0; x < w; x += 2) {
    const v = Math.sin(x * 0.05) * 0.06;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    ctx.fillRect(x, 0, 2, h);
  }
}

// درخشش حریر — خطوط نور مورب
function drawSilkSheen(ctx, w, h) {
  for (let i = 0; i < 5; i++) {
    const y = (i / 5) * h + 20;
    const grad = ctx.createLinearGradient(0, y, w, y + 80);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.22)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, w, 45);
  }
}

// شفافیت تور — پس‌زمینه روشن از پشت
function drawSheerVeil(ctx, w, h) {
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(0, 0, w, h);
}

export function renderFabricCanvas(canvas, fabric) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const base = hexToRgb(fabric?.color_code);
  const mat = detectMaterial(fabric);
  const tex = (fabric?.texture || "").toLowerCase();
  const cat = fabric?.category_slug;

  ctx.fillStyle = rgb(base);
  ctx.fillRect(0, 0, w, h);

  if (mat === "velvet") drawVelvetNap(ctx, w, h);
  else if (mat === "silk") drawSilkSheen(ctx, w, h);
  else if (mat === "sheer") drawSheerVeil(ctx, w, h);

  if (/شبکه|mesh|هزاروی/.test(tex) || cat === "pleated" || cat === "pleated-mesh") {
    drawMesh(ctx, w, h, base);
  } else {
    drawWeave(ctx, w, h, base);
  }

  // نور و سایه برای عمق
  const grad = ctx.createLinearGradient(0, 0, w * 0.8, h * 0.8);
  grad.addColorStop(0, "rgba(255,255,255,0.12)");
  grad.addColorStop(0.6, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ساخت Canvas نمونه برای استفاده در شیدر WebGL
export function makeSwatchCanvas(fabric, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  renderFabricCanvas(c, fabric);
  return c;
}