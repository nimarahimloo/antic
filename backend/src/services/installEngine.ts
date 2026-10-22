/**
 * Install-image engine (server-side)
 *
 * Same idea as the browser photoRenderer:
 *   template photo (green fabric area) + real fabric swatch
 *   → composite using green as mask, luminance of green as fold shading
 *
 * Runs offline with `sharp` — no external AI, scales to tens of thousands of models.
 * Quality is production-useful; browser WebGL remains the gold path for interactive preview.
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type RenderInput = {
  templatePathOrUrl: string;
  fabricPathOrUrl: string;
  outDir: string;
  /** Max output width (keeps aspect). Default 1200 */
  maxWidth?: number;
  fabricScale?: number;
};

export type RenderResult = {
  filePath: string;
  publicPath: string; // /uploads/...
  width: number;
  height: number;
};

async function loadBuffer(src: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch image: ${src} (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  // relative uploads
  const local = src.startsWith("/") ? path.join(process.cwd(), src.replace(/^\/uploads/, "uploads")) : src;
  if (fs.existsSync(local)) return fs.readFileSync(local);
  // try uploads dir by basename
  const alt = path.join(process.env.UPLOAD_DIR || "./uploads", path.basename(src));
  if (fs.existsSync(alt)) return fs.readFileSync(alt);
  throw new Error(`Image not found: ${src}`);
}

function ensureSharp() {
  try {
    // dynamic import so server still boots if sharp not installed yet
    return import("sharp");
  } catch {
    throw new Error("sharp is required for install engine — run npm install in backend/");
  }
}

/**
 * Pure JS/CPU composite approximating the WebGL shader:
 * - mask = how green the template pixel is
 * - shade = green luminance / mean (folds)
 * - fabric tiled and multiplied by shade where mask > threshold
 */
export async function renderInstallImage(input: RenderInput): Promise<RenderResult> {
  const sharpMod = await ensureSharp();
  const sharp = sharpMod.default;

  const maxWidth = input.maxWidth || 1200;
  const fabricScale = input.fabricScale ?? 0.42;

  const templateBuf = await loadBuffer(input.templatePathOrUrl);
  const fabricBuf = await loadBuffer(input.fabricPathOrUrl);

  const template = sharp(templateBuf).ensureAlpha();
  const tMeta = await template.metadata();
  let tw = tMeta.width || 800;
  let th = tMeta.height || 600;
  if (tw > maxWidth) {
    th = Math.round((th * maxWidth) / tw);
    tw = maxWidth;
  }

  const tplRaw = await sharp(templateBuf)
    .resize(tw, th, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Sample fabric at a moderate size for tiling
  const fabSize = Math.max(64, Math.round(tw * fabricScale));
  const fabRaw = await sharp(fabricBuf)
    .resize(fabSize, fabSize, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: td, info: ti } = tplRaw;
  const { data: fd, info: fi } = fabRaw;
  const out = Buffer.alloc(ti.width * ti.height * 4);

  // mean green on keyed pixels
  let sumG = 0;
  let nKey = 0;
  for (let i = 0; i < td.length; i += 4) {
    const r = td[i],
      g = td[i + 1],
      b = td[i + 2];
    if (g - Math.max(r, b) > 25) {
      sumG += g;
      nKey++;
    }
  }
  const meanG = nKey ? sumG / nKey : 128;

  for (let y = 0; y < ti.height; y++) {
    for (let x = 0; x < ti.width; x++) {
      const i = (y * ti.width + x) * 4;
      const r = td[i];
      const g = td[i + 1];
      const b = td[i + 2];
      const a = td[i + 3];

      const key = Math.max(0, Math.min(1, (g - Math.max(r, b) - 10) / 60));
      if (key < 0.05) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = a;
        continue;
      }

      // tile fabric
      const fx = ((x % fi.width) + fi.width) % fi.width;
      const fy = ((y % fi.height) + fi.height) % fi.height;
      const fi4 = (fy * fi.width + fx) * 4;
      let fr = fd[fi4];
      let fg = fd[fi4 + 1];
      let fb = fd[fi4 + 2];

      // fold shading from template green channel
      const shade = Math.pow(Math.max(0.15, g / meanG), 1.05);
      fr = Math.min(255, Math.round(fr * shade));
      fg = Math.min(255, Math.round(fg * shade));
      fb = Math.min(255, Math.round(fb * shade));

      // mix with desaturated original for edges
      const inv = 1 - key;
      out[i] = Math.round(fr * key + r * inv);
      out[i + 1] = Math.round(fg * key + Math.min(g, Math.max(r, b)) * inv);
      out[i + 2] = Math.round(fb * key + b * inv);
      out[i + 3] = a;
    }
  }

  const fileName = `install-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  const filePath = path.join(input.outDir, fileName);
  fs.mkdirSync(input.outDir, { recursive: true });

  await sharp(out, { raw: { width: ti.width, height: ti.height, channels: 4 } })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(filePath);

  return {
    filePath,
    publicPath: `/uploads/${fileName}`,
    width: ti.width,
    height: ti.height,
  };
}

/** Map category_slug / subcategory → render template style key */
export function styleFromModel(model: {
  categorySlug?: string | null;
  subcategory?: string | null;
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
