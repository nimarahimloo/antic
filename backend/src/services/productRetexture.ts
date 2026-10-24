/**
 * Retexture a REAL product photograph (roman, pleated, zebra, blinds…).
 * Keeps wall / frame / cassette / window / floor exactly as in the photo.
 * Only the curtain fabric region is replaced — luminance (folds) preserved.
 *
 * Use the catalog product shots the client provided as InstallReference images.
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

/** Distance to neutral wall beige / white frame */
function isBackground(r: number, g: number, b: number, yNorm: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max < 1e-3 ? 0 : (max - min) / max;
  const lum = (r + g + b) / 3;

  // pure / near-white frame, cassette, sill, handles
  if (lum > 0.82 && sat < 0.12) return true;
  if (lum > 0.9) return true;

  // beige / taupe wall (product shots)
  const wallLike =
    r > 0.55 && g > 0.5 && b > 0.4 && r >= g && g >= b - 0.05 && sat < 0.22 && lum > 0.55 && lum < 0.88;
  if (wallLike && yNorm < 0.88) return true;

  // floor wood at bottom
  if (yNorm > 0.9 && sat < 0.35 && lum > 0.25 && lum < 0.7 && r > g && g > b) return true;

  // very dark (shadows under sill) keep as-is if low sat
  if (lum < 0.12 && sat < 0.15) return true;

  return false;
}

/**
 * Soft fabric mask: structural mid-tones that aren't wall/frame.
 * Horizontal frequency helps pleats/zebra/blinds.
 */
function fabricKey(
  data: Buffer,
  w: number,
  h: number,
  x: number,
  y: number
): number {
  const i = (y * w + x) * 4;
  const r = data[i] / 255;
  const g = data[i + 1] / 255;
  const b = data[i + 2] / 255;
  const yNorm = y / h;

  if (isBackground(r, g, b, yNorm)) return 0;

  // Prefer central band (where curtain sits in product shots)
  const edgeX = Math.min(x / w, 1 - x / w);
  const edgeY = Math.min(yNorm, 1 - yNorm);
  if (edgeX < 0.04 || edgeY < 0.03) return 0;

  const lum = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max < 1e-3 ? 0 : (max - min) / max;

  // Curtain body: has some chroma OR structure (not flat wall)
  let k = 0;
  if (sat > 0.06 || (lum > 0.15 && lum < 0.85)) {
    k = clamp01((sat - 0.02) / 0.15) * 0.5 + clamp01(1 - Math.abs(lum - 0.5) * 1.2) * 0.5;
  }

  // Boost if neighbors differ (pleat / band edges)
  if (x > 1 && x < w - 2 && y > 1 && y < h - 2) {
    const iL = (y * w + (x - 2)) * 4;
    const iR = (y * w + (x + 2)) * 4;
    const iU = ((y - 2) * w + x) * 4;
    const iD = ((y + 2) * w + x) * 4;
    const lumL = (data[iL] + data[iL + 1] + data[iL + 2]) / (3 * 255);
    const lumR = (data[iR] + data[iR + 1] + data[iR + 2]) / (3 * 255);
    const lumU = (data[iU] + data[iU + 1] + data[iU + 2]) / (3 * 255);
    const lumD = (data[iD] + data[iD + 1] + data[iD + 2]) / (3 * 255);
    const edge = Math.abs(lumL - lumR) + Math.abs(lumU - lumD);
    k = clamp01(k + edge * 1.2);
  }

  // Soft falloff near walls of image
  k *= smoothstep(0.03, 0.1, edgeX) * smoothstep(0.02, 0.08, edgeY);
  return k;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
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

  // Precompute mask
  const mask = new Float32Array(w * h);
  let maskSum = 0;
  let maskN = 0;
  let meanLum = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = fabricKey(pd, w, h, x, y);
      mask[y * w + x] = k;
      if (k > 0.15) {
        maskSum += k;
        maskN++;
        const i = (y * w + x) * 4;
        meanLum += (pd[i] + pd[i + 1] + pd[i + 2]) / (3 * 255);
      }
    }
  }
  const coverage = maskN / (w * h);
  if (coverage < 0.04) {
    throw new Error(
      "در این عکس ناحیهٔ پرده تشخیص داده نشد. عکس نصب واقعی با پردهٔ رنگی روی دیوار بژ آپلود کنید."
    );
  }
  meanLum = maskN ? meanLum / maskN : 0.5;

  // Bounding box of fabric for UV mapping
  let minX = w,
    maxX = 0,
    minY = h,
    maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] > 0.2) {
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

  const out = Buffer.alloc(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const k = mask[y * w + x];
      const pr = pd[i],
        pg = pd[i + 1],
        pb = pd[i + 2],
        pa = pd[i + 3];

      if (k < 0.08) {
        out[i] = pr;
        out[i + 1] = pg;
        out[i + 2] = pb;
        out[i + 3] = pa;
        continue;
      }

      // Preserve fold shading from original luminance
      const origLum = toLin((pr + pg + pb) / 3);
      const shade = clamp01(origLum / Math.max(meanLum, 0.05));
      const s = Math.pow(Math.max(shade, 0.05), 0.92);

      const u = (x - minX) / bw;
      const v = (y - minY) / bh;
      // One fabric span across curtain width (natural scale)
      const [fr, fg, fb] = sampleFab(fd, fi.width, fi.height, u * 0.98, v * 0.98);

      const flr = toLin(fr),
        flg = toLin(fg),
        flb = toLin(fb);

      let cr = flr * s;
      let cg = flg * s;
      let cb = flb * s;

      // Soft mix at mask edges
      const kSoft = smoothstep(0.08, 0.55, k);
      out[i] = toSrgb(toLin(pr) * (1 - kSoft) + cr * kSoft);
      out[i + 1] = toSrgb(toLin(pg) * (1 - kSoft) + cg * kSoft);
      out[i + 2] = toSrgb(toLin(pb) * (1 - kSoft) + cb * kSoft);
      out[i + 3] = pa;
    }
  }

  const coverageScore = Math.min(1, coverage / 0.2) * 5;
  const qualityScore = Math.round(Math.min(10, coverageScore + 4) * 10) / 10;

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
