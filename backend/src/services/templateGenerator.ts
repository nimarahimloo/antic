/**
 * Per-mechanism product-shot chroma templates.
 * Each CurtainStyleKey has its own geometry, folds, and hardware
 * (rod vs cassette, chain side, fold axis, panel count).
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
  return [Math.round(22 + s * 32), Math.round(118 + s * 110), Math.round(30 + s * 28)];
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
    for (let x = 0; x < width; x++) setPx(data, width, x, y, 232, 226, 216);
  }
}

type FrameBox = { fx0: number; fx1: number; fy0: number; fy1: number; frame: number };

function paintWhiteFrame(data: Buffer, width: number, height: number, box: FrameBox) {
  const { fx0, fx1, fy0, fy1, frame } = box;
  for (let y = fy0 - frame; y < fy1 + Math.floor(frame * 0.35); y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (x >= fx0 && x < fx1 && y >= fy0 && y < fy1) continue;
      const dx = Math.min(x - (fx0 - frame), fx1 + frame - x);
      const dy = Math.min(y - (fy0 - frame), fy1 + frame * 0.35 - y);
      const shade = 0.92 + 0.08 * smoothstep(0, 8, Math.min(dx, dy));
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
    for (let x = mid - 8; x < mid + 8; x++) setPx(data, width, x, y, 250, 250, 248);
  }
  const hy = Math.floor(fy0 + (fy1 - fy0) * 0.48);
  for (const hx of [mid - 22, mid + 14]) {
    for (let y = hy; y < hy + 28; y++) {
      for (let x = hx; x < hx + 8; x++) setPx(data, width, x, y, 240, 240, 238);
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

function paintCassette(data: Buffer, width: number, height: number, x0: number, x1: number, y0: number, y1: number) {
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

function paintRod(data: Buffer, width: number, height: number, x0: number, x1: number, y: number) {
  const rodY0 = y - 6;
  const rodY1 = y + 6;
  for (let yy = rodY0; yy < rodY1; yy++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || x >= width || yy < 0 || yy >= height) continue;
      const t = (yy - rodY0) / Math.max(1, rodY1 - rodY0);
      const c = Math.round(200 - t * 25);
      setPx(data, width, x, yy, c, Math.round(c * 0.92), Math.round(c * 0.55));
    }
  }
  for (const fx of [x0 - 8, x1 + 8]) {
    for (let yy = y - 10; yy < y + 10; yy++) {
      for (let xx = fx - 10; xx < fx + 10; xx++) {
        const dx = xx - fx;
        const dy = yy - y;
        if (dx * dx + dy * dy < 100) setPx(data, width, xx, yy, 190, 170, 90);
      }
    }
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
    for (let dx = -4; dx <= 4; dx++) setPx(data, width, x + dx, y, 248, 248, 245);
  }
}

function paintBottomBar(data: Buffer, width: number, height: number, x0: number, x1: number, y: number) {
  for (let yy = y; yy < y + 10 && yy < height; yy++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || x >= width) continue;
      setPx(data, width, x, yy, 235, 235, 230);
    }
  }
}

function paintRoman(data: Buffer, w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const foldStart = 0.62;
  const folds = 4;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let shade: number;
      if (v < foldStart) {
        shade = 0.62 + 0.22 * Math.sin(u * Math.PI);
        shade *= 0.94 + 0.06 * Math.sin(v * Math.PI * 3);
      } else {
        const fv = (v - foldStart) / (1 - foldStart);
        const fi = Math.min(folds - 1, Math.floor(fv * folds));
        const local = (fv - fi / folds) * folds;
        shade = 0.22 + 0.68 * Math.sin(local * Math.PI);
        shade *= 0.9 + 0.1 * Math.sin(u * Math.PI * 2.4 + fi);
      }
      const side = Math.min(u, 1 - u);
      shade *= 0.78 + 0.22 * Math.min(1, side * 5);
      if (v > 0.97) {
        const wave = 0.97 + 0.025 * Math.sin(u * Math.PI * 2);
        if (v > wave) continue;
        shade *= 0.7;
      }
      const [r, g, b] = greenShade(clamp01(shade));
      setPx(data, w, x, y, r, g, b);
    }
  }
}

function paintZebra(data: Buffer, w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const bands = 16;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      const band = Math.floor(v * bands) % 2;
      let shade = band ? 0.82 : 0.28;
      shade += 0.04 * Math.sin(u * Math.PI * 2);
      shade *= 0.9 + 0.1 * Math.sin(u * Math.PI);
      const [r, g, b] = greenShade(clamp01(shade));
      setPx(data, w, x, y, r, g, b);
    }
  }
}

function paintPleated(
  data: Buffer,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts: { dense?: boolean; sheer?: boolean } = {}
) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const bands = opts.dense === false ? 20 : 48;
  const sheerBoost = opts.sheer ? 0.12 : 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      const local = v * bands - Math.floor(v * bands);
      let shade = 0.28 + 0.62 * Math.sin(local * Math.PI) + sheerBoost;
      const stitch = Math.abs(((u * 5) % 1) - 0.5);
      if (stitch < 0.035) shade *= 0.82;
      shade *= 0.88 + 0.12 * Math.sin(u * Math.PI);
      const side = Math.min(u, 1 - u);
      shade *= 0.82 + 0.18 * Math.min(1, side * 8);
      const [r, g, b] = greenShade(clamp01(shade));
      setPx(data, w, x, y, r, g, b);
    }
  }
}

function paintRoller(data: Buffer, w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const slats = 28;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      const local = v * slats - Math.floor(v * slats);
      let shade = 0.35 + 0.55 * (1 - local);
      shade *= 0.9 + 0.1 * Math.sin(u * Math.PI);
      if (local < 0.08) shade *= 0.55;
      const [r, g, b] = greenShade(clamp01(shade));
      setPx(data, w, x, y, r, g, b);
    }
  }
}

function paintShade(data: Buffer, w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let shade = 0.58 + 0.2 * Math.sin(u * Math.PI) + 0.05 * Math.sin(v * Math.PI * 2);
      const side = Math.min(u, 1 - u, v, 1 - v);
      shade *= 0.85 + 0.15 * Math.min(1, side * 10);
      const [r, g, b] = greenShade(clamp01(shade));
      setPx(data, w, x, y, r, g, b);
    }
  }
}

function paintPanel(data: Buffer, w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const total = x1 - x0;
  const gap = Math.floor(total * 0.04);
  const pw = Math.floor((total - gap * 2) / 3);
  const starts = [x0, x0 + pw + gap, x0 + 2 * (pw + gap)];
  for (const sx of starts) paintShade(data, w, h, sx, y0, sx + pw, y1);
}

function paintDrape(data: Buffer, w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const mid = Math.floor((x0 + x1) / 2);
  const gap = 12;
  for (const [L, R] of [
    [x0, mid - gap],
    [mid + gap, x1],
  ] as const) {
    const rw = Math.max(1, R - L);
    const rh = Math.max(1, y1 - y0);
    for (let y = y0; y < y1; y++) {
      for (let x = L; x < R; x++) {
        const u = (x - L) / rw;
        const v = (y - y0) / rh;
        let shade = 0.4 + 0.4 * Math.sin(u * Math.PI * 6) + 0.08 * Math.sin(u * Math.PI * 18);
        shade *= 0.88 + 0.12 * (1 - Math.abs(v - 0.45) * 0.4);
        if (v < 0.08) shade *= 0.75 + 0.25 * (v / 0.08);
        const [r, g, b] = greenShade(clamp01(shade));
        setPx(data, w, x, y, r, g, b);
      }
    }
  }
}

function paintWave(data: Buffer, w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let shade = 0.42 + 0.42 * Math.sin(u * Math.PI * 5);
      shade *= 0.9 + 0.1 * (1 - Math.abs(v - 0.5) * 0.3);
      if (v < 0.06) shade *= 0.8;
      const [r, g, b] = greenShade(clamp01(shade));
      setPx(data, w, x, y, r, g, b);
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
  const railY0 = fabricT - 28;
  const railY1 = fabricT + 4;

  switch (style) {
    case "roman":
      paintCassette(data, W, H, fabricL - 20, fabricR + 20, railY0, railY1);
      paintRoman(data, W, H, fabricL, fabricT + 6, fabricR, fabricB);
      paintChain(data, W, H, fabricR + 14, railY1, Math.floor(fabricB - 40));
      break;
    case "zebra":
      paintCassette(data, W, H, fabricL - 20, fabricR + 20, railY0, railY1);
      paintZebra(data, W, H, fabricL, fabricT + 4, fabricR, fabricB);
      paintChain(data, W, H, fabricR + 14, railY1, Math.floor(fabricB - 30));
      break;
    case "pleated-manual":
      paintCassette(data, W, H, fabricL - 16, fabricR + 16, railY0, railY1);
      paintPleated(data, W, H, fabricL, fabricT + 4, fabricR, fabricB, { dense: true });
      break;
    case "pleated-chain":
      paintCassette(data, W, H, fabricL - 16, fabricR + 16, railY0, railY1);
      paintPleated(data, W, H, fabricL, fabricT + 4, fabricR, fabricB, { dense: true });
      paintChain(data, W, H, fabricL - 18, railY1, Math.floor(fabricB - 20));
      break;
    case "pleated-sheer":
      paintCassette(data, W, H, fabricL - 16, fabricR + 16, railY0, railY1);
      paintPleated(data, W, H, fabricL, fabricT + 4, fabricR, fabricB, { dense: true, sheer: true });
      paintChain(data, W, H, fabricL - 18, railY1, Math.floor(fabricB - 20));
      break;
    case "shade": {
      paintCassette(data, W, H, fabricL - 20, fabricR + 20, railY0, railY1);
      const drop = Math.floor(fabricT + (fabricB - fabricT) * 0.62);
      paintShade(data, W, H, fabricL, fabricT + 4, fabricR, drop);
      paintBottomBar(data, W, H, fabricL, fabricR, drop);
      paintChain(data, W, H, fabricR + 14, railY1, drop + 20);
      break;
    }
    case "double": {
      paintCassette(data, W, H, fabricL - 22, fabricR + 22, railY0, railY1);
      paintPleated(data, W, H, fabricL + 6, fabricT + 4, fabricR - 6, fabricB, { dense: true, sheer: true });
      const drop = Math.floor(fabricT + (fabricB - fabricT) * 0.55);
      paintShade(data, W, H, fabricL, fabricT + 4, fabricR, drop);
      paintBottomBar(data, W, H, fabricL, fabricR, drop);
      paintChain(data, W, H, fabricR + 14, railY1, drop + 20);
      break;
    }
    case "roller":
      paintCassette(data, W, H, fabricL - 16, fabricR + 16, railY0, railY1);
      paintRoller(data, W, H, fabricL, fabricT + 4, fabricR, fabricB);
      paintChain(data, W, H, fabricL - 18, railY1, Math.floor(fabricB - 20));
      break;
    case "panel":
      paintCassette(data, W, H, fabricL - 10, fabricR + 10, fabricT - 14, fabricT + 2);
      paintPanel(data, W, H, fabricL, fabricT + 4, fabricR, fabricB + 20);
      break;
    case "wave":
      paintRod(data, W, H, fabricL - 40, fabricR + 40, fabricT - 8);
      paintWave(data, W, H, fabricL - 20, fabricT, fabricR + 20, fabricB + 40);
      break;
    case "drape":
    default:
      paintRod(data, W, H, fabricL - 50, fabricR + 50, fabricT - 10);
      paintDrape(data, W, H, fabricL - 40, fabricT, fabricR + 40, fabricB + 50);
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
