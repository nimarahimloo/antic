/**
 * Procedural green-screen (chroma) install templates — no external AI.
 * Creates a room + green curtain region sized for each mechanism so
 * installEngine can composite real fabric photos onto them.
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
const H = 900;

/** Soft green key RGB (chroma-friendly, not pure #00FF00) */
function greenShade(shade: number): [number, number, number] {
  // shade 0..1 → darker/lighter green with slight variation
  const g = Math.round(140 + shade * 90);
  const r = Math.round(20 + shade * 25);
  const b = Math.round(30 + shade * 20);
  return [r, g, b];
}

function clamp(v: number, a = 0, b = 255) {
  return v < a ? a : v > b ? b : v | 0;
}

/** Fill rectangle with green folds (vertical or horizontal stripes + noise) */
function paintGreenRegion(
  data: Buffer,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mode: "vertical" | "horizontal" | "bands" | "flat"
) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let fold = 0.5;
      if (mode === "vertical") {
        // soft vertical pleats
        fold = 0.45 + 0.35 * Math.sin(u * Math.PI * 8) + 0.1 * Math.sin(u * Math.PI * 24);
        fold *= 0.85 + 0.15 * (1 - Math.abs(v - 0.5) * 0.4);
      } else if (mode === "horizontal") {
        fold = 0.45 + 0.35 * Math.sin(v * Math.PI * 6) + 0.08 * Math.sin(v * Math.PI * 18);
      } else if (mode === "bands") {
        // zebra-like horizontal bands
        const band = Math.floor(v * 14) % 2;
        fold = band ? 0.75 : 0.35;
        fold += 0.08 * Math.sin(u * Math.PI * 4);
      } else {
        fold = 0.55 + 0.12 * Math.sin(u * 3) * Math.sin(v * 2);
      }
      // subtle vignette for depth
      const edge = Math.min(u, 1 - u, v, 1 - v);
      fold *= 0.75 + 0.25 * Math.min(1, edge * 8);
      fold = Math.max(0.15, Math.min(1, fold));
      const [r, g, b] = greenShade(fold);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
}

function paintRoom(data: Buffer, width: number, height: number) {
  // wall
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const shade = 0.92 - (y / height) * 0.08;
      data[i] = clamp(118 * shade);
      data[i + 1] = clamp(108 * shade);
      data[i + 2] = clamp(95 * shade);
      data[i + 3] = 255;
    }
  }
  // floor band
  const floorY = Math.floor(height * 0.82);
  for (let y = floorY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const t = (y - floorY) / (height - floorY);
      data[i] = clamp(70 - t * 15);
      data[i + 1] = clamp(58 - t * 12);
      data[i + 2] = clamp(48 - t * 10);
    }
  }
  // window frame (dark wood)
  const fx0 = Math.floor(width * 0.12);
  const fx1 = Math.floor(width * 0.88);
  const fy0 = Math.floor(height * 0.1);
  const fy1 = Math.floor(height * 0.78);
  const frame = 18;
  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      const onFrame =
        x < fx0 + frame ||
        x >= fx1 - frame ||
        y < fy0 + frame ||
        y >= fy1 - frame ||
        (Math.abs(x - (fx0 + fx1) / 2) < frame / 2 && y < fy1 - frame);
      if (onFrame) {
        const i = (y * width + x) * 4;
        data[i] = 55;
        data[i + 1] = 42;
        data[i + 2] = 32;
      } else if (x > fx0 + frame && x < fx1 - frame && y > fy0 + frame && y < fy1 - frame) {
        // glass / sky hint
        const i = (y * width + x) * 4;
        const sky = 0.55 + 0.2 * ((y - fy0) / (fy1 - fy0));
        data[i] = clamp(160 * sky);
        data[i + 1] = clamp(185 * sky);
        data[i + 2] = clamp(210 * sky);
      }
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
  frame: number
): { x0: number; y0: number; x1: number; y1: number; mode: "vertical" | "horizontal" | "bands" | "flat" }[] {
  const innerL = fx0 + frame;
  const innerR = fx1 - frame;
  const innerT = fy0 + frame;
  const innerB = fy1 - frame;
  const mid = Math.floor((innerL + innerR) / 2);
  const w = innerR - innerL;

  switch (style) {
    case "drape":
    case "wave":
      return [
        { x0: innerL - 40, y0: innerT - 10, x1: mid - 8, y1: innerB + 20, mode: "vertical" },
        { x0: mid + 8, y0: innerT - 10, x1: innerR + 40, y1: innerB + 20, mode: "vertical" },
      ];
    case "panel":
      return [
        { x0: innerL, y0: innerT, x1: innerL + Math.floor(w * 0.32), y1: innerB, mode: "flat" },
        { x0: mid - Math.floor(w * 0.16), y0: innerT, x1: mid + Math.floor(w * 0.16), y1: innerB, mode: "flat" },
        { x0: innerR - Math.floor(w * 0.32), y0: innerT, x1: innerR, y1: innerB, mode: "flat" },
      ];
    case "roman":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "horizontal" }];
    case "zebra":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "bands" }];
    case "pleated-manual":
    case "pleated-chain":
    case "pleated-sheer":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "vertical" }];
    case "shade":
    case "double":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: Math.floor(innerT + (innerB - innerT) * 0.55), mode: "flat" }];
    case "roller":
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "horizontal" }];
    default:
      return [{ x0: innerL, y0: innerT, x1: innerR, y1: innerB, mode: "vertical" }];
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

  // rail / casing bar (gold-ish)
  const barY0 = fy0 - 12;
  const barY1 = fy0 + 6;
  for (let y = Math.max(0, barY0); y < Math.min(H, barY1); y++) {
    for (let x = fx0 - 20; x < fx1 + 20; x++) {
      if (x < 0 || x >= W) continue;
      const i = (y * W + x) * 4;
      data[i] = 180;
      data[i + 1] = 145;
      data[i + 2] = 55;
      data[i + 3] = 255;
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
