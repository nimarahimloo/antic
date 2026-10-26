/**
 * Install engine
 * - Smaller fabric scale for close-up photos (finer pattern / yarn detail)
 * - Mirror tile (hides hard seams better than wrap on non-seamless photos)
 * - Edge UV clamped (no left-side break)
 * - Color-preserving shade
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  resolveStyle,
  guessMaterial,
  styleTileFactor,
  styleWarpFactor,
  isFlatStyle,
} from "../lib/curtainStyles.js";
import { applyBrandWatermark } from "./brandWatermark.js";

export type RenderInput = {
  templatePathOrUrl: string;
  fabricPathOrUrl: string;
  outDir: string;
  maxWidth?: number;
  fabricScale?: number;
  material?: string;
  style?: string;
};

export type RenderResult = {
  filePath: string;
  publicPath: string;
  width: number;
  height: number;
  qualityScore: number;
  coverage: number;
};

export { resolveStyle as styleFromModel, guessMaterial };

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

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
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

type TemplateCache = {
  key: string;
  w: number;
  h: number;
  data: Buffer;
  meanLin: number;
  coverage: number;
  top: number;
  logStd: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  coreMinX: number;
  coreMaxX: number;
  coreMinY: number;
  coreMaxY: number;
};

const templateCache = new Map<string, TemplateCache>();

function materialParams(material?: string, logStd?: number, style?: string) {
  const target =
    material === "velvet"
      ? 0.38
      : material === "silk"
        ? 0.32
        : material === "sheer"
          ? 0.15
          : 0.24;
  const contrast = Math.min(1.45, Math.max(0.75, target / Math.max(logStd ?? 0.12, 0.05)));
  const warp = styleWarpFactor(style);
  const flat = isFlatStyle(style);

  switch ((material || "cotton").toLowerCase()) {
    case "velvet":
      return { id: 1, contrast, sheen: 0.38, detail: flat ? 0.16 : 0.2, tile: 1, warp, ao: flat ? 0.18 : 0.32 };
    case "silk":
    case "satin":
      return { id: 2, contrast, sheen: 0.42, detail: flat ? 0.14 : 0.18, tile: 1, warp, ao: flat ? 0.14 : 0.24 };
    case "sheer":
    case "voile":
      return { id: 3, contrast, sheen: 0.06, detail: 0.1, tile: 1, warp: Math.min(warp, 0.008), ao: 0.1 };
    default:
      return { id: 0, contrast, sheen: 0.04, detail: flat ? 0.2 : 0.32, tile: 1, warp, ao: flat ? 0.16 : 0.26 };
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - i) + sorted[hi] * (i - lo);
}

async function decodeTemplate(src: string, maxWidth: number): Promise<TemplateCache> {
  const cacheKey = `${src}::${maxWidth}`;
  const hit = templateCache.get(cacheKey);
  if (hit) return hit;

  const sharp = await getSharp();
  const buf = await loadBuffer(src);
  const meta = await sharp(buf).metadata();
  let tw = meta.width || 900;
  let th = meta.height || 700;
  if (tw > maxWidth) {
    th = Math.round((th * maxWidth) / tw);
    tw = maxWidth;
  }

  const { data, info } = await sharp(buf)
    .resize(tw, th, { fit: "inside", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sumLin = 0;
  let nKey = 0;
  let top = info.height;
  let minX = info.width,
    maxX = 0,
    minY = info.height,
    maxY = 0;
  const logs: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      if (g - Math.max(r, b) > 0.12) {
        const linG = Math.pow(g, 2.2);
        sumLin += linG;
        nKey++;
        logs.push(Math.log(linG + 1e-3));
        xs.push(x);
        ys.push(y);
        if (y < top) top = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const meanLin = nKey ? sumLin / nKey : 1;
  const coverage = nKey / (info.width * info.height);
  const avgLog = logs.length ? logs.reduce((a, v) => a + v, 0) / logs.length : 0;
  const logStd = logs.length
    ? Math.sqrt(logs.reduce((a, v) => a + (v - avgLog) ** 2, 0) / logs.length)
    : 0.12;

  if (coverage < 0.02) {
    throw new Error("قالب chroma پوشش سبز کافی ندارد؛ از «ساخت قالب» یا آپلود سبز استفاده کنید.");
  }

  if (maxX <= minX) {
    minX = 0;
    maxX = info.width - 1;
  }
  if (maxY <= minY) {
    minY = 0;
    maxY = info.height - 1;
  }

  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);

  const entry: TemplateCache = {
    key: cacheKey,
    w: info.width,
    h: info.height,
    data,
    meanLin,
    coverage,
    top: 1 - top / info.height,
    logStd,
    minX,
    maxX,
    minY,
    maxY,
    coreMinX: Math.floor(percentile(xs, 0.06)),
    coreMaxX: Math.ceil(percentile(xs, 0.94)),
    coreMinY: Math.floor(percentile(ys, 0.05)),
    coreMaxY: Math.ceil(percentile(ys, 0.95)),
  };
  if (templateCache.size > 24) {
    const first = templateCache.keys().next().value;
    if (first) templateCache.delete(first);
  }
  templateCache.set(cacheKey, entry);
  return entry;
}

/** Mirror tile — reflects at edges so non-seamless close-ups don't hard-seam */
function mirrorCoord(t: number, size: number): number {
  if (size <= 1) return 0;
  const inset = size * 0.015;
  const usable = size - 2 * inset;
  if (usable <= 1) return size / 2;
  const period = usable * 2;
  let m = t % period;
  if (m < 0) m += period;
  if (m > usable) m = period - m;
  return Math.min(size - 1.001, Math.max(0, inset + m));
}

function sampleFabMirror(
  fd: Buffer,
  fw: number,
  fh: number,
  u: number,
  v: number
): [number, number, number] {
  const x = mirrorCoord(u, fw);
  const y = mirrorCoord(v, fh);
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
  return [
    fd[i00] * (1 - fx) * (1 - fy) + fd[i10] * fx * (1 - fy) + fd[i01] * (1 - fx) * fy + fd[i11] * fx * fy,
    fd[i00 + 1] * (1 - fx) * (1 - fy) + fd[i10 + 1] * fx * (1 - fy) + fd[i01 + 1] * (1 - fx) * fy + fd[i11 + 1] * fx * fy,
    fd[i00 + 2] * (1 - fx) * (1 - fy) + fd[i10 + 2] * fx * (1 - fy) + fd[i01 + 2] * (1 - fx) * fy + fd[i11 + 2] * fx * fy,
  ];
}

export async function renderInstallImage(input: RenderInput): Promise<RenderResult> {
  const sharp = await getSharp();
  const maxWidth = input.maxWidth || Number(process.env.RENDER_MAX_WIDTH) || 1400;
  const tpl = await decodeTemplate(input.templatePathOrUrl, maxWidth);
  const mat = materialParams(input.material, tpl.logStd, input.style);
  const flat = isFlatStyle(input.style);

  const fabricBuf = await loadBuffer(input.fabricPathOrUrl);
  const fabMeta = await sharp(fabricBuf).metadata();
  const srcW = fabMeta.width || 1024;
  const srcH = fabMeta.height || 1024;
  const aspect = srcW / Math.max(1, srcH);

  // بافر پارچه با رزولوشن بالاتر تا نخ و بافت از بین نرود
  const fabW = Math.max(1024, Math.min(2400, Math.max(srcW, Math.round(tpl.w * 1.6))));
  const fabH = Math.max(512, Math.min(2400, Math.round(fabW / aspect)));

  const { data: fd, info: fi } = await sharp(fabricBuf)
    .resize(fabW, fabH, {
      fit: "cover",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: srcW >= fabW,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // تخمین جزئیات: واریانس محلی بالا = پارچه کلوزآپ با نخ/طرح ریز → تایل ریزتر
  let detailBoost = 1;
  {
    let sum = 0;
    let sum2 = 0;
    let n = 0;
    const step = Math.max(4, Math.floor(Math.min(fi.width, fi.height) / 64));
    for (let y = 0; y < fi.height; y += step) {
      for (let x = 0; x < fi.width; x += step) {
        const i = (y * fi.width + x) * 4;
        const lum = 0.2126 * fd[i] + 0.7152 * fd[i + 1] + 0.0722 * fd[i + 2];
        sum += lum;
        sum2 += lum * lum;
        n++;
      }
    }
    if (n > 8) {
      const mean = sum / n;
      const variance = Math.max(0, sum2 / n - mean * mean);
      const std = Math.sqrt(variance);
      if (std > 28) detailBoost = 0.72;
      else if (std > 18) detailBoost = 0.82;
      else if (std > 12) detailBoost = 0.9;
    }
  }

  const baseScale = mat.tile * styleTileFactor(input.style) * detailBoost;
  const fabricScale = Math.min(0.95, Math.max(0.28, input.fabricScale ?? baseScale));

  const w = tpl.w;
  const h = tpl.h;
  const td = tpl.data;
  const out = Buffer.alloc(w * h * 4);

  const gMinX = tpl.minX;
  const gMinY = tpl.minY;
  const gW = Math.max(1, tpl.maxX - tpl.minX);
  const gH = Math.max(1, tpl.maxY - tpl.minY);

  const coreW = Math.max(1, tpl.coreMaxX - tpl.coreMinX);
  const tileX = coreW * fabricScale;
  const tileY = tileX / aspect;

  let keySum = 0;
  let keyN = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const pr = td[i],
        pg = td[i + 1],
        pb = td[i + 2],
        pa = td[i + 3];
      const rn = pr / 255,
        gn = pg / 255,
        bn = pb / 255;
      const gdom = gn - Math.max(rn, bn);
      const sat = gn / Math.max(rn + gn + bn, 1e-3);
      const key = smoothstep(0.035, 0.14, gdom) * smoothstep(0.26, 0.4, sat);

      if (key < 0.006) {
        out[i] = pr;
        out[i + 1] = pg;
        out[i + 2] = pb;
        out[i + 3] = pa;
        continue;
      }

      keySum += key;
      keyN++;

      let s = toLin(pg) / tpl.meanLin;

      const iL = (y * w + Math.max(0, x - 1)) * 4;
      const iR = (y * w + Math.min(w - 1, x + 1)) * 4;
      const iU = (Math.max(0, y - 1) * w + x) * 4;
      const iD = (Math.min(h - 1, y + 1) * w + x) * 4;
      const sh = (idx: number) => toLin(td[idx + 1]) / tpl.meanLin;
      const gx = sh(iR) - sh(iL);
      const gy = sh(iD) - sh(iU);
      const slope = smoothstep(0.15, 0.9, Math.hypot(gx, gy));
      const blurS = (sh(iL) + sh(iR) + sh(iU) + sh(iD) + s) / 5;
      const micro = clamp01(s / Math.max(blurS, 0.02));
      s *= Math.pow(Math.min(1.7, Math.max(0.6, micro)), mat.detail * 0.8);
      s = 1 + (s - 1) * Math.min(mat.contrast, 0.9);

      let localX = x - gMinX;
      let localY = y - gMinY;
      localX = Math.max(0, Math.min(gW, localX));
      localY = Math.max(0, Math.min(gH, localY));

      // warp خیلی کم تا طرح و نخ پارچه روی چین‌ها کش نیاید
      const u = (localX / tileX) * fi.width + (flat ? 0 : gx * mat.warp * fi.width * 0.025);
      const v = (localY / Math.max(tileY, 1)) * fi.height + (flat ? 0 : gy * mat.warp * fi.height * 0.018);

      const [fr, fg, fb] = sampleFabMirror(fd, fi.width, fi.height, u, v);

      const flr = toLin(fr);
      const flg = toLin(fg);
      const flb = toLin(fb);

      const light = Math.max(0.42, Math.min(1.42, s));
      const aoAmt = (mat.ao ?? 0.2) * 0.48;
      const ao = 1 - (1 - smoothstep(0.35, 1.05, s)) * aoAmt;

      let cr = flr * light * ao;
      let cg = flg * light * ao;
      let cb = flb * light * ao;

      const lum = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
      const satBoost = 1.12;
      cr = lum + (cr - lum) * satBoost;
      cg = lum + (cg - lum) * satBoost;
      cb = lum + (cb - lum) * satBoost;

      if (mat.id === 1) {
        const sv = s < 1 ? Math.pow(s, 1.12) : 1 + (s - 1) * 0.32;
        const mul = sv * (1 + mat.sheen * slope * 0.28);
        cr = flr * mul;
        cg = flg * mul;
        cb = flb * mul;
      } else if (mat.id === 2) {
        const hl = mat.sheen * smoothstep(1.05, 1.6, s) * 0.28;
        cr = flr * light + hl * (0.3 * flr + 0.7);
        cg = flg * light + hl * (0.3 * flg + 0.7);
        cb = flb * light + hl * (0.3 * flb + 0.7);
      } else if (mat.id === 3) {
        const lightS = Math.min(1.35, s);
        cr = flr * s * 0.62 + (0.3 * flr + 0.7) * lightS * 0.38;
        cg = flg * s * 0.62 + (0.3 * flg + 0.7) * 0.98 * lightS * 0.38;
        cb = flb * s * 0.62 + (0.3 * flb + 0.7) * 0.94 * lightS * 0.38;
      }

      const desR = toLin(pr);
      const desG = toLin(Math.min(pg, Math.max(pr, pb)));
      const desB = toLin(pb);
      const kSoft = smoothstep(0, 0.28, key) * key;
      out[i] = toSrgb(desR * (1 - kSoft) + cr * kSoft);
      out[i + 1] = toSrgb(desG * (1 - kSoft) + cg * kSoft);
      out[i + 2] = toSrgb(desB * (1 - kSoft) + cb * kSoft);
      out[i + 3] = pa;
    }
  }

  const avgKey = keyN ? keySum / keyN : 0;
  const coverageScore = Math.min(1, tpl.coverage / 0.25) * 4;
  const keyScore = avgKey * 3;
  const foldScore = Math.min(1, tpl.logStd / 0.2) * 3;
  const qualityScore = Math.round(Math.min(10, coverageScore + keyScore + foldScore) * 10) / 10;

  const fileName = `install-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const filePath = path.join(input.outDir, fileName);
  fs.mkdirSync(input.outDir, { recursive: true });

  let pipeline = sharp(out, { raw: { width: w, height: h, channels: 4 } });
  pipeline = await applyBrandWatermark(sharp, pipeline, w, h);
  await pipeline.jpeg({ quality: 94, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(filePath);

  return {
    filePath,
    publicPath: `/uploads/${fileName}`,
    width: w,
    height: h,
    qualityScore,
    coverage: Math.round(tpl.coverage * 1000) / 1000,
  };
}

export function clearTemplateCache() {
  templateCache.clear();
}
