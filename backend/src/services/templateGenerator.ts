/**
 * Procedural green-screen (chroma) install templates — 100% local, no external AI.
 * Room + green curtain region per mechanism so installEngine can composite fabric photos.
 */
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CurtainStyleKey } from "../lib/curtainStyles.js";

async function getSharp() {
  const mod = await import("sharp");
  return mod.default;
}

const W = 1400;
const H = 1050;

/** Soft green key RGB — chroma-friendly (not pure #00FF00) */
function greenShade(shade: number): [number, number, number] {
  const s = Math.max(0, Math.min(1, shade));
  const g = Math.round(130 + s * 100);
  const r = Math.round(18 + s * 28);
  const b = Math.round(28 + s * 22);
  return [r, g, b];
}

function clamp(v: number, a = 0, b = 255) {
  return v < a ? a : v > b ? b : (v | 0);
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

/**
 * Paint green fabric region with fold lighting for the compositor.
 */
function paintGreenRegion(
  data: Buffer,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mode: "vertical" | "horizontal" | "bands" | "flat" | "roman"
) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const foldCount = 5;
  const foldH = 1 / foldCount;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let fold = 0.55;

      if (mode === "roman") {
        const fi = Math.min(foldCount - 1, Math.floor(v * foldCount));
        const local = (v - fi * foldH) / foldH;
        const cyl = Math.sin(local * Math.PI);
        fold = 0.28 + 0.55 * cyl;
        fold *= 0.92 + 0.08 * Math.sin(u * Math.PI * 2.2);
        const side = Math.min(u, 1 - u);
        fold *= 0.82 + 0.18 * Math.min(1, side * 6);
        if (v > 0.88) {
          const wave = 0.88 + 0.06 * Math.sin(u * Math.PI * 2);
          if (v > wave) continue;
          fold *= 0.75 + 0.25 * ((wave - v) / 0.08);
        }
      } else if (mode === "vertical") {
        fold = 0.45 + 0.35 * Math.sin(u * Math.PI * 8) + 0.1 * Math.sin(u * Math.PI * 24);
        fold *= 0.85 + 0.15 * (1 - Math.abs(v - 0.5) * 0.4);
      } else if (mode === "horizontal") {
        fold = 0.45 + 0.35 * Math.sin(v * Math.PI * 7) + 0.1 * Math.sin(v * Math.PI * 18);
        fold *= 0.9 + 0.1 * Math.sin(u * Math.PI * 2);
      } else if (mode === "bands") {
        const band = Math.floor(v * 16) % 2;
        fold = band ? 0.78 : 0.32;
        fold += 0.06 * Math.sin(u * Math.PI * 4);
      } else {
        fold = 0.55 + 0.12 * Math.sin(u * 3) * Math.sin(v * 2);
      }

      const edge = Math.min(u, 1 - u, v, 1 - v);
      fold *= 0.78 + 0.22 * Math.min(1, edge * 10);
      fold = Math.max(0.12, Math.min(1, fold));
      const [r, g, b] = greenShade(fold);
      setPx(data, width, x, y, r, g, b);
    }
  }
}

function paintRoom(data: Buffer, width: number, height: number) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = y / height;
      const wall = 228 - v * 18;
      const noise = ((x * 13 + y * 7) % 5) - 2;
      setPx(data, width, x, y, clamp(wall + noise), clamp(wall - 2 + noise), clamp(wall - 6 + noise));
    }
  }

  const marginX = Math.floor(width * 0.14);
  const marginTop = Math.floor(height * 0.1);
  const marginBot = Math.floor(height * 0.18);
  const fx0 = marginX;
  const fx1 = width - marginX;
  const fy0 = marginTop;
  const fy1 = height - marginBot;
  const frame = 28;

  for (let y = fy0 - frame; y < fy1 + 8; y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const inInner = x >= fx0 && x < fx1 && y >= fy0 && y < fy1;
      if (inInner) continue;
      setPx(data, width, x, y, 52, 48, 44);
    }
  }

  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      const t = (y - fy0) / Math.max(1, fy1 - fy0);
      setPx(data, width, x, y, clamp(150 + t * 20), clamp(165 + t * 15), clamp(175 + t * 10));
    }
  }

  for (let y = fy1; y < fy1 + 22 && y < height; y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width) continue;
      setPx(data, width, x, y, 90, 85, 78);
    }
  }

  return { fx0, fx1, fy0, fy1, frame };
}

function regionsForStyle(
  style: CurtainStyleKey,
  fx0: number,
  fx1: number,
  fy0: number,
  fy1: number,
  _frame: number
) {
  const mid = Math.floor((fx0 + fx1) / 2);
  const w = fx1 - fx0;
  const innerL = fx0 + 6;
  const innerR = fx1 - 6;
  const innerT = fy0 + 4;
  const innerB = fy1 - 4;

  switch (style) {
    case "drape":
      return [
        { x0: innerL - 40, y0: innerT - 10, x1: mid - 8, y1: innerB + 20, mode: "vertical" as const },
        { x0: mid + 8, y0: innerT - 10, x1: innerR + 40, y1: innerB + 20, mode: "vertical" as const },
      ];
    case "panel":
      return [
        { x0: innerL, y0: innerT, x1: innerL + Math.floor(w * 0.32), y1: innerB, mode: "flat" as const },
        { x0: mid - Math.floor(w * 0.16), y0: innerT, x1: mid + Math.floor(w * 0.16), y1: innerB, mode: "flat" as const },
        { x0: innerR - Math.floor(w * 0.32), y0: innerT, x1: innerR, y1: innerB, mode: "flat" as const },
      ];
    case "roman":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "roman" as const }];
    case "zebra":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "bands" as const }];
    case "pleated-manual":
    case "pleated-chain":
    case "pleated-sheer":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "vertical" as const }];
    case "shade":
    case "double":
      return [
        {
          x0: innerL,
          y0: innerT,
          x1: innerR,
          y1: Math.floor(innerT + (innerB - innerT) * 0.55),
          mode: "flat" as const,
        },
      ];
    case "roller":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "horizontal" as const }];
    default:
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "vertical" as const }];
  }
}

export async function generateChromaTemplate(
  style: CurtainStyleKey,
  outDir: string
): Promise<{ publicPath: string; filePath: string; width: number; height: number }> {
  const sharp = await getSharp();
  const data = Buffer.alloc(W * H * 4);
  const { fx0, fx1, fy0, fy1, frame } = paintRoom(data, W, H);
  const regions = regionsForStyle(style, fx0, fx1, fy0, fy1, frame);
  for (const r of regions) {
    paintGreenRegion(data, W, H, r.x0, r.y0, r.x1, r.y1, r.mode);
  }

  const barY0 = fy0 - 14;
  const barY1 = fy0 + 8;
  for (let y = Math.max(0, barY0); y < Math.min(H, barY1); y++) {
    for (let x = fx0 - 24; x < fx1 + 24; x++) {
      if (x < 0 || x >= W) continue;
      const t = (y - barY0) / Math.max(1, barY1 - barY0);
      setPx(data, W, x, y, clamp(190 - t * 30), clamp(155 - t * 25), clamp(60 - t * 10));
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `template-${style}-${Date.now()}-${randomUUID().slice(0, 6)}.jpg`;
  const filePath = path.join(outDir, fileName);

  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(filePath);

  return {
    filePath,
    publicPath: `/uploads/${fileName}`,
    width: W,
    height: H,
  };
}

export async function writeDefaultRomanTemplate(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const gen = await generateChromaTemplate("roman", dir);
  if (gen.filePath !== filePath) {
    fs.renameSync(gen.filePath, filePath);
  }
  return filePath;
}
