/**
 * Per-mechanism product-shot chroma templates.
 *
 * Quality target = catalog product photos:
 *  - pleated-manual → horizontal pleats on two casement panes (PX2607)
 *  - pleated-chain  → full-width cellular + top cassette + left chain (PNF1210)
 *  - roman          → half-raised stack + cassette + right pull (Roman80)
 *
 * Green region = fabric mapping area. Frame / cassette / chain stay non-green.
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
  // Strong chroma green so keying is stable
  return [Math.round(18 + s * 28), Math.round(130 + s * 100), Math.round(28 + s * 24)];
}

function paintWallAndFloor(data: Buffer, width: number, height: number) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = y / height;
      const u = x / width;
      // Warm beige wall like product shots
      const base = 218 - v * 12 - Math.abs(u - 0.5) * 6;
      const noise = ((x * 17 + y * 11) % 7) - 3;
      setPx(data, width, x, y, clamp(base + noise), clamp(base - 4 + noise), clamp(base - 14 + noise));
    }
  }
  const floorY = Math.floor(height * 0.9);
  for (let y = floorY; y < height; y++) {
    const t = (y - floorY) / Math.max(1, height - floorY);
    for (let x = 0; x < width; x++) {
      const plank = Math.floor(x / 42) % 2;
      const wood = 155 - t * 16 - plank * 8 + ((x + y) % 5);
      setPx(data, width, x, y, clamp(wood + 18), clamp(wood - 2), clamp(wood - 28));
    }
  }
  for (let y = floorY - 12; y < floorY; y++) {
    for (let x = 0; x < width; x++) setPx(data, width, x, y, 236, 230, 220);
  }
}

type FrameBox = { fx0: number; fx1: number; fy0: number; fy1: number; frame: number };

/** White moulded frame with center mullion + handles (French door look) */
function paintFrenchFrame(data: Buffer, width: number, height: number, box: FrameBox) {
  const { fx0, fx1, fy0, fy1, frame } = box;
  // Outer moulding
  for (let y = fy0 - frame; y < fy1 + Math.floor(frame * 0.4); y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (x >= fx0 && x < fx1 && y >= fy0 && y < fy1) continue;
      const dx = Math.min(x - (fx0 - frame), fx1 + frame - x);
      const dy = Math.min(y - (fy0 - frame), fy1 + frame * 0.4 - y);
      const shade = 0.93 + 0.07 * smoothstep(0, 10, Math.min(dx, dy));
      const c = Math.round(250 * shade);
      setPx(data, width, x, y, c, c, Math.round(c * 0.99));
    }
  }
  // Glass / interior default (light)
  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      const t = (y - fy0) / Math.max(1, fy1 - fy0);
      const light = 0.9 + 0.06 * (1 - Math.abs((x - (fx0 + fx1) / 2) / ((fx1 - fx0) / 2)));
      setPx(data, width, x, y, clamp(215 * light + t * 6), clamp(222 * light + t * 5), clamp(230 * light));
    }
  }
  // Center mullion
  const mid = Math.floor((fx0 + fx1) / 2);
  for (let y = fy0; y < fy1; y++) {
    for (let x = mid - 10; x < mid + 10; x++) setPx(data, width, x, y, 252, 252, 250);
  }
  // Door handles
  const hy = Math.floor(fy0 + (fy1 - fy0) * 0.48);
  for (const hx of [mid - 26, mid + 16]) {
    for (let y = hy; y < hy + 32; y++) {
      for (let x = hx; x < hx + 9; x++) setPx(data, width, x, y, 242, 242, 240);
    }
  }
  // Sill
  for (let y = fy1; y < fy1 + 22 && y < height; y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width) continue;
      const t = (y - fy1) / 22;
      setPx(data, width, x, y, clamp(248 - t * 12), clamp(248 - t * 12), clamp(244 - t * 10));
    }
  }
}

/** Simpler single opening frame (no mullion) — for cassette styles */
function paintSimpleFrame(data: Buffer, width: number, height: number, box: FrameBox) {
  const { fx0, fx1, fy0, fy1, frame } = box;
  for (let y = fy0 - frame; y < fy1 + Math.floor(frame * 0.35); y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (x >= fx0 && x < fx1 && y >= fy0 && y < fy1) continue;
      const dx = Math.min(x - (fx0 - frame), fx1 + frame - x);
      const dy = Math.min(y - (fy0 - frame), fy1 + frame * 0.35 - y);
      const shade = 0.94 + 0.06 * smoothstep(0, 8, Math.min(dx, dy));
      const c = Math.round(248 * shade);
      setPx(data, width, x, y, c, c, Math.round(c * 0.99));
    }
  }
  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      setPx(data, width, x, y, 220, 226, 232);
    }
  }
  for (let y = fy1; y < fy1 + 18 && y < height; y++) {
    for (let x = fx0 - frame; x < fx1 + frame; x++) {
      if (x < 0 || x >= width) continue;
      setPx(data, width, x, y, 242, 242, 238);
    }
  }
}

function paintCassette(data: Buffer, width: number, height: number, x0: number, x1: number, y0: number, y1: number) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const t = (y - y0) / Math.max(1, y1 - y0);
      const edge = Math.min(x - x0, x1 - x);
      const shade = 0.98 - t * 0.07 + 0.03 * smoothstep(0, 6, edge);
      const c = Math.round(252 * shade);
      setPx(data, width, x, y, c, c, Math.round(c * 0.99));
    }
  }
  for (let x = x0; x < x1; x++) {
    setPx(data, width, x, y1, 205, 205, 200);
    if (y1 + 1 < height) setPx(data, width, x, y1 + 1, 228, 228, 222);
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
  // Soft loop at bottom
  for (let y = y1; y < Math.min(height, y1 + 14); y++) {
    const t = (y - y1) / 14;
    const spread = Math.floor(3 + t * 5);
    for (let dx = -spread; dx <= spread; dx++) {
      if (Math.abs(dx) > spread - t * 2) continue;
      setPx(data, width, x + dx, y, 248, 248, 245);
    }
  }
}

function paintPullCord(data: Buffer, width: number, height: number, x: number, y0: number, y1: number) {
  for (let y = y0; y < y1; y++) {
    for (let dx = -1; dx <= 1; dx++) setPx(data, width, x + dx, y, 238, 238, 234);
  }
  // Tassel
  for (let y = y1; y < Math.min(height, y1 + 16); y++) {
    for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx + (y - y1 - 6) * (y - y1 - 6) < 36) setPx(data, width, x + dx, y, 250, 250, 248);
    }
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

/**
 * Roman half-raised (Roman80): flat body + stacked folds at bottom third,
 * window glass visible below fabric.
 */
function paintRomanHalfRaised(
  data: Buffer,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  dropY: number
) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, dropY - y0);
  const foldStart = 0.55;
  const folds = 4;
  for (let y = y0; y < dropY; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      let shade: number;
      if (v < foldStart) {
        // Flat linen body with soft center light
        shade = 0.68 + 0.14 * Math.sin(u * Math.PI);
        shade *= 0.96 + 0.04 * Math.sin(v * Math.PI * 2);
      } else {
        const fv = (v - foldStart) / (1 - foldStart);
        const fi = Math.min(folds - 1, Math.floor(fv * folds));
        const local = (fv - fi / folds) * folds;
        shade = 0.28 + 0.62 * Math.sin(local * Math.PI);
        shade *= 0.88 + 0.12 * Math.sin(u * Math.PI * 2 + fi * 0.4);
      }
      const side = Math.min(u, 1 - u);
      shade *= 0.8 + 0.2 * Math.min(1, side * 6);
      // Soft hem wave
      if (v > 0.97) {
        const wave = 0.97 + 0.02 * Math.sin(u * Math.PI * 2);
        if (v > wave) continue;
        shade *= 0.75;
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

/**
 * Dense horizontal accordion (cellular/pleated).
 * bands ≈ real product density; optional vertical stitch columns like PX2607.
 */
function paintPleated(
  data: Buffer,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opts: { dense?: boolean; sheer?: boolean; stitches?: boolean } = {}
) {
  const rw = Math.max(1, x1 - x0);
  const rh = Math.max(1, y1 - y0);
  const bands = opts.dense === false ? 28 : 56;
  const sheerBoost = opts.sheer ? 0.1 : 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / rw;
      const v = (y - y0) / rh;
      const local = v * bands - Math.floor(v * bands);
      // Ridge light / valley dark like real pleat photo
      let shade = 0.22 + 0.7 * Math.sin(local * Math.PI) + sheerBoost;
      if (opts.stitches) {
        // 2–3 vertical cord columns
        const col = Math.abs(((u * 3.2) % 1) - 0.5);
        if (col < 0.018) shade *= 0.78;
      }
      shade *= 0.9 + 0.1 * Math.sin(u * Math.PI);
      const side = Math.min(u, 1 - u);
      shade *= 0.85 + 0.15 * Math.min(1, side * 10);
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

  const marginX = Math.floor(W * 0.15);
  const marginTop = Math.floor(H * 0.11);
  const marginBot = Math.floor(H * 0.15);
  const box: FrameBox = {
    fx0: marginX,
    fx1: W - marginX,
    fy0: marginTop + 40,
    fy1: H - marginBot,
    frame: 40,
  };

  const fabricL = box.fx0 + 6;
  const fabricR = box.fx1 - 6;
  const fabricT = box.fy0 + 4;
  const fabricB = box.fy1 - 4;
  const mid = Math.floor((box.fx0 + box.fx1) / 2);
  const mullionHalf = 10;

  switch (style) {
    case "roman": {
      // Roman80: simple frame, cassette, half-raised body, glass below, pull on right
      paintSimpleFrame(data, W, H, box);
      const railY0 = fabricT - 32;
      const railY1 = fabricT + 6;
      paintCassette(data, W, H, fabricL - 24, fabricR + 24, railY0, railY1);
      const drop = Math.floor(fabricT + (fabricB - fabricT) * 0.58);
      paintRomanHalfRaised(data, W, H, fabricL, fabricT + 8, fabricR, drop);
      paintPullCord(data, W, H, fabricR + 18, railY1, Math.floor(drop + 30));
      break;
    }
    case "zebra":
      paintSimpleFrame(data, W, H, box);
      paintCassette(data, W, H, fabricL - 20, fabricR + 20, fabricT - 28, fabricT + 4);
      paintZebra(data, W, H, fabricL, fabricT + 6, fabricR, fabricB);
      paintChain(data, W, H, fabricR + 14, fabricT + 6, Math.floor(fabricB - 30));
      break;

    case "pleated-manual": {
      // PX2607: French doors, pleats fill EACH pane, no top cassette
      paintFrenchFrame(data, W, H, box);
      const inset = 4;
      // Left pane
      paintPleated(
        data,
        W,
        H,
        box.fx0 + inset,
        box.fy0 + inset,
        mid - mullionHalf - 2,
        box.fy1 - inset,
        { dense: true, stitches: true }
      );
      // Right pane
      paintPleated(
        data,
        W,
        H,
        mid + mullionHalf + 2,
        box.fy0 + inset,
        box.fx1 - inset,
        box.fy1 - inset,
        { dense: true, stitches: true }
      );
      break;
    }

    case "pleated-chain": {
      // PNF1210: single opening, top cassette, full-width dense horizontal, chain LEFT with loop
      paintSimpleFrame(data, W, H, box);
      paintCassette(data, W, H, fabricL - 18, fabricR + 18, fabricT - 30, fabricT + 6);
      paintPleated(data, W, H, fabricL, fabricT + 8, fabricR, fabricB - 4, { dense: true });
      paintBottomBar(data, W, H, fabricL, fabricR, fabricB - 8);
      paintChain(data, W, H, fabricL - 22, fabricT + 8, Math.floor(fabricB - 10));
      break;
    }

    case "pleated-sheer":
      paintSimpleFrame(data, W, H, box);
      paintCassette(data, W, H, fabricL - 16, fabricR + 16, fabricT - 28, fabricT + 4);
      paintPleated(data, W, H, fabricL, fabricT + 6, fabricR, fabricB, { dense: true, sheer: true });
      paintChain(data, W, H, fabricL - 18, fabricT + 6, Math.floor(fabricB - 20));
      break;

    case "shade": {
      paintSimpleFrame(data, W, H, box);
      paintCassette(data, W, H, fabricL - 20, fabricR + 20, fabricT - 28, fabricT + 4);
      const drop = Math.floor(fabricT + (fabricB - fabricT) * 0.7);
      paintShade(data, W, H, fabricL, fabricT + 6, fabricR, drop);
      paintBottomBar(data, W, H, fabricL, fabricR, drop);
      paintChain(data, W, H, fabricR + 14, fabricT + 6, drop + 20);
      break;
    }
    case "double": {
      paintSimpleFrame(data, W, H, box);
      paintCassette(data, W, H, fabricL - 22, fabricR + 22, fabricT - 28, fabricT + 4);
      paintPleated(data, W, H, fabricL + 6, fabricT + 6, fabricR - 6, fabricB, {
        dense: true,
        sheer: true,
      });
      const drop = Math.floor(fabricT + (fabricB - fabricT) * 0.55);
      paintShade(data, W, H, fabricL, fabricT + 6, fabricR, drop);
      paintBottomBar(data, W, H, fabricL, fabricR, drop);
      paintChain(data, W, H, fabricR + 14, fabricT + 6, drop + 20);
      break;
    }
    case "roller":
      paintSimpleFrame(data, W, H, box);
      paintCassette(data, W, H, fabricL - 16, fabricR + 16, fabricT - 28, fabricT + 4);
      paintRoller(data, W, H, fabricL, fabricT + 6, fabricR, fabricB);
      paintChain(data, W, H, fabricL - 18, fabricT + 6, Math.floor(fabricB - 20));
      break;
    case "panel":
      paintSimpleFrame(data, W, H, box);
      paintCassette(data, W, H, fabricL - 10, fabricR + 10, fabricT - 14, fabricT + 2);
      paintPanel(data, W, H, fabricL, fabricT + 4, fabricR, fabricB + 20);
      break;
    case "wave":
      paintFrenchFrame(data, W, H, box);
      paintRod(data, W, H, fabricL - 40, fabricR + 40, fabricT - 8);
      paintWave(data, W, H, fabricL - 20, fabricT, fabricR + 20, fabricB + 40);
      break;
    case "drape":
    default:
      paintFrenchFrame(data, W, H, box);
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
