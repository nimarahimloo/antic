/**
 * Product-shot chroma templates — match catalog photography quality.
 * Beige wall, white frame, headrail, folds, chain. Green only on fabric
 * so installEngine can map real fabric swatches with fold lighting.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CurtainStyleKey } from "../lib/curtainStyles.js";

async function getSharp() {
  const mod = await import("sharp");
  return mod.default;
}

const W = 1200;
const H = 1600;

function clamp(v: number, a = 0, b = 255) {
  return v < a ? a : v > b ? b : v | 0;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

function setPx(data: Buffer, width: number, x: number, y: number, r: number, g: number, b: number, a = 255) {
  if (x < 0 || y < 0 || x >= width) return;
  const i = (y * width + x) * 4;
  if (i + 3 >= data.length) return;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function greenShade(shade: number): [number, number, number] {
  const s = clamp01(shade);
  return [
    Math.round(22 + s * 32),
    Math.round(118 + s * 110),
    Math.round(30 + s * 28),
  ];
}

function paintWallAndFloor(data: Buffer, width: number, height: number) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = y / height;
      const u = x / width;
      const base = 214 - v * 14 - Math.abs(u - 0.5) * 8;
      const noise = ((x * 17 + y * 11) % 7) - 3;
      setPx(data, width, x, y, clamp(base + noise), clamp(base - 3 + noise), clamp(base - 10 + noise));
    }
  }
  const floorY = Math.floor(height * 0.9);
  for (let y = floorY; y < height; y++) {
    const t = (y - floorY) / Math.max(1, height - floorY);
    for (let x = 0; x < width; x++) {
      const plank = Math.floor(x / 42) % 2;
      const wood = 150 - t * 18 - plank * 8 + ((x + y) % 5);
      setPx(data, width, x, y, clamp(wood + 12), clamp(wood - 5), clamp(wood - 30));
    }
  }
  for (let y = floorY - 10; y < floorY; y++) {
    for (let x = 0; x < width; x++) {
      setPx(data, width, x, y, 232, 226, 216);
    }
  }
}

type FrameBox = { fx0: number; fx1: number; fy0: number; fy1: number; frame: number };

function paintWhiteFrame(data: Buffer, width: number, height: number, box: FrameBox) {
  const { fx0, fx1, fy0, fy1, frame } = box;
  for (let y = fy0 - frame; y < fy1 + Math.floor(frame * 0.35); y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const inInner = x >= fx0 && x < fx1 && y >= fy0 && y < fy1;
      if (inInner) continue;
      const dx = Math.min(x - (fx0 - frame), fx1 + frame - x);
      const dy = Math.min(y - (fy0 - frame), fy1 + frame * 0.35 - y);
      const edge = Math.min(dx, dy);
      const shade = 0.92 + 0.08 * smoothstep(0, 8, edge);
      const c = Math.round(248 * shade);
      setPx(data, width, x, y, c, c, Math.round(c * 0.99));
    }
  }
  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      const t = (y - fy0) / Math.max(1, fy1 - fy0);
      const light = 0.88 + 0.08 * (1 - Math.abs((x - (fx0 + fx1) / 2) / ((fx1 - fx0) / 2)));
      setPx(data, width, x, y, clamp(210 * light + t * 8), clamp(218 * light + t * 6), clamp(228 * light));
    }
  }
  const mid = Math.floor((fx0 + fx1) / 2);
  for (let y = fy0; y < fy1; y++) {
    for (let x = mid - 8; x < mid + 8; x++) {
      setPx(data, width, x, y, 250, 250, 248);
    }
  }
  const hy = Math.floor(fy0 + (fy1 - fy0) * 0.48);
  for (const hx of [mid - 22, mid + 14]) {
    for (let y = hy; y < hy + 28; y++) {
      for (let x = hx; x < hx + 8; x++) {
        setPx(data, width, x, y, 240, 240, 238);
      }
    }
  }
  for (let y = fy1; y < fy1 + 18 && y < height; y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width) continue;
      const t = (y - fy1) / 18;
      setPx(data, width, x, y, clamp(245 - t * 15), clamp(245 - t * 15), clamp(242 - t * 12));
    }
  }
}

function paintHeadrail(data: Buffer, width: number, height: number, x0: number, x1: number, y0: number, y1: number) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const t = (y - y0) / Math.max(1, y1 - y0);
      const edge = Math.min(x - x0, x1 - x);
      const shade = 0.97 - t * 0.06 + 0.03 * smoothstep(0, 6, edge);
      const c = Math.round(252 * shade);
      setPx(data, width, x, y, c, c, Math.round(c * 0.99));
    }
  }
  for (let x = x0; x < x1; x++) {
    setPx(data, width, x, y1, 210, 210, 205);
    if (y1 + 1 < height) setPx(data, width, x, y1 + 1, 225, 225, 220);
  }
}

function paintChain(data: Buffer, width: number, height: number, x: number, y0: number, y1: number) {
  for (let y = y0; y < y1; y++) {
    const bead = Math.floor((y - y0) / 7) % 2 === 0;
    const r = bead ? 3 : 1;
    for (let dx = -r; dx <= r; dx++) {
      const px = x + dx;
      if (px < 0 || px >= width) continue;
      setPx(data, width, px, y, 235, 235, 230);
    }
  }
  for (let y = y1; y < Math.min(height, y1 + 10); y++) {
    for (let dx = -4; dx <= 4; dx++) {
      setPx(data, width, x + dx, y, 248, 248, 245);
    }
  }
}

function paintRomanGreen(data: Buffer, width: number, height: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const foldZoneStart = 0.62;
  const foldCount = 4;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let shade = 0.72;
      if (v < foldZoneStart) {
        shade = 0.62 + 0.22 * Math.sin(u * Math.PI);
        shade *= 0.94 + 0.06 * Math.sin(v * Math.PI * 3);
      } else {
        const fv = (v - foldZoneStart) / (1 - foldZoneStart);
        const fi = Math.min(foldCount - 1, Math.floor(fv * foldCount));
        const local = (fv - fi / foldCount) * foldCount;
        const crest = Math.sin(local * Math.PI);
        shade = 0.22 + 0.68 * crest;
        shade *= 0.9 + 0.1 * Math.sin(u * Math.PI * 2.4 + fi);
      }
      const side = Math.min(u, 1 - u);
      shade *= 0.78 + 0.22 * Math.min(1, side * 5);
      if (v > 0.97) {
        const wave = 0.97 + 0.025 * Math.sin(u * Math.PI * 2);
        if (v > wave) continue;
        shade *= 0.7;
      }
      shade = clamp01(shade);
      const [r, g, b] = greenShade(shade);
      setPx(data, width, x, y, r, g, b);
    }
  }
}

function paintPleatedGreen(data: Buffer, width: number, height: number, x0: number, y0: number, x1: number, y1: number, dense = true) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const bands = dense ? 48 : 22;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      const bi = Math.floor(v * bands);
      const local = v * bands - bi;
      const ridge = Math.sin(local * Math.PI);
      let shade = 0.28 + 0.62 * ridge;
      const stitch = Math.abs(((u * 6) % 1) - 0.5);
      if (stitch < 0.04) shade *= 0.85;
      shade *= 0.88 + 0.12 * Math.sin(u * Math.PI);
      const side = Math.min(u, 1 - u);
      shade *= 0.82 + 0.18 * Math.min(1, side * 8);
      shade = clamp01(shade);
      const [r, g, b] = greenShade(shade);
      setPx(data, width, x, y, r, g, b);
    }
  }
}

function paintBandsGreen(data: Buffer, width: number, height: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      const band = Math.floor(v * 14) % 2;
      let shade = band ? 0.78 : 0.34;
      shade += 0.05 * Math.sin(u * Math.PI * 3);
      shade *= 0.88 + 0.12 * Math.sin(u * Math.PI);
      shade = clamp01(shade);
      const [r, g, b] = greenShade(shade);
      setPx(data, width, x, y, r, g, b);
    }
  }
}

function paintFlatGreen(data: Buffer, width: number, height: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let shade = 0.58 + 0.18 * Math.sin(u * Math.PI) + 0.06 * Math.sin(v * Math.PI * 2);
      const side = Math.min(u, 1 - u, v, 1 - v);
      shade *= 0.85 + 0.15 * Math.min(1, side * 10);
      shade = clamp01(shade);
      const [r, g, b] = greenShade(shade);
      setPx(data, width, x, y, r, g, b);
    }
  }
}

function paintVerticalGreen(data: Buffer, width: number, height: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let shade = 0.42 + 0.38 * Math.sin(u * Math.PI * 7) + 0.08 * Math.sin(u * Math.PI * 21);
      shade *= 0.88 + 0.12 * (1 - Math.abs(v - 0.5) * 0.35);
      shade = clamp01(shade);
      const [r, g, b] = greenShade(shade);
      setPx(data, width, x, y, r, g, b);
    }
  }
}

export async function generateChromaTemplate(
  style: CurtainStyleKey,
  outDir: string
): Promise<{ publicPath: string; filePath: string; width: number; height: number }> {
  const sharp = await getSharp();
  const data = Buffer.alloc(W * H * 4);
  paintWallAndFloor(data, W, H);

  const marginX = Math.floor(W * 0.16);
  const marginTop = Math.floor(H * 0.12);
  const marginBot = Math.floor(H * 0.16);
  const box: FrameBox = {
    fx0: marginX,
    fx1: W - marginX,
    fy0: marginTop + 36,
    fy1: H - marginBot,
    frame: 36,
  };
  paintWhiteFrame(data, W, H, box);

  const fabricL = box.fx0 + 4;
  const fabricR = box.fx1 - 4;
  const fabricT = box.fy0 + 2;
  const fabricB = box.fy1 - 2;
  const mid = Math.floor((fabricL + fabricR) / 2);

  const railY0 = fabricT - 28;
  const railY1 = fabricT + 4;
  paintHeadrail(data, W, H, fabricL - 20, fabricR + 20, railY0, railY1);

  switch (style) {
    case "roman":
      paintRomanGreen(data, W, H, fabricL, fabricT + 6, fabricR, fabricB);
      paintChain(data, W, H, fabricR + 14, railY1, Math.floor(fabricB - 40));
      break;
    case "pleated-manual":
    case "pleated-chain":
    case "pleated-sheer":
      paintPleatedGreen(data, W, H, fabricL, fabricT + 4, fabricR, fabricB, true);
      paintChain(data, W, H, fabricL - 18, railY1, Math.floor(fabricB - 20));
      break;
    case "zebra":
      paintBandsGreen(data, W, H, fabricL, fabricT + 4, fabricR, fabricB);
      paintChain(data, W, H, fabricR + 14, railY1, Math.floor(fabricB - 30));
      break;
    case "shade":
    case "double":
      paintFlatGreen(data, W, H, fabricL, fabricT + 4, fabricR, Math.floor(fabricT + (fabricB - fabricT) * 0.62));
      paintChain(data, W, H, fabricR + 14, railY1, Math.floor(fabricB - 80));
      break;
    case "roller":
      paintPleatedGreen(data, W, H, fabricL, fabricT + 4, fabricR, fabricB, false);
      paintChain(data, W, H, fabricL - 18, railY1, Math.floor(fabricB - 20));
      break;
    case "panel":
      paintFlatGreen(data, W, H, fabricL, fabricT, fabricL + Math.floor((fabricR - fabricL) * 0.3), fabricB);
      paintFlatGreen(data, W, H, mid - Math.floor((fabricR - fabricL) * 0.14), fabricT, mid + Math.floor((fabricR - fabricL) * 0.14), fabricB);
      paintFlatGreen(data, W, H, fabricR - Math.floor((fabricR - fabricL) * 0.3), fabricT, fabricR, fabricB);
      break;
    case "drape":
    case "wave":
    default:
      paintVerticalGreen(data, W, H, fabricL - 30, fabricT - 4, mid - 6, fabricB + 30);
      paintVerticalGreen(data, W, H, mid + 6, fabricT - 4, fabricR + 30, fabricB + 30);
      break;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `template-${style}-${Date.now()}-${randomUUID().slice(0, 6)}.jpg`;
  const filePath = path.join(outDir, fileName);
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .jpeg({ quality: 94, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(filePath);
  return { filePath, publicPath: `/uploads/${fileName}`, width: W, height: H };
}

export async function writeDefaultRomanTemplate(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const gen = await generateChromaTemplate("roman", dir);
  if (gen.filePath !== filePath) fs.renameSync(gen.filePath, filePath);
  return filePath;
}
