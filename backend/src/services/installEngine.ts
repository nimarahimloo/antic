/**
 * Local install-image engine — free, offline, no external AI.
 * Maps: style template (chroma) × fabric photo × material profile → install preview
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
};

export type RenderResult = {
  filePath: string;
  publicPath: string;
  width: number;
  height: number;
};

export { resolveStyle as styleFromModel, guessMaterial };

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
  return Math.max(a, Math.min(b, Math.round(v)));
}

function materialParams(material?: string) {
  switch ((material || "cotton").toLowerCase()) {
    case "velvet":
      return { contrast: 1.2, sheen: 0.35, detail: 0.9, gamma: 1.15, tile: 0.42 };
    case "silk":
    case "satin":
      return { contrast: 1.05, sheen: 0.55, detail: 0.85, gamma: 1.0, tile: 0.36 };
    case "sheer":
    case "voile":
      return { contrast: 0.85, sheen: 0.1, detail: 0.7, gamma: 0.95, tile: 0.32 };
    default:
      return { contrast: 1.0, sheen: 0.12, detail: 0.8, gamma: 1.05, tile: 0.38 };
  }
}

export async function renderInstallImage(input: RenderInput): Promise<RenderResult> {
  const sharp = await getSharp();
  const maxWidth = input.maxWidth || Number(process.env.RENDER_MAX_WIDTH) || 1400;
  const mat = materialParams(input.material);
  const fabricScale = input.fabricScale ?? mat.tile;

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

  const fabSize = Math.max(96, Math.min(512, Math.round(tw * fabricScale)));
  const { data: fd, info: fi } = await sharp(fabricBuf)
    .resize(fabSize, fabSize, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

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

  const sampleFab = (px: number, py: number) => {
    const x = ((Math.floor(px) % fi.width) + fi.width) % fi.width;
    const y = ((Math.floor(py) % fi.height) + fi.height) % fi.height;
    const i = (y * fi.width + x) * 4;
    return [fd[i], fd[i + 1], fd[i + 2]] as const;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = td[i];
      const g = td[i + 1];
      const b = td[i + 2];
      const a = td[i + 3];

      const greenExcess = g - Math.max(r, b);
      const key = Math.max(0, Math.min(1, (greenExcess - 8) / 55));

      if (key < 0.02) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = a;
        continue;
      }

      const iL = (y * w + Math.max(0, x - 1)) * 4;
      const iR = (y * w + Math.min(w - 1, x + 1)) * 4;
      const iU = (Math.max(0, y - 1) * w + x) * 4;
      const iD = (Math.min(h - 1, y + 1) * w + x) * 4;
      const gx = (td[iR + 1] - td[iL + 1]) / 255;
      const gy = (td[iD + 1] - td[iU + 1]) / 255;
      const slope = Math.min(1, Math.hypot(gx, gy) * 3);

      let [fr, fg, fb] = sampleFab(x + gx * 14, y + gy * 6);

      fr = clamp((fr / Math.max(fMeanR, 1)) * fMeanR);
      fg = clamp((fg / Math.max(fMeanG, 1)) * fMeanG);
      fb = clamp((fb / Math.max(fMeanB, 1)) * fMeanB);

      let shade = Math.max(0.12, g / meanG);
      shade = Math.pow(shade, mat.gamma * mat.contrast);
      const blurG = (td[iL + 1] + td[iR + 1] + td[iU + 1] + td[iD + 1] + g) / 5;
      shade *= Math.pow(Math.max(0.5, Math.min(2, g / Math.max(blurG, 1))), mat.detail);

      let cr = fr * shade;
      let cg = fg * shade;
      let cb = fb * shade;

      if (mat.sheen > 0 && slope > 0.15) {
        const hl = mat.sheen * slope * Math.max(0, shade - 0.9);
        cr += hl * (255 - cr) * 0.5;
        cg += hl * (255 - cg) * 0.5;
        cb += hl * (255 - cb) * 0.5;
      }

      // sheer: blend toward daylight
      if ((input.material || "").toLowerCase() === "sheer") {
        const light = 245;
        cr = cr * 0.55 + light * 0.45;
        cg = cg * 0.55 + light * 0.45;
        cb = cb * 0.55 + light * 0.45;
      }

      const inv = 1 - key;
      out[i] = clamp(cr * key + r * inv);
      out[i + 1] = clamp(cg * key + Math.min(g, Math.max(r, b)) * inv);
      out[i + 2] = clamp(cb * key + b * inv);
      out[i + 3] = a;
    }
  }

  const fileName = `install-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const filePath = path.join(input.outDir, fileName);
  fs.mkdirSync(input.outDir, { recursive: true });

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(filePath);

  return { filePath, publicPath: `/uploads/${fileName}`, width: w, height: h };
}
