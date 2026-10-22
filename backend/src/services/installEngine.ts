/**
 * High-accuracy local install engine (no external AI).
 * Closely follows browser photoRenderer.js:
 *  - linear (gamma 2.2) shading from chroma template folds
 *  - soft green key + despill
 *  - fabric tile with lighting flatten + bilinear sample
 *  - material profiles (cotton/velvet/silk/sheer)
 *
 * Performance:
 *  - in-memory template cache (decoded raw + analysis)
 *  - single-pass composite
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { resolveStyle, guessMaterial } from "../lib/curtainStyles.js";

export type RenderInput = {
  templatePathOrUrl: string;
  fabricPathOrUrl: string;
  outDir: string;
  maxWidth?: number;
  fabricScale?: number;
  material?: string;
  /** style key for tile heuristics */
  style?: string;
};

export type RenderResult = {
  filePath: string;
  publicPath: string;
  width: number;
  height: number;
  /** 0–10 quality estimate (coverage, key strength, fold signal) */
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
  switch ((material || "cotton").toLowerCase()) {
    case "velvet":
      return { id: 1, contrast, sheen: 0.55, detail: 0.28, tile: 0.42 };
    case "silk":
    case "satin":
      return { id: 2, contrast, sheen: 0.7, detail: 0.32, tile: 0.34 };
    case "sheer":
    case "voile":
      return { id: 3, contrast, sheen: 0.15, detail: 0.22, tile: 0.3 };
    default:
      return { id: 0, contrast, sheen: 0.08, detail: 0.35, tile: 0.38 };
  }
}

/** style-aware vertical hang bias (pattern starts from top of fabric zone) */
function styleTileFactor(style?: string) {
  switch (style) {
    case "zebra":
      return 0.95;
    case "roman":
      return 0.9;
    case "shade":
    case "double":
      return 0.88;
    case "roller":
      return 0.85;
    case "panel":
      return 0.92;
    default:
      return 1;
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

  // Analyze like browser analyzeTemplate
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
    throw new Error(
      "قالب chroma پوشش سبز کافی ندارد؛ عکس نصب با پارچه سبز واضح آپلود کنید."
    );
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
  // keep last few templates only
  if (templateCache.size > 24) {
    const first = templateCache.keys().next().value;
    if (first) templateCache.delete(first);
  }
  templateCache.set(cacheKey, entry);
  return entry;
}

function sampleFabBilinear(
  fd: Buffer,
  fw: number,
  fh: number,
  u: number,
  v: number
): [number, number, number] {
  // u,v in pixel space of fabric tile
  let x = u % fw;
  if (x < 0) x += fw;
  let y = v % fh;
  if (y < 0) y += fh;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = (x0 + 1) % fw;
  const y1 = (y0 + 1) % fh;
  const fx = x - x0;
  const fy = y - y0;

  const at = (xx: number, yy: number) => {
    const i = (yy * fw + xx) * 4;
    return [fd[i], fd[i + 1], fd[i + 2]] as const;
  };
  const c00 = at(x0, y0);
  const c10 = at(x1, y0);
  const c01 = at(x0, y1);
  const c11 = at(x1, y1);

  const r =
    c00[0] * (1 - fx) * (1 - fy) +
    c10[0] * fx * (1 - fy) +
    c01[0] * (1 - fx) * fy +
    c11[0] * fx * fy;
  const g =
    c00[1] * (1 - fx) * (1 - fy) +
    c10[1] * fx * (1 - fy) +
    c01[1] * (1 - fx) * fy +
    c11[1] * fx * fy;
  const b =
    c00[2] * (1 - fx) * (1 - fy) +
    c10[2] * fx * (1 - fy) +
    c01[2] * (1 - fx) * fy +
    c11[2] * fx * fy;
  return [r, g, b];
}

// fix typo - I used n11 instead of c11 for blue channel
function sampleFab(
  fd: Buffer,
  fw: number,
  fh: number,
  u: number,
  v: number
): [number, number, number] {
  let x = u % fw;
  if (x < 0) x += fw;
  let y = v % fh;
  if (y < 0) y += fh;
  const x0 = x | 0;
  const y0 = y | 0;
  const x1 = (x0 + 1) % fw;
  const y1 = (y0 + 1) % fh;
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
  const fabricScale = (input.fabricScale ?? mat.tile) * styleTileFactor(input.style);

  const fabricBuf = await loadBuffer(input.fabricPathOrUrl);
  const fabMeta = await sharp(fabricBuf).metadata();
  const aspect = (fabMeta.width || 1) / (fabMeta.height || 1);

  // Larger tile for patterned fabrics → less mosaic; cap for RAM
  const fabW = Math.max(128, Math.min(640, Math.round(tpl.w * fabricScale)));
  const fabH = Math.max(128, Math.min(640, Math.round(fabW / aspect)));

  const { data: fd, info: fi } = await sharp(fabricBuf)
    .resize(fabW, fabH, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Fabric mean in linear space for lighting flatten
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

  // Local average approx: 5x5 box on fabric is expensive; use global mean as LOD substitute
  // (shader uses mipmap LOD — good enough on server)

  const w = tpl.w;
  const h = tpl.h;
  const td = tpl.data;
  const out = Buffer.alloc(w * h * 4);

  // tile size in pixels of output (like uTile in shader)
  const tileX = w * fabricScale * 0.42;
  const tileY = tileX / aspect;

  let keySum = 0;
  let keyN = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const pr = td[i];
      const pg = td[i + 1];
      const pb = td[i + 2];
      const pa = td[i + 3];

      const rn = pr / 255;
      const gn = pg / 255;
      const bn = pb / 255;
      const key = smoothstep(0.05, 0.22, gn - Math.max(rn, bn));

      if (key < 0.015) {
        out[i] = pr;
        out[i + 1] = pg;
        out[i + 2] = pb;
        out[i + 3] = pa;
        continue;
      }

      keySum += key;
      keyN++;

      // linear shade from green channel
      let s = toLin(pg) / tpl.meanLin;

      // neighbours for gradient + micro detail
      const iL = (y * w + Math.max(0, x - 1)) * 4;
      const iR = (y * w + Math.min(w - 1, x + 1)) * 4;
      const iU = (Math.max(0, y - 1) * w + x) * 4;
      const iD = (Math.min(h - 1, y + 1) * w + x) * 4;

      const sh = (idx: number) => toLin(td[idx + 1]) / tpl.meanLin;
      const gx = sh(iR) - sh(iL);
      const gy = sh(iD) - sh(iU);
      const slope = smoothstep(0.15, 0.9, Math.hypot(gx, gy));

      // micro-fold: local vs neighbourhood
      const blurS = (sh(iL) + sh(iR) + sh(iU) + sh(iD) + s) / 5;
      s *= Math.pow(clamp01(s / Math.max(blurS, 0.02) / 2 + 0.5), mat.detail); // keep range
      s = Math.pow(Math.max(s, 0), mat.contrast);

      // UV: hang from template top (fabric zone)
      const px = x;
      const py = (tpl.top - y / h) * h; // relative to fabric top
      let u = px / tileX + gx * 0.12;
      let v = py / tileY;

      let [fr, fg, fb] = sampleFab(fd, fi.width, fi.height, u * fi.width, v * fi.height);

      // to linear + flatten lighting toward mean
      let flr = toLin(fr);
      let flg = toLin(fg);
      let flb = toLin(fb);
      const ratioR = clamp01(flr / Math.max(meanR, 0.003));
      const ratioG = clamp01(flg / Math.max(meanG, 0.003));
      const ratioB = clamp01(flb / Math.max(meanB, 0.003));
      const flatR = meanR * Math.min(1.5, Math.max(0.6, ratioR * 1.05));
      const flatG = meanG * Math.min(1.5, Math.max(0.6, ratioG * 1.05));
      const flatB = meanB * Math.min(1.5, Math.max(0.6, ratioB * 1.05));

      let cr = flatR * s;
      let cg = flatG * s;
      let cb = flatB * s;

      if (mat.id === 1) {
        // velvet
        const sv = s < 1 ? Math.pow(s, 1.25) : 1 + (s - 1) * 0.45;
        cr = flatR * sv * (1 + mat.sheen * slope * 0.5);
        cg = flatG * sv * (1 + mat.sheen * slope * 0.5);
        cb = flatB * sv * (1 + mat.sheen * slope * 0.5);
      } else if (mat.id === 2) {
        // silk highlight on crowns
        const hl = mat.sheen * smoothstep(1.05, 1.7, s) * 0.5;
        cr = flatR * s + hl * (0.4 * flatR + 0.6);
        cg = flatG * s + hl * (0.4 * flatG + 0.6);
        cb = flatB * s + hl * (0.4 * flatB + 0.6);
      } else if (mat.id === 3) {
        // sheer: mix daylight
        const light = Math.min(1.6, s);
        const lr = 1.0 * light;
        const lg = 0.98 * light;
        const lb = 0.94 * light;
        cr = flatR * s * 0.55 + (0.4 * flatR + 0.6) * lr * 0.45;
        cg = flatG * s * 0.55 + (0.4 * flatG + 0.6) * lg * 0.45;
        cb = flatB * s * 0.55 + (0.4 * flatB + 0.6) * lb * 0.45;
      }

      // despill background
      const desR = toLin(pr);
      const desG = toLin(Math.min(pg, Math.max(pr, pb)));
      const desB = toLin(pb);

      const outR = desR * (1 - key) + cr * key;
      const outG = desG * (1 - key) + cg * key;
      const outB = desB * (1 - key) + cb * key;

      out[i] = toSrgb(outR);
      out[i + 1] = toSrgb(outG);
      out[i + 2] = toSrgb(outB);
      out[i + 3] = pa;
    }
  }

  // Quality score 0–10
  const avgKey = keyN ? keySum / keyN : 0;
  const coverageScore = Math.min(1, tpl.coverage / 0.25) * 4; // up to 4
  const keyScore = avgKey * 3; // up to 3
  const foldScore = Math.min(1, tpl.logStd / 0.2) * 3; // up to 3
  const qualityScore = Math.round(Math.min(10, coverageScore + keyScore + foldScore) * 10) / 10;

  const fileName = `install-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const filePath = path.join(input.outDir, fileName);
  fs.mkdirSync(input.outDir, { recursive: true });

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(filePath);

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
