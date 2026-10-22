// موتور تحلیل لوکال پارچه — رنگ غالب، جنس و مقیاس الگو را از روی عکس استخراج می‌کند.
// کاملاً در مرورگر با Canvas API اجرا می‌شود — بدون API، بدون اعتبار، برای هر تعداد مدل.

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
  silk:   { id: 2, target: 0.34, sheen: 0.7, detail: 0.3 },
  sheer:  { id: 3, target: 0.16, sheen: 0.15, detail: 0.2 },
};

/**
 * تحلیل خودکار تصویر پارچه:
 *  - رنگ غالب (hex) برای زمانی که color_code موجود نیست
 *  - جنس (sheer/silk/velvet/cotton) از روی آمار روشنایی و درخشش
 *  - مقیاس تکرار الگو از خودهمبستگی افقی
 *  - کنتراست و بافت برای تنظیم شیدر
 */
export async function analyzeFabric(url) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);

  const promise = (async () => {
    try {
      const img = await loadImage(url);
      const w = 80, h = 80;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      let rSum = 0, gSum = 0, bSum = 0, n = 0;
      const lumas = new Float32Array(w * h);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const a = data[i + 3];
        if (a < 100) { lumas[p] = -1; continue; }
        const r = data[i], g = data[i + 1], b = data[i + 2];
        rSum += r; gSum += g; bSum += b; n++;
        lumas[p] = 0.299 * r + 0.587 * g + 0.114 * b;
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

      let gradSum = 0, gradCount = 0;
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const p = y * w + x;
          if (lumas[p] < 0 || lumas[p + 1] < 0 || lumas[p + w] < 0) continue;
          gradSum += Math.abs(lumas[p] - lumas[p + 1]) + Math.abs(lumas[p] - lumas[p + w]);
          gradCount++;
        }
      }
      const roughness = gradCount ? gradSum / gradCount : 0;

      // تشخیص جنس از آمار تصویر
      let material = "cotton";
      if (avgLum > 190 && stdDev < 35 && roughness < 22) {
        material = "sheer";
      } else if (sheenRatio > 0.04 && roughness > 14) {
        material = "silk";
      } else if (stdDev < 22 && avgLum < 110) {
        material = "velvet";
      }

      const patternScale = detectPatternRepeat(lumas, w, h);
      const hex = `#${avgR.toString(16).padStart(2, "0")}${avgG.toString(16).padStart(2, "0")}${avgB.toString(16).padStart(2, "0")}`;

      return {
        material,
        profile: PROFILES[material],
        colorHex: hex,
        color: { r: avgR, g: avgG, b: avgB },
        avgLuminance: avgLum,
        contrast: stdDev,
        sheenRatio,
        roughness,
        patternScale,
      };
    } catch {
      return null;
    }
  })();

  cache.set(url, promise);
  return promise;
}

// خودهمبستگی افقی برای یافتن دورهٔ تکرار الگو
function detectPatternRepeat(lumas, w, h) {
  const maxLag = Math.min(Math.floor(w / 2), 35);
  let bestLag = 0, bestVal = 0;
  for (let lag = 5; lag < maxLag; lag++) {
    let sum = 0, count = 0;
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
    if (val > bestVal) { bestVal = val; bestLag = lag; }
  }
  return bestLag || 20;
}