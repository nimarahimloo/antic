/**
 * Hybrid install pipeline (3 parts):
 *  1) InstallReference  = real product photo (Roman80, PNF1210, …) → scene + folds
 *  2) Optional green RenderTemplate = shape prior when available
 *  3) Fabric from CurtainModel
 *
 * Flow: detect curtain on reference → paint chroma (green×luminance) →
 * same fabric engine as installEngine → photoreal output.
 * No per-model manual work; one reference photo per category is enough.
 *
 * Flat styles (shade / roman / roller / double) use near-zero warp so
 * geometric patterns stay undistorted.
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { applyBrandWatermark } from "./brandWatermark.js";
import { styleTileFactor, styleWarpFactor, isFlatStyle } from "../lib/curtainStyles.js";

export type ProductRetextureInput = {
  photoPathOrUrl: string;
  fabricPathOrUrl: string;
  outDir: string;
  maxWidth?: number;
  style?: string;
  /** optional green template path — used as shape prior when layouts are similar */
  chromaPathOrUrl?: string | null;
  material?: string;
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

function pixelLum(data: Buffer, i: number) {
  return (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
}

function localVar(data: Buffer, w: number, h: number, x: number, y: number, rad = 2): number {
  let sum = 0,
    sum2 = 0,
    n = 0;
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

function sampleWall(data: Buffer, w: number, h: number) {
  const pts: [number, number][] = [
    [6, 6],
    [w - 7, 6],
    [6, Math.floor(h * 0.12)],
    [w - 7, Math.floor(h * 0.12)],
    [Math.floor(w * 0.07), Math.floor(h * 0.4)],
    [Math.floor(w * 0.93), Math.floor(h * 0.4)],
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

function dist3(r: number, g: number, b: number, wr: number, wg: number, wb: number) {
  return Math.hypot(r - wr, g - wg, b - wb);
}

/** Style-aware vertical band where curtain fabric lives on product shots */
function styleBand(style?: string): { y0: number; y1: number; x0: number; x1: number } {
  const s = (style || "").toLowerCase();
  if (s.includes("roman")) return { y0: 0.06, y1: 0.62, x0: 0.16, x1: 0.84 };
  if (s.includes("zebra") || s.includes("day")) return { y0: 0.08, y1: 0.78, x0: 0.12, x1: 0.88 };
  if (s.includes("panel") || s.includes("track") || s.includes("turk"))
    return { y0: 0.08, y1: 0.88, x0: 0.1, x1: 0.9 };
  if (s.includes("pleat") || s.includes("honey") || s.includes("cellular"))
    return { y0: 0.08, y1: 0.82, x0: 0.12, x1: 0.88 };
  if (s.includes("roller") || s.includes("shade") || s.includes("blind"))
    return { y0: 0.08, y1: 0.7, x0: 0.14, x1: 0.86 };
  if (s.includes("double")) return { y0: 0.08, y1: 0.72, x0: 0.14, x1: 0.86 };
  return { y0: 0.07, y1: 0.72, x0: 0.14, x1: 0.86 };
}

/**
 * Build soft fabric mask on a real product photo.
 * Strictly excludes white glass/frame and flat wall.
 */
function buildMask(
  data: Buffer,
  w: number,
  h: number,
  style?: string
): { mask: Float32Array; coverage: number; meanLum: number } {
  const wall = sampleWall(data, w, h);
  const band = styleBand(style);
  const mask = new Float32Array(w * h);
  const variance = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      variance[y * w + x] = localVar(data, w, h, x, y, 2);
    }
  }

  let vSum = 0;
  for (let i = 0; i < variance.length; i++) vSum += variance[i];
  const vMean = vSum / variance.length;
  const vThresh = Math.max(0.00055, vMean * 0.45);

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
      const dWall = dist3(r, g, b, wall.r, wall.g, wall.b);

      // Hard exclude glass / frame / cassette / pure white
      if (lum > 0.84 && sat < 0.11) {
        mask[y * w + x] = 0;
        continue;
      }
      if (lum > 0.91) {
        mask[y * w + x] = 0;
        continue;
      }
      if (yNorm > 0.9 || edgeX < 0.07 || edgeY < 0.04) {
        mask[y * w + x] = 0;
        continue;
      }
      // Flat wall
      if (dWall < 0.065 && v < vThresh * 0.9 && sat < 0.14) {
        mask[y * w + x] = 0;
        continue;
      }

      const inBand =
        xNorm >= band.x0 && xNorm <= band.x1 && yNorm >= band.y0 && yNorm <= band.y1;

      let k = 0;

      if (v > vThresh) k = Math.max(k, clamp01((v - vThresh) / (vThresh * 2.2)) * 0.9);
      if (dWall > 0.07) k = Math.max(k, clamp01((dWall - 0.04) / 0.16) * 0.75);
      if (sat > 0.09) k = Math.max(k, clamp01((sat - 0.05) / 0.2) * 0.65);

      if (inBand && lum > 0.18 && lum < 0.82) {
        if (v > vThresh * 0.35 || dWall > 0.025) k = Math.max(k, 0.52);
        // Uniform fabric face (roman body)
        if (lum < 0.78 && dWall > 0.012 && v > vThresh * 0.2) k = Math.max(k, 0.58);
      } else if (!inBand) {
        // Outside band: only strong signals
        if (k < 0.55) k = 0;
      }

      if (lum > 0.8 && sat < 0.1) k *= 0.12;
      k *= smoothstep(0.06, 0.13, edgeX) * smoothstep(0.03, 0.09, edgeY);
      if (yNorm > band.y1 - 0.04) k *= smoothstep(band.y1 + 0.02, band.y1 - 0.04, yNorm);

      mask[y * w + x] = clamp01(k);
    }
  }

  // Light pinhole fill inside fabric only
  const dens = new Float32Array(mask);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (mask[idx] >= 0.4) continue;
      let nH = 0,
        sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const kk = mask[(y + dy) * w + (x + dx)];
          if (kk > 0.45) {
            nH++;
            sum += kk;
          }
        }
      }
      if (nH >= 5 && pixelLum(data, (y * w + x) * 4) < 0.82) {
        dens[idx] = Math.max(mask[idx], (sum / nH) * 0.72);
      }
    }
  }

  let maskN = 0,
    meanLum = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = dens[y * w + x];
      mask[y * w + x] = k;
      if (k > 0.28) {
        maskN++;
        meanLum += pixelLum(data, (y * w + x) * 4);
      }
    }
  }
  return {
    mask,
    coverage: maskN / (w * h),
    meanLum: maskN ? meanLum / maskN : 0.5,
  };
}

/** Paint fabric region as green chroma while keeping scene elsewhere */
function paintChroma(
  data: Buffer,
  w: number,
  h: number,
  mask: Float32Array,
  meanLum: number
): Buffer {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const k = mask[y * w + x];
      const pr = data[i],
        pg = data[i + 1],
        pb = data[i + 2],
        pa = data[i + 3];

      if (k < 0.22) {
        out[i] = pr;
        out[i + 1] = pg;
        out[i + 2] = pb;
        out[i + 3] = pa;
        continue;
      }

      // Green keyed by original luminance (folds become shading on green)
      const lum = pixelLum(data, i);
      const shade = clamp01(lum / Math.max(meanLum, 0.05));
      // Mid-green range that installEngine keys well (g-dominant)
      const gVal = clamp(40 + shade * 180);
      const rVal = clamp(8 + shade * 25);
      const bVal = clamp(8 + shade * 25);
      const kSoft = smoothstep(0.22, 0.55, k);
      out[i] = clamp(pr * (1 - kSoft) + rVal * kSoft);
      out[i + 1] = clamp(pg * (1 - kSoft) + gVal * kSoft);
      out[i + 2] = clamp(pb * (1 - kSoft) + bVal * kSoft);
      out[i + 3] = pa;
    }
  }
  return out;
}

function sampleFab(fd: Buffer, fw: number, fh: number, u: number, v: number): [number, number, number] {
  const x = Math.min(fw - 1.001, Math.max(0, u));
  const y = Math.min(fh - 1.001, Math.max(0, v));
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

/** Map fabric onto in-memory chroma buffer (same algorithm as installEngine) */
async function mapFabricOntoChroma(
  chroma: Buffer,
  w: number,
  h: number,
  fabricPath: string,
  style?: string,
  material?: string
): Promise<{ out: Buffer; coverage: number; meanLin: number; logStd: number }> {
  const sharp = await getSharp();
  const flat = isFlatStyle(style);

  // Analyze green key + find green bbox for proper UV
  let sumLin = 0,
    nKey = 0,
    top = h;
  let minX = w,
    maxX = 0,
    minY = h,
    maxY = 0;
  const logs: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = chroma[i] / 255,
        g = chroma[i + 1] / 255,
        b = chroma[i + 2] / 255;
      if (g - Math.max(r, b) > 0.12) {
        const linG = Math.pow(g, 2.2);
        sumLin += linG;
        nKey++;
        logs.push(Math.log(linG + 1e-3));
        if (y < top) top = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const meanLin = nKey ? sumLin / nKey : 1;
  const coverage = nKey / (w * h);
  const avgLog = logs.length ? logs.reduce((a, v) => a + v, 0) / logs.length : 0;
  const logStd = logs.length
    ? Math.sqrt(logs.reduce((a, v) => a + (v - avgLog) ** 2, 0) / logs.length)
    : 0.12;

  if (coverage < 0.03) {
    throw new Error("chroma ساخته‌شده از عکس مرجع پوشش سبز کافی ندارد");
  }

  if (maxX <= minX) {
    minX = 0;
    maxX = w - 1;
  }
  if (maxY <= minY) {
    minY = 0;
    maxY = h - 1;
  }

  const target =
    material === "velvet"
      ? 0.4
      : material === "silk"
        ? 0.34
        : material === "sheer"
          ? 0.16
          : 0.26;
  const contrast = Math.min(1.8, Math.max(0.6, target / Math.max(logStd, 0.05)));
  const warp = styleWarpFactor(style);
  const mat = {
    contrast,
    detail: material === "sheer" ? 0.12 : flat ? 0.16 : 0.26,
    tile: 1.0 * styleTileFactor(style),
    warp,
    ao: material === "sheer" ? 0.16 : flat ? 0.24 : 0.38,
  };
  const fabricScale = Math.min(1.18, Math.max(0.88, mat.tile));

  const fabricBuf = await loadBuffer(fabricPath);
  const fabMeta = await sharp(fabricBuf).metadata();
  const aspect = (fabMeta.width || 1) / (fabMeta.height || 1);
  const fabW = Math.max(512, Math.min(1600, Math.round(w * 1.1)));
  const fabH = Math.max(256, Math.min(1600, Math.round(fabW / aspect)));
  const { data: fd, info: fi } = await sharp(fabricBuf)
    .resize(fabW, fabH, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let meanR = 0,
    meanG = 0,
    meanB = 0,
    nF = 0;
  for (let i = 0; i < fd.length; i += 4) {
    if (fd[i + 3] < 16) continue;
    meanR += toLin(fd[i]);
    meanG += toLin(fd[i + 1]);
    meanB += toLin(fd[i + 2]);
    nF++;
  }
  meanR = nF ? meanR / nF : 0.4;
  meanG = nF ? meanG / nF : 0.4;
  meanB = nF ? meanB / nF : 0.4;

  // UV relative to green bbox (same as installEngine)
  const gW = Math.max(1, maxX - minX);
  const gH = Math.max(1, maxY - minY);
  const tileX = gW * fabricScale;
  // Flat styles: keep vertical scale proportional → no stretch on geometric patterns
  const tileY = flat ? tileX / aspect : (tileX / aspect) * 0.92;
  const out = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const pr = chroma[i],
        pg = chroma[i + 1],
        pb = chroma[i + 2],
        pa = chroma[i + 3];
      const rn = pr / 255,
        gn = pg / 255,
        bn = pb / 255;
      const gdom = gn - Math.max(rn, bn);
      const sat = gn / Math.max(rn + gn + bn, 1e-3);
      const key = smoothstep(0.035, 0.14, gdom) * smoothstep(0.26, 0.4, sat);

      if (key < 0.008) {
        out[i] = pr;
        out[i + 1] = pg;
        out[i + 2] = pb;
        out[i + 3] = pa;
        continue;
      }

      let s = toLin(pg) / meanLin;
      const iL = (y * w + Math.max(0, x - 1)) * 4;
      const iR = (y * w + Math.min(w - 1, x + 1)) * 4;
      const iU = (Math.max(0, y - 1) * w + x) * 4;
      const iD = (Math.min(h - 1, y + 1) * w + x) * 4;
      const sh = (idx: number) => toLin(chroma[idx + 1]) / meanLin;
      const gx = sh(iR) - sh(iL);
      const gy = sh(iD) - sh(iU);
      const blurS = (sh(iL) + sh(iR) + sh(iU) + sh(iD) + s) / 5;
      const micro = clamp01(s / Math.max(blurS, 0.02));
      s *= Math.pow(Math.min(2, Math.max(0.5, micro)), mat.detail);
      s = Math.pow(Math.max(s, 0), Math.min(mat.contrast, 1.05));

      // Position inside green bbox → fabric UV
      const localX = x - minX;
      const localY = y - minY;

      // Flat styles: pure planar mapping, almost zero gradient warp
      const u =
        (localX / tileX) * fi.width +
        (flat ? 0 : gx * mat.warp * fi.width * 0.12);
      const v =
        (localY / Math.max(tileY, 1)) * fi.height +
        (flat ? 0 : gy * mat.warp * fi.height * 0.07);

      const [fr, fg, fb] = sampleFab(fd, fi.width, fi.height, u, v);

      const flr = toLin(fr),
        flg = toLin(fg),
        flb = toLin(fb);
      const flatR = flr * 0.9 + meanR * 0.1;
      const flatG = flg * 0.9 + meanG * 0.1;
      const flatB = flb * 0.9 + meanB * 0.1;
      const ao = 1 - (1 - smoothstep(0.25, 1.15, s)) * mat.ao * 0.7;
      const cr = flatR * s * ao;
      const cg = flatG * s * ao;
      const cb = flatB * s * ao;

      const kSoft = smoothstep(0, 0.3, key) * key;
      out[i] = toSrgb(toLin(pr) * (1 - kSoft) + cr * kSoft);
      out[i + 1] = toSrgb(toLin(Math.min(pg, Math.max(pr, pb))) * (1 - kSoft) + cg * kSoft);
      out[i + 2] = toSrgb(toLin(pb) * (1 - kSoft) + cb * kSoft);
      out[i + 3] = pa;
    }
  }

  return { out, coverage, meanLin, logStd };
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

  const { mask, coverage: maskCov, meanLum } = buildMask(pd, w, h, input.style);
  if (maskCov < 0.04) {
    throw new Error(
      "ناحیه پرده در عکس مرجع تشخیص داده نشد. عکس نصب واقعی واضح‌تری آپلود کنید."
    );
  }

  // Auto-chroma from reference (template + reference fused)
  const chroma = paintChroma(pd, w, h, mask, meanLum);

  const mapped = await mapFabricOntoChroma(
    chroma,
    w,
    h,
    input.fabricPathOrUrl,
    input.style,
    input.material
  );

  const coverageScore = Math.min(1, mapped.coverage / 0.18) * 5;
  const foldScore = Math.min(1, mapped.logStd / 0.18) * 3;
  const qualityScore = Math.round(Math.min(10, coverageScore + foldScore + 1.5) * 10) / 10;

  const fileName = `install-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const filePath = path.join(input.outDir, fileName);
  fs.mkdirSync(input.outDir, { recursive: true });

  let pipeline = sharp(mapped.out, { raw: { width: w, height: h, channels: 4 } });
  pipeline = await applyBrandWatermark(sharp, pipeline, w, h);
  await pipeline.jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(filePath);

  return {
    filePath,
    publicPath: `/uploads/${fileName}`,
    width: w,
    height: h,
    qualityScore,
    coverage: Math.round(mapped.coverage * 1000) / 1000,
  };
}
