/**
 * Install engine: chroma template + fabric map.
 * Fabric scale ≈ 1 means one fabric image spans the green region (no postage-stamp tiling).
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { resolveStyle, guessMaterial, styleTileFactor } from "../lib/curtainStyles.js";
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
};

const templateCache = new Map<string, TemplateCache>();

function materialParams(material?: string, logStd?: number) {
  const target =
    material === "velvet"
      ? 0.4
      : material === "silk"
        ? 0.34
        : material === "sheer"
          ? 0.16
          : 0.26;
  const contrast = Math.min(1.8, Math.max(0.6, target / Math.max(logStd ?? 0.12, 0.05)));
  // tile base ~1 → one fabric width across green area; styleTileFactor fine-tunes
  switch ((material || "cotton").toLowerCase()) {
    case "velvet":
      return { id: 1, contrast, sheen: 0.45, detail: 0.22, tile: 1.0, warp: 0.04, ao: 0.42 };
    case "silk":
    case "satin":
      return { id: 2, contrast, sheen: 0.5, detail: 0.2, tile: 1.0, warp: 0.03, ao: 0.3 };
    case "sheer":
    case "voile":
      return { id: 3, contrast, sheen: 0.1, detail: 0.14, tile: 1.05, warp: 0.02, ao: 0.18 };
    default:
      return { id: 0, contrast, sheen: 0.06, detail: 0.28, tile: 1.0, warp: 0.03, ao: 0.4 };
  }
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
    .resize(tw, th, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sumLin = 0;
  let nKey = 0;
  let top = info.height;
  const logs: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    if (g - Math.max(r, b) > 0.12) {
      const linG = Math.pow(g, 2.2);
      sumLin += linG;
      nKey++;
      logs.push(Math.log(linG + 1e-3));
      const y = Math.floor(i / 4 / info.width);
      if (y < top) top = y;
    }
  }
  const meanLin = nKey ? sumLin / nKey : 1;
  const coverage = nKey / (info.width * info.height);
  const avgLog = logs.length ? logs.reduce((a, v) => a + v, 0) / logs.length : 0;
  const logStd = logs.length
    ? Math.sqrt(logs.reduce((a, v) => a + (v - avgLog) ** 2, 0) / logs.length)
    : 0.12;

  if (coverage < 0.02) {
    throw new Error("قالب chroma پوشش سبز کافی ندارد؛ از «ساخت قالب» با ناحیه سبز استفاده کنید.");
  }

  const entry: TemplateCache = {
    key: cacheKey,
    w: info.width,
    h: info.height,
    data,
    meanLin,
    coverage,
    top: 1 - top / info.height,
    logStd,
  };
  if (templateCache.size > 24) {
    const first = templateCache.keys().next().value;
    if (first) templateCache.delete(first);
  }
  templateCache.set(cacheKey, entry);
  return entry;
}

function sampleFab(fd: Buffer, fw: number, fh: number, u: number, v: number): [number, number, number] {
  // Clamp to edge (no ugly seam tiling) when sample is near border after scale≈1
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

export async function renderInstallImage(input: RenderInput): Promise<RenderResult> {
  const sharp = await getSharp();
  const maxWidth = input.maxWidth || Number(process.env.RENDER_MAX_WIDTH) || 1400;
  const tpl = await decodeTemplate(input.templatePathOrUrl, maxWidth);
  const mat = materialParams(input.material, tpl.logStd);

  // fabricScale: fraction of green width covered by one fabric image (≈1 = natural)
  const fabricScale = Math.min(
    1.35,
    Math.max(0.7, input.fabricScale ?? mat.tile * styleTileFactor(input.style))
  );

  const fabricBuf = await loadBuffer(input.fabricPathOrUrl);
  const fabMeta = await sharp(fabricBuf).metadata();
  const aspect = (fabMeta.width || 1) / (fabMeta.height || 1);

  // Keep fabric resolution high so weave detail survives stretch
  const fabW = Math.max(512, Math.min(1600, Math.round(tpl.w * 1.1)));
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

  const w = tpl.w;
  const h = tpl.h;
  const td = tpl.data;
  const out = Buffer.alloc(w * h * 4);

  // One fabric span ≈ fabricScale * full image width of green region
  const tileX = w * fabricScale;
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
      s *= Math.pow(Math.min(2, Math.max(0.5, micro)), mat.detail);
      s = Math.pow(Math.max(s, 0), Math.min(mat.contrast, 1.05));

      const py = (tpl.top - y / h) * h;
      const compress = 1 - 0.08 * smoothstep(0.75, 0.3, s);
      const warp = mat.warp ?? 0.03;
      // Map x across [0, fabric width] once per fabricScale
      const u = (x / tileX) * fi.width + gx * warp * fi.width * 0.15;
      const v = (py / (tileY * compress)) * fi.height + gy * warp * fi.height * 0.08;
      const [fr, fg, fb] = sampleFab(fd, fi.width, fi.height, u, v);

      const flr = toLin(fr),
        flg = toLin(fg),
        flb = toLin(fb);
      const ratioR = Math.min(1.25, Math.max(0.8, flr / Math.max(meanR, 0.004)));
      const ratioG = Math.min(1.25, Math.max(0.8, flg / Math.max(meanG, 0.004)));
      const ratioB = Math.min(1.25, Math.max(0.8, flb / Math.max(meanB, 0.004)));
      const flatR = flr * 0.88 + meanR * ratioR * 0.12;
      const flatG = flg * 0.88 + meanG * ratioG * 0.12;
      const flatB = flb * 0.88 + meanB * ratioB * 0.12;

      const ao = mat.ao != null ? 1 - (1 - smoothstep(0.25, 1.15, s)) * mat.ao * 0.7 : 1;
      let cr = flatR * s * ao,
        cg = flatG * s * ao,
        cb = flatB * s * ao;

      if (mat.id === 1) {
        const sv = s < 1 ? Math.pow(s, 1.2) : 1 + (s - 1) * 0.4;
        const mul = sv * (1 + mat.sheen * slope * 0.4);
        cr = flatR * mul;
        cg = flatG * mul;
        cb = flatB * mul;
      } else if (mat.id === 2) {
        const hl = mat.sheen * smoothstep(1.05, 1.7, s) * 0.4;
        cr = flatR * s + hl * (0.4 * flatR + 0.6);
        cg = flatG * s + hl * (0.4 * flatG + 0.6);
        cb = flatB * s + hl * (0.4 * flatB + 0.6);
      } else if (mat.id === 3) {
        const light = Math.min(1.5, s);
        cr = flatR * s * 0.55 + (0.4 * flatR + 0.6) * light * 0.45;
        cg = flatG * s * 0.55 + (0.4 * flatG + 0.6) * 0.98 * light * 0.45;
        cb = flatB * s * 0.55 + (0.4 * flatB + 0.6) * 0.94 * light * 0.45;
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
