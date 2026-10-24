/**
 * Retexture a REAL product photograph (roman, pleated, zebra, blinds…).
 * Keeps wall / frame / cassette / window / floor exactly as in the photo.
 * Only the curtain fabric region is replaced — luminance (folds) preserved.
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { applyBrandWatermark } from "./brandWatermark.js";

export type ProductRetextureInput = {
  photoPathOrUrl: string;
  fabricPathOrUrl: string;
  outDir: string;
  maxWidth?: number;
  style?: string;
};

export type ProductRetextureResult = {
  filePath: string;
  publicPath: string;
  width: number;
  height: number;
  qualityScore: number;
  coverage: number;
};

async function getSharp() {
  const mod = await import("sharp");
  return mod.default;
}

function clamp(v: number, a = 0, b = 255) {
  return v < a ? a : v > b ? b : v | 0;
}
function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function toLin(c: number) {
  return Math.pow(c / 255, 2.2);
}
function toSrgb(c: number) {
  return clamp(Math.pow(clamp01(c), 1 / 2.2) * 255);
}
function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

async function loadBuffer(src: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch image: ${src} (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (src.startsWith("/uploads/")) {
    const local = path.join(process.env.UPLOAD_DIR || "./uploads", path.basename(src));
    if (fs.existsSync(local)) return fs.readFileSync(local);
  }
  if (fs.existsSync(src)) return fs.readFileSync(src);
  const alt = path.join(process.env.UPLOAD_DIR || "./uploads", path.basename(src));
  if (fs.existsSync(alt)) return fs.readFileSync(alt);
  throw new Error(`Image not found: ${src}`);
}

function sampleFab(fd: Buffer, fw: number, fh: number, u: number, v: number): [number, number, number] {
  const x = Math.min(fw - 1.001, Math.max(0, ((u % 1) + 1) % 1) * (fw - 1));
  const y = Math.min(fh - 1.001, Math.max(0, ((v % 1) + 1) % 1) * (fh - 1));
  const x0 = x | 0;
  const y0 = y | 0;
  const x1 = Math.min(fw - 1, x0 + 1);
  const y1 = Math.min(fh - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const i00 = (y0 * fw + x0) * 4;
  const i10 = (y0 * fw + x1) * 4;
  const i01 = (y1 * fw + x0) * 4;
  const i11 = (y1 * fw + x1) * 4;
  const r =
    fd[i00] * (1 - fx) * (1 - fy) +
    fd[i10] * fx * (1 - fy) +
    fd[i01] * (1 - fx) * fy +
    fd[i11] * fx * fy;
  const g =
    fd[i00 + 1] * (1 - fx) * (1 - fy) +
    fd[i10 + 1] * fx * (1 - fy) +
    fd[i01 + 1] * (1 - fx) * fy +
    fd[i11 + 1] * fx * fy;
  const b =
    fd[i00 + 2] * (1 - fx) * (1 - fy) +
    fd[i10 + 2] * fx * (1 - fy) +
    fd[i01 + 2] * (1 - fx) * fy +
    fd[i11 + 2] * fx * fy;
  return [r, g, b];
}

function pixelLum(data: Buffer, i: number) {
  return (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
}

/** Local variance in a small window — high for fabric folds, low for flat wall */
function localVar(data: Buffer, w: number, h: number, x: number, y: number, rad = 3): number {
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const xx = Math.min(w - 1, Math.max(0, x + dx));
      const yy = Math.min(h - 1, Math.max(0, y + dy));
      const L = pixelLum(data, (yy * w + xx) * 4);
      sum += L;
      sum2 += L * L;
      n++;
    }
  }
  const mean = sum / n;
  return Math.max(0, sum2 / n - mean * mean);
}

/** Sample wall color from image corners (product shots have wall around edges) */
function sampleWallColor(data: Buffer, w: number, h: number) {
  const pts: [number, number][] = [
    [8, 8],
    [w - 9, 8],
    [8, Math.floor(h * 0.15)],
    [w - 9, Math.floor(h * 0.15)],
    [Math.floor(w * 0.1), Math.floor(h * 0.5)],
    [Math.floor(w * 0.9), Math.floor(h * 0.5)],
  ];
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (const [x, y] of pts) {
    const i = (y * w + x) * 4;
    r += data[i] / 255;
    g += data[i + 1] / 255;
    b += data[i + 2] / 255;
    n++;
  }
  return { r: r / n, g: g / n, b: b / n };
}

function colorDist(r: number, g: number, b: number, wr: number, wg: number, wb: number) {
  return Math.hypot(r - wr, g - wg, b - wb);
}

/**
 * Build fabric mask:
 * - White / near-white frames, cassettes, glass → exclude
 * - Smooth low-variance regions matching wall color → exclude
 * - Central band with texture (folds, pleats, weave) → include even if beige
 * - Bright window glass under roman → exclude
 */
function buildMask(data: Buffer, w: number, h: number): { mask: Float32Array; coverage: number; meanLum: number } {
  const wall = sampleWallColor(data, w, h);
  const mask = new Float32Array(w * h);
  const variance = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      variance[y * w + x] = localVar(data, w, h, x, y, 3);
    }
  }

  // Global variance stats for adaptive threshold
  let vSum = 0;
  for (let i = 0; i < variance.length; i++) vSum += variance[i];
  const vMean = vSum / variance.length;
  const vThresh = Math.max(0.0008, vMean * 0.55);

  let maskN = 0;
  let meanLum = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const lum = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max < 1e-3 ? 0 : (max - min) / max;
      const yNorm = y / h;
      const xNorm = x / w;
      const edgeX = Math.min(xNorm, 1 - xNorm);
      const edgeY = Math.min(yNorm, 1 - yNorm);
      const v = variance[y * w + x];

      // Hard exclude: pure white frame / glass / cassette
      if (lum > 0.88 && sat < 0.1) {
        mask[y * w + x] = 0;
        continue;
      }
      // Bright window panes (almost pure white)
      if (lum > 0.92) {
        mask[y * w + x] = 0;
        continue;
      }
      // Floor
      if (yNorm > 0.92) {
        mask[y * w + x] = 0;
        continue;
      }
      // Outer margin (logo, wall edges)
      if (edgeX < 0.06 || edgeY < 0.04) {
        mask[y * w + x] = 0;
        continue;
      }

      const distWall = colorDist(r, g, b, wall.r, wall.g, wall.b);
      const isFlatWall = distWall < 0.08 && v < vThresh * 0.7;
      if (isFlatWall) {
        mask[y * w + x] = 0;
        continue;
      }

      // Curtain body: central band, has structure OR is not pure wall
      // Roman/pleated hang in roughly x 0.15–0.85, y 0.08–0.75
      const inCurtainBand =
        xNorm > 0.12 && xNorm < 0.88 && yNorm > 0.06 && yNorm < 0.82;

      let k = 0;

      // Texture signal (folds, weave) — strongest for beige on beige
      if (v > vThresh) {
        k = clamp01((v - vThresh) / (vThresh * 3)) * 0.85;
      }

      // Color difference from wall (colored fabrics)
      if (distWall > 0.06) {
        k = Math.max(k, clamp01((distWall - 0.04) / 0.2) * 0.7);
      }

      // Saturation helps non-neutral fabrics
      if (sat > 0.08) {
        k = Math.max(k, clamp01((sat - 0.05) / 0.2) * 0.6);
      }

      // In the typical curtain rectangle, boost mid-luminance textured pixels
      if (inCurtainBand && lum > 0.18 && lum < 0.9) {
        // Prefer not-too-flat regions
        const structBoost = clamp01(v / Math.max(vThresh * 2, 1e-5));
        k = Math.max(k, 0.35 + structBoost * 0.45);
        // Even fairly flat fabric body in center band (roman face)
        if (distWall > 0.02 || v > vThresh * 0.35) {
          k = Math.max(k, 0.45);
        }
      }

      // Soft edge falloff
      k *= smoothstep(0.05, 0.12, edgeX) * smoothstep(0.03, 0.1, edgeY);

      // Suppress very bottom (sill zone) slightly
      if (yNorm > 0.78) k *= smoothstep(0.92, 0.78, yNorm);

      mask[y * w + x] = clamp01(k);

      if (k > 0.2) {
        maskN++;
        meanLum += lum;
      }
    }
  }

  // Morphological densify: fill holes inside fabric blob (simple 1-pass dilate+AND)
  const densified = new Float32Array(mask);
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = y * w + x;
      if (mask[idx] > 0.35) continue;
      let nHigh = 0;
      let sumK = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const kk = mask[(y + dy) * w + (x + dx)];
          if (kk > 0.35) {
            nHigh++;
            sumK += kk;
          }
        }
      }
      if (nHigh >= 12) {
        densified[idx] = Math.max(mask[idx], sumK / nHigh * 0.85);
      }
    }
  }

  maskN = 0;
  meanLum = 0;
  for (let i = 0; i < densified.length; i++) {
    mask[i] = densified[i];
    if (densified[i] > 0.2) {
      maskN++;
      const px = (i % w) * 4; // wrong - need actual pixel
    }
  }
  // recompute meanLum properly
  meanLum = 0;
  maskN = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] > 0.2) {
        maskN++;
        meanLum += pixelLum(data, (y * w + x) * 4);
      }
    }
  }

  const coverage = maskN / (w * h);
  meanLum = maskN ? meanLum / maskN : 0.5;
  return { mask, coverage, meanLum };
}

export async function renderFromProductPhoto(
  input: ProductRetextureInput
): Promise<ProductRetextureResult> {
  const sharp = await getSharp();
  const maxWidth = input.maxWidth || Number(process.env.RENDER_MAX_WIDTH) || 1400;

  const photoBuf = await loadBuffer(input.photoPathOrUrl);
  const meta = await sharp(photoBuf).metadata();
  let tw = meta.width || 1000;
  let th = meta.height || 1300;
  if (tw > maxWidth) {
    th = Math.round((th * maxWidth) / tw);
    tw = maxWidth;
  }

  const { data: pd, info } = await sharp(photoBuf)
    .resize(tw, th, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  const { mask, coverage, meanLum } = buildMask(pd, w, h);

  if (coverage < 0.05) {
    throw new Error(
      "در این عکس ناحیهٔ پرده به‌اندازهٔ کافی تشخیص داده نشد. عکس نصب واقعی با پرده روی پنجره آپلود کنید."
    );
  }

  let minX = w,
    maxX = 0,
    minY = h,
    maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] > 0.25) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);

  const fabricBuf = await loadBuffer(input.fabricPathOrUrl);
  const fabMeta = await sharp(fabricBuf).metadata();
  const aspect = (fabMeta.width || 1) / (fabMeta.height || 1);
  const fabW = Math.max(512, Math.min(1600, Math.round(bw * 1.2)));
  const fabH = Math.max(256, Math.min(1600, Math.round(fabW / aspect)));
  const { data: fd, info: fi } = await sharp(fabricBuf)
    .resize(fabW, fabH, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const k = mask[y * w + x];
      const pr = pd[i],
        pg = pd[i + 1],
        pb = pd[i + 2],
        pa = pd[i + 3];

      if (k < 0.12) {
        out[i] = pr;
        out[i + 1] = pg;
        out[i + 2] = pb;
        out[i + 3] = pa;
        continue;
      }

      const origLum = toLin((pr + pg + pb) / 3);
      const shade = clamp01(origLum / Math.max(meanLum, 0.05));
      const s = Math.pow(Math.max(shade, 0.05), 0.9);

      const u = (x - minX) / bw;
      const v = (y - minY) / bh;
      const [fr, fg, fb] = sampleFab(fd, fi.width, fi.height, u * 0.98, v * 0.98);

      const flr = toLin(fr),
        flg = toLin(fg),
        flb = toLin(fb);

      const cr = flr * s;
      const cg = flg * s;
      const cb = flb * s;

      const kSoft = smoothstep(0.12, 0.55, k);
      out[i] = toSrgb(toLin(pr) * (1 - kSoft) + cr * kSoft);
      out[i + 1] = toSrgb(toLin(pg) * (1 - kSoft) + cg * kSoft);
      out[i + 2] = toSrgb(toLin(pb) * (1 - kSoft) + cb * kSoft);
      out[i + 3] = pa;
    }
  }

  // Score: coverage 5–35% is typical for product shots; higher is better up to ~30%
  const coverageScore = Math.min(1, coverage / 0.18) * 5;
  const qualityScore = Math.round(Math.min(10, coverageScore + 4.5) * 10) / 10;

  const fileName = `install-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const filePath = path.join(input.outDir, fileName);
  fs.mkdirSync(input.outDir, { recursive: true });

  let pipeline = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  pipeline = await applyBrandWatermark(sharp, pipeline, w, h);
  await pipeline.jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(filePath);

  return {
    filePath,
    publicPath: `/uploads/${fileName}`,
    width: w,
    height: h,
    qualityScore,
    coverage: Math.round(coverage * 1000) / 1000,
  };
}
