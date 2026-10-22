/**
 * Local install-image engine — free, offline, no external AI.
 *
 * Approximates the browser WebGL photoRenderer:
 *   chroma-green template (folds/shadow from real photo)
 * + fabric swatch (color/weave)
 * → realistic install preview
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type RenderInput = {
  templatePathOrUrl: string;
  fabricPathOrUrl: string;
  outDir: string;
  maxWidth?: number;
  /** fabric tile scale relative to width (default 0.38) */
  fabricScale?: number;
  /** material hint: cotton | velvet | silk | sheer */
  material?: string;
};

export type RenderResult = {
  filePath: string;
  publicPath: string;
  width: number;
  height: number;
};

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

async function getSharp() {
  const mod = await import("sharp");
  return mod.default;
}

function clamp(v: number, a = 0, b = 255) {
  return Math.max(a, Math.min(b, v));
}

function materialParams(material?: string) {
  switch ((material || "cotton").toLowerCase()) {
    case "velvet":
      return { contrast: 1.2, sheen: 0.35, detail: 0.9, soft: 1.15 };
    case "silk":
    case "satin":
      return { contrast: 1.05, sheen: 0.55, detail: 0.85, gamma: 1.0 };
    case "sheer":
    case "voile":
      return { contrast: 0.85, sheen: 0.1, detail: 0.7, gamma: 0.95 };
    default:
      return { contrast: 1.0, sheen: 0.12, detail: 0.8, gamma: 1.05 };
  }
}

/**
 * High-quality CPU composite (admin-triggered only).
 */
export async function renderInstallImage(input: RenderInput): Promise<RenderResult> {
  const sharp = await getSharp();
  const maxWidth = input.maxWidth || Number(process.env.RENDER_MAX_WIDTH) || 1400;
  const fabricScale = input.fabricScale ?? 0.38;
  const mat = materialParams(input.material);

  const templateBuf = await loadBuffer(input.templatePathOrUrl);
  const fabricBuf = await loadBuffer(input.fabricPathOrUrl);

  const tMeta = await sharp(templateBuf).metadata();
  let tw = tMeta.width || 900;
  let th = tMeta.height || 700;
  if (tw > maxWidth) {
    th = Math.round((th * maxWidth) / tw);
    tw = maxWidth;
  }

  const { data: td, info: ti } = await sharp(templateBuf)
    .resize(tw, th, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Larger fabric tile = less mosaic; still covers folds
  const fabSize = Math.max(96, Math.min(512, Math.round(tw * fabricScale)));
  const { data: fd, info: fi } = await sharp(fabricBuf)
    .resize(fabSize, fabSize, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Precompute fabric mean for local lighting flatten (like shader LOD)
  let fMeanR = 0,
    fMeanG = 0,
    fMeanB = 0,
    fN = 0;
  for (let i = 0; i < fd.length; i += 4) {
    if (fd[i + 3] < 20) continue;
    fMeanR += fd[i];
    fMeanG += fd[i + 1];
    fMeanB += fd[i + 2];
    fN++;
  }
  fMeanR = fN ? fMeanR / fN : 128;
  fMeanG = fN ? fMeanG / fN : 128;
  fMeanB = fN ? fMeanB / fN : 128;

  // Green-key mean for fold shading
  let sumG = 0,
    nKey = 0;
  for (let i = 0; i < td.length; i += 4) {
    const r = td[i],
      g = td[i + 1],
      b = td[i + 2];
    if (g - Math.max(r, b) > 20) {
      sumG += g;
      nKey++;
    }
  }
  const meanG = nKey ? sumG / nKey : 140;

  const w = ti.width;
  const h = ti.height;
  const out = Buffer.alloc(w * h * 4);

  // Helper: sample fabric with bilinear-ish (nearest + soft)
  const sampleFab = (px: number, py: number) => {
    let x = ((Math.floor(px) % fi.width) + fi.width) % fi.width;
    let y = ((Math.floor(py) % fi.height) + fi.height) % fi.height;
    const i = (y * fi.width + x) * 4;
    return [fd[i], fd[i + 1], fd[i + 2], fd[i + 3]] as const;
  };

  // Soft green key + fold-aware warp
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = td[i];
      const g = td[i + 1];
      const b = td[i + 2];
      const a = td[i + 3];

      // Soft key (like shader smoothstep)
      const greenExcess = g - Math.max(r, b);
      const key = Math.max(0, Math.min(1, (greenExcess - 8) / 55));

      if (key < 0.02) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = a;
        continue;
      }

      // Local gradient for fold warp + slope sheen
      const iL = (y * w + Math.max(0, x - 1)) * 4;
      const iR = (y * w + Math.min(w - 1, x + 1)) * 4;
      const iU = (Math.max(0, y - 1) * w + x) * 4;
      const iD = (Math.min(h - 1, y + 1) * w + x) * 4;
      const gx = (td[iR + 1] - td[iL + 1]) / 255;
      const gy = (td[iD + 1] - td[iU + 1]) / 255;
      const slope = Math.min(1, Math.hypot(gx, gy) * 3);

      // Warp UV into folds
      const warpX = x + gx * 14;
      const warpY = y + gy * 6;

      let [fr, fg, fb] = sampleFab(warpX, warpY);

      // Flatten fabric photo lighting toward mean (seamless tiling)
      const localBoost = 1.15;
      fr = clamp(fMeanR * clamp((fr / Math.max(fMeanR, 1)) * localBoost, 0.55, 1.55) / 1);
      fg = clamp(fMeanG * clamp((fg / Math.max(fMeanG, 1)) * localBoost, 0.55, 1.55) / 1);
      fb = clamp(fMeanB * clamp((fb / Math.max(fMeanB, 1)) * localBoost, 0.55, 1.55) / 1);
      // simpler normalize:
      fr = clamp((fr / Math.max(fMeanR, 1)) * fMeanR);
      fg = clamp((fg / Math.max(fMeanG, 1)) * fMeanG);
      fb = clamp((fb / Math.max(fMeanB, 1)) * fMeanB);

      // Fold shading from template green (gamma for material)
      let shade = Math.max(0.12, g / meanG);
      shade = Math.pow(shade, mat.gamma * mat.contrast);

      // Micro detail: local vs neighbour green
      const blurG = (td[iL + 1] + td[iR + 1] + td[iU + 1] + td[iD + 1] + g) / 5;
      const micro = Math.pow(clamp(g / Math.max(blurG, 1), 0.5, 2), mat.detail);
      shade *= micro;

      let cr = fr * shade;
      let cg = fg * shade;
      let cb = fb * shade;

      // Material sheen on fold crowns
      if (mat.sheen > 0 && slope > 0.15) {
        const hl = mat.sheen * slope * Math.max(0, shade - 0.9);
        cr = cr + hl * (255 - cr) * 0.5;
        cg = cg + hl * (255 - cg) * 0.5;
        cb = cb + hl * (255 - cb) * 0.5;
      }

      // Despill background mix at edges
      const desR = r;
      const desG = Math.min(g, Math.max(r, b));
      const desB = b;
      const inv = 1 - key;

      out[i] = clamp(cr * key + desR * inv);
      out[i + 1] = clamp(cg * key + desG * inv);
      out[i + 2] = clamp(cb * key + desB * inv);
      out[i + 3] = a;
    }
  }

  const fileName = `install-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const filePath = path.join(input.outDir, fileName);
  fs.mkdirSync(input.outDir, { recursive: true });

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(filePath);

  return {
    filePath,
    publicPath: `/uploads/${fileName}`,
    width: w,
    height: h,
  };
}

export function styleFromModel(model: {
  categorySlug?: string | null;
  subcategory?: string | null;
  material?: string | null;
  fabric?: string | null;
}): string {
  const cat = model.categorySlug || "";
  const sub = model.subcategory || "";
  if (cat === "pleated") return sub === "chain" ? "pleated-chain" : "pleated-manual";
  if (cat === "pleated-mesh") return "pleated-sheer";
  const map: Record<string, string> = {
    roman: "roman",
    shade: "shade",
    "double-shade": "double",
    roller: "roller",
    zebra: "zebra",
    printed: "drape",
    aurora: "wave",
    "turk-panel": "panel",
    cubism: "drape",
    sheer: "drape",
    silk: "drape",
    velvet: "drape",
    cotton: "drape",
    outdoor: "shade",
    motorized: "shade",
  };
  return map[cat] || "drape";
}

export function guessMaterial(model: {
  material?: string | null;
  fabric?: string | null;
  categorySlug?: string | null;
}): string {
  const hay = `${model.material || ""} ${model.fabric || ""} ${model.categorySlug || ""}`.toLowerCase();
  if (/velvet|مخمل/.test(hay)) return "velvet";
  if (/silk|satin|ابریشم|ساتن/.test(hay)) return "silk";
  if (/sheer|voile|تور|شفاف|توری/.test(hay)) return "sheer";
  return "cotton";
}
