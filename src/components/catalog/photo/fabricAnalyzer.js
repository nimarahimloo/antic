// موتور تحلیل لوکال پارچه — رنگ غالب، جنس، بافت و طرح را از روی عکس استخراج می‌کند.
// کاملاً در مرورگر با Canvas API — بدون API خارجی.

const cache = new Map();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const PROFILES = {
  cotton: { id: 0, target: 0.26, sheen: 0, detail: 0.35 },
  velvet: { id: 1, target: 0.4, sheen: 0.55, detail: 0.25 },
  silk: { id: 2, target: 0.34, sheen: 0.7, detail: 0.3 },
  sheer: { id: 3, target: 0.16, sheen: 0.15, detail: 0.2 },
};

const MATERIAL_FA = {
  cotton: "نخی / کتان",
  velvet: "مخمل",
  silk: "ابریشم / ساتن",
  sheer: "تور / حریر",
};

/** نام تقریبی رنگ فارسی از RGB — برای پارچه ساده؛ طرح‌دار معمولاً «چندرنگ» */
export function persianColorName(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (sat < 0.12) {
    if (lum > 0.9) return "سفید";
    if (lum > 0.75) return "شیری";
    if (lum > 0.55) return "طوسی روشن";
    if (lum > 0.35) return "طوسی";
    if (lum > 0.15) return "ذغالی";
    return "مشکی";
  }

  // hue roughly
  let h = 0;
  const d = max - min || 1;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  if (h < 20 || h >= 340) return lum > 0.55 ? "صورتی" : "قرمز";
  if (h < 45) return lum > 0.6 ? "کرم" : "نارنجی";
  if (h < 70) return lum > 0.55 ? "طلایی" : "قهوه‌ای";
  if (h < 150) return lum > 0.45 ? "زیتونی" : "سبز";
  if (h < 200) return "فیروزه‌ای";
  if (h < 260) return lum > 0.5 ? "آبی روشن" : "آبی";
  if (h < 300) return "بنفش";
  return "صورتی";
}

/**
 * تحلیل خودکار تصویر پارچه
 */
export async function analyzeFabric(url) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);

  const promise = (async () => {
    try {
      const img = await loadImage(url);
      const w = 96;
      const h = 96;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      let rSum = 0,
        gSum = 0,
        bSum = 0,
        n = 0;
      const lumas = new Float32Array(w * h);
      const hues = [];

      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const a = data[i + 3];
        if (a < 100) {
          lumas[p] = -1;
          continue;
        }
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        rSum += r;
        gSum += g;
        bSum += b;
        n++;
        lumas[p] = 0.299 * r + 0.587 * g + 0.114 * b;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min > 30) {
          let hh = 0;
          const d = max - min;
          if (max === r) hh = ((g - b) / d) % 6;
          else if (max === g) hh = (b - r) / d + 2;
          else hh = (r - g) / d + 4;
          hues.push(((hh * 60) + 360) % 360);
        }
      }
      if (n === 0) return null;

      const avgR = Math.round(rSum / n);
      const avgG = Math.round(gSum / n);
      const avgB = Math.round(bSum / n);
      let lumSum = 0;
      for (let p = 0; p < w * h; p++) if (lumas[p] >= 0) lumSum += lumas[p];
      const avgLum = lumSum / n;

      let varSum = 0;
      for (let p = 0; p < w * h; p++) {
        if (lumas[p] < 0) continue;
        varSum += (lumas[p] - avgLum) ** 2;
      }
      const stdDev = Math.sqrt(varSum / n);

      let brightCount = 0;
      for (let p = 0; p < w * h; p++) {
        if (lumas[p] < 0) continue;
        if (lumas[p] > 215) brightCount++;
      }
      const sheenRatio = brightCount / n;

      let gradSum = 0,
        gradCount = 0;
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const p = y * w + x;
          if (lumas[p] < 0 || lumas[p + 1] < 0 || lumas[p + w] < 0) continue;
          gradSum += Math.abs(lumas[p] - lumas[p + 1]) + Math.abs(lumas[p] - lumas[p + w]);
          gradCount++;
        }
      }
      const roughness = gradCount ? gradSum / gradCount : 0;

      // تنوع رنگ (چند hue) → طرح‌دار
      let hueSpread = 0;
      if (hues.length > 20) {
        const buckets = new Array(12).fill(0);
        for (const hh of hues) buckets[Math.floor(hh / 30) % 12]++;
        const active = buckets.filter((c) => c > hues.length * 0.05).length;
        hueSpread = active;
      }

      let material = "cotton";
      if (avgLum > 190 && stdDev < 35 && roughness < 22) material = "sheer";
      else if (sheenRatio > 0.04 && roughness > 14) material = "silk";
      else if (stdDev < 22 && avgLum < 110) material = "velvet";

      const patternScale = detectPatternRepeat(lumas, w, h);
      const isPatterned =
        hueSpread >= 3 || stdDev > 42 || (patternScale > 0 && patternScale < 28 && roughness > 18);

      const hex = `#${avgR.toString(16).padStart(2, "0")}${avgG.toString(16).padStart(2, "0")}${avgB.toString(16).padStart(2, "0")}`;
      const colorName = isPatterned
        ? `طرح‌دار · غالب ${persianColorName(avgR, avgG, avgB)}`
        : persianColorName(avgR, avgG, avgB);

      const texture = isPatterned
        ? roughness > 28
          ? "طرح‌دار درشت"
          : "طرح‌دار"
        : roughness > 20
          ? "بافت‌دار"
          : "صاف";

      const fabric = MATERIAL_FA[material] || "نخی";

      return {
        material,
        materialFa: MATERIAL_FA[material],
        fabric,
        texture,
        isPatterned,
        profile: PROFILES[material],
        colorHex: isPatterned ? "" : hex,
        color: colorName,
        colorRgb: { r: avgR, g: avgG, b: avgB },
        avgLuminance: avgLum,
        contrast: stdDev,
        sheenRatio,
        roughness,
        patternScale,
        hueSpread,
      };
    } catch {
      return null;
    }
  })();

  cache.set(url, promise);
  return promise;
}

function detectPatternRepeat(lumas, w, h) {
  const maxLag = Math.min(Math.floor(w / 2), 35);
  let bestLag = 0,
    bestVal = 0;
  for (let lag = 5; lag < maxLag; lag++) {
    let sum = 0,
      count = 0;
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w - lag; x += 2) {
        const a = lumas[y * w + x];
        const b = lumas[y * w + x + lag];
        if (a < 0 || b < 0) continue;
        sum += a * b;
        count++;
      }
    }
    if (count === 0) continue;
    const val = sum / count;
    if (val > bestVal) {
      bestVal = val;
      bestLag = lag;
    }
  }
  return bestLag || 20;
}
