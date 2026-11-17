/**
 * تحلیل سبک پارچه از روی عکس (بدون AI خارجی).
 * رنگ غالب، طرح‌دار بودن، حدس جنس و بافت را برمی‌گرداند.
 */

const COLOR_NAMES = [
  { name: "سفید", h: [0, 360], s: [0, 0.12], l: [0.85, 1] },
  { name: "کرمی", h: [25, 55], s: [0.08, 0.45], l: [0.72, 0.92] },
  { name: "بژ", h: [20, 45], s: [0.12, 0.4], l: [0.55, 0.78] },
  { name: "خاکستری", h: [0, 360], s: [0, 0.12], l: [0.35, 0.75] },
  { name: "مشکی", h: [0, 360], s: [0, 0.2], l: [0, 0.18] },
  { name: "قهوه‌ای", h: [15, 40], s: [0.2, 0.7], l: [0.15, 0.45] },
  { name: "طلایی", h: [35, 55], s: [0.35, 1], l: [0.4, 0.7] },
  { name: "زرد", h: [45, 65], s: [0.35, 1], l: [0.45, 0.75] },
  { name: "نارنجی", h: [15, 35], s: [0.4, 1], l: [0.4, 0.7] },
  { name: "قرمز", h: [350, 15], s: [0.35, 1], l: [0.25, 0.55] },
  { name: "صورتی", h: [320, 350], s: [0.2, 0.8], l: [0.55, 0.85] },
  { name: "بنفش", h: [260, 320], s: [0.2, 0.9], l: [0.25, 0.6] },
  { name: "آبی", h: [190, 250], s: [0.2, 1], l: [0.25, 0.65] },
  { name: "سبز", h: [80, 160], s: [0.2, 1], l: [0.25, 0.6] },
];

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, l };
}

function nameColor(h, s, l) {
  for (const c of COLOR_NAMES) {
    const [h0, h1] = c.h;
    const inH = h0 <= h1 ? h >= h0 && h <= h1 : h >= h0 || h <= h1;
    if (inH && s >= c.s[0] && s <= c.s[1] && l >= c.l[0] && l <= c.l[1]) return c.name;
  }
  if (s < 0.12) return l > 0.7 ? "سفید/خاکستری روشن" : l < 0.25 ? "تیره" : "خاکستری";
  if (h < 30 || h > 330) return "قرمز/صورتی";
  if (h < 70) return "گرم (زرد/نارنجی)";
  if (h < 170) return "سبز";
  if (h < 250) return "آبی";
  return "بنفش/صورتی";
}

export async function analyzeFabricImage(source) {
  let img;
  if (typeof source === "string") {
    img = await loadImage(source);
  } else if (source instanceof HTMLImageElement) {
    img = source;
  } else {
    const url = URL.createObjectURL(source);
    try {
      img = await loadImage(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  let rSum = 0, gSum = 0, bSum = 0, n = 0;
  const luminances = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 20) continue;
    rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
    luminances.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    n++;
  }
  if (!n) {
    return {
      color: "",
      color_code: "",
      texture: "ساده",
      material: "نخی",
      fabric: "",
      patterned: false,
      meanRgb: [180, 180, 180],
    };
  }

  const mr = Math.round(rSum / n);
  const mg = Math.round(gSum / n);
  const mb = Math.round(bSum / n);
  const hsl = rgbToHsl(mr, mg, mb);
  const color = nameColor(hsl.h, hsl.s, hsl.l);
  const color_code = `#${[mr, mg, mb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

  const meanL = luminances.reduce((a, v) => a + v, 0) / luminances.length;
  const variance =
    luminances.reduce((a, v) => a + (v - meanL) ** 2, 0) / luminances.length;
  const std = Math.sqrt(variance);
  const patterned = std > 28;

  let edge = 0, edgeN = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = (y * size + x) * 4;
      const l0 = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const ir = ((y * size + x + 1) * 4);
      const id = (((y + 1) * size + x) * 4);
      const lr = 0.2126 * data[ir] + 0.7152 * data[ir + 1] + 0.0722 * data[ir + 2];
      const ld = 0.2126 * data[id] + 0.7152 * data[id + 1] + 0.0722 * data[id + 2];
      edge += Math.abs(l0 - lr) + Math.abs(l0 - ld);
      edgeN++;
    }
  }
  const grain = edgeN ? edge / edgeN : 0;

  let texture = "ساده";
  if (patterned && std > 55) texture = "طرح‌دار درشت";
  else if (patterned) texture = "طرح‌دار";
  else if (grain > 18) texture = "بافت‌دار";
  else if (grain > 10) texture = "ریزبافت";

  const bright = luminances.filter((v) => v > meanL + 40).length / luminances.length;
  const dark = luminances.filter((v) => v < meanL - 35).length / luminances.length;
  let material = "نخی / کتان";
  if (!patterned && bright > 0.12 && hsl.s > 0.15) material = "ابریشم / ساتن";
  else if (dark > 0.2 && grain < 14 && hsl.l < 0.45) material = "مخمل";
  else if (hsl.l > 0.75 && hsl.s < 0.25 && std < 22) material = "تور / شِیر";
  else if (patterned) material = "پارچه طرح‌دار";

  let fabric = "";
  if (material.includes("تور")) fabric = "تور";
  else if (material.includes("مخمل")) fabric = "مخمل";
  else if (patterned) fabric = "پارچه چاپی";
  else fabric = "پارچه";

  return {
    color: patterned ? `${color} (طرح‌دار)` : color,
    color_code: patterned ? "" : color_code,
    texture,
    material,
    fabric,
    patterned,
    meanRgb: [mr, mg, mb],
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("بارگذاری تصویر برای تحلیل ناموفق بود"));
    img.src = src;
  });
}
