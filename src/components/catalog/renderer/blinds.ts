import * as THREE from "three";
import { cloth, tube, cylinder } from "@/components/catalog/renderer/mesh";
import { textileMaterial } from "@/components/catalog/renderer/textiles";
import { cassette, chain, bottomRail, seams } from "@/components/catalog/renderer/hardware";

type Parent = THREE.Group | THREE.Mesh | THREE.Object3D;

interface FabricLike {
  color_code?: string | null;
  category_slug?: string | null;
  subcategory?: string | null;
  name?: string | null;
  image?: string | null;
  [key: string]: unknown;
}

interface Settings {
  rail_color?: string;
  frame_color?: string;
}

export function roman(
  group: Parent,
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number
) {
  cassette(group, settings, 2.88, 0.08);
  const material = textileMaterial(fabric, image, scale);
  const stitch = new THREE.MeshStandardMaterial({ color: fabric?.color_code ?? "#d9c7a7", roughness: 0.9 });
  const height = 2.16 * (1 - open);
  const top = 2.84;
  const pitch = 0.34;
  const deform = (u: number, v: number) => {
    const distance = v * height;
    const t = (distance % pitch) / pitch;
    return {
      z: 0.018 * Math.sin(Math.PI * t) + 0.003 * Math.sin(u * 8 + v * 7),
      y: -0.003 * Math.sin(u * Math.PI),
    };
  };
  cloth(group, 2.14, height, -1.07, top, 0.10, deform, material, 160, 120);
  for (let y = top - pitch; y > top - height; y -= pitch) {
    const v = (top - y) / height;
    const points = Array.from({ length: 65 }, (_, i) => {
      const u = i / 64;
      const delta = deform(u, v);
      return [-1.067 + u * 2.134, y + (delta.y || 0), 0.103 + (delta.z || 0)];
    });
    tube(group, points, 0.0013, stitch);
  }
  // Lifted Roman fabric stacks at the LOWER edge; it does not turn into a roller at the top.
  const stack = Math.max(1, Math.round(open * 7));
  for (let i = 0; i < stack; i++) {
    const y = top - height - i * 0.015;
    cloth(
      group,
      2.145,
      0.069,
      -1.0725,
      y + 0.04,
      0.118 + i * 0.006,
      (u, v) => ({ z: 0.021 * Math.sin(v * Math.PI), y: -0.004 * Math.sin(u * Math.PI) }),
      material,
      128,
      16
    );
  }
  seams(group, 2.14, -1.07, top, height, 0.10, deform, stitch);
  chain(group, settings, 1.14, 0.10);
}

export function pleated(
  group: Parent,
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number,
  style: string
) {
  const depth = style === "pleated-manual" ? 0.08 : 0.17;
  cassette(group, settings, 2.88, depth);
  const material = textileMaterial(fabric, image, scale, { sheer: style === "pleated-sheer" });
  const height = 2.16 * (1 - open * 0.92);
  const count = 58;
  // Horizontal accordion pleats, their pitch compresses on lifting while depth stays physical.
  const deform = (u: number, v: number) => ({
    z: 0.016 * (2 / Math.PI * Math.asin(Math.sin(v * count * Math.PI * 2))),
    y: -0.0015 * Math.sin(u * Math.PI),
  });
  cloth(group, 2.14, height, -1.07, 2.84, depth, deform, material, 96, count * 6);
  if (style === "pleated-sheer") {
    cloth(
      group,
      2.14,
      height,
      -1.07,
      2.84,
      depth - 0.034,
      (u, v) => ({ z: -deform(u, v).z }),
      textileMaterial(fabric, image, scale, { sheer: true }),
      64,
      count * 6
    );
  }
  bottomRail(group, settings, 2.84 - height, depth);
  const cord = new THREE.MeshStandardMaterial({ color: "#bfb6a6", roughness: 0.9 });
  for (const x of [-0.82, 0.82])
    tube(group, [[x, 2.84, depth + 0.018], [x, 2.84 - height, depth + 0.018]], 0.0013, cord);
  if (style !== "pleated-manual") chain(group, settings);
}

export function rollerShade(
  group: Parent,
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number,
  double = false
) {
  const top = 2.84;
  cassette(group, settings, 2.89, 0.12);
  const height = 2.16 * (1 - open * 0.92);
  if (double) {
    const rearHeight = 2.16 * (1 - Math.min(0.92, open + 0.25));
    const rear = textileMaterial(fabric, null, scale, { solid: true });
    cloth(group, 2.14, rearHeight, -1.07, top, 0.07, () => ({}), rear);
    bottomRail(group, settings, top - rearHeight, 0.07);
    cassette(group, settings, 2.92, 0.035);
    chain(group, settings, -1.18, 0.07);
  }
  const material = textileMaterial(
    fabric,
    image,
    scale,
    { sheer: double || /screen|اسکرین/.test(`${fabric?.subcategory ?? ""} ${fabric?.name ?? ""}`) }
  );
  const deform = (u: number, v: number) => ({
    z: 0.003 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) + 0.025 * Math.exp(-v * height * 75),
  });
  cloth(group, 2.14, height, -1.07, top, 0.17, deform, material);
  cylinder(group, 0.023, 2.14, [0, top + 0.016, 0.148], material, true);
  bottomRail(group, settings, top - height, 0.17);
  chain(group, settings);
}

export function zebra(
  group: Parent,
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number
) {
  cassette(group, settings, 2.89, 0.1);
  const height = 2.1;
  const rear = textileMaterial(fabric, image, scale, { bands: true });
  const front = textileMaterial(fabric, image, scale, { bands: true, phase: open * 0.12 });
  const deform = (u: number, v: number) => ({ z: 0.002 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) });
  cloth(group, 2.14, height, -1.07, 2.84, 0.07, deform, rear);
  cloth(group, 2.14, height, -1.07, 2.84, 0.105, deform, front);
  cylinder(group, 0.027, 2.14, [0, 2.84 - height, 0.088], front, true);
  bottomRail(group, settings, 2.84 - height - 0.015, 0.09);
  chain(group, settings, 1.15, 0.10);
}

export function venetian(
  group: Parent,
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number
) {
  cassette(group, settings, 2.89, 0.12);
  const material = textileMaterial(fabric, image, scale);
  material.sheen = 0;
  material.roughness = 0.42;
  const count = 34;
  const span = 2.16 * (1 - open * 0.87);
  const pitch = span / count;
  for (let i = 0; i < count; i++) {
    cloth(
      group,
      2.14,
      0.058,
      -1.07,
      2.83 - i * pitch,
      0.12,
      (u, v) => ({ z: Math.sin(v * Math.PI) * 0.009 + v * 0.012 }),
      material,
      32,
      10
    );
  }
  const cord = new THREE.MeshStandardMaterial({ color: "#bcb5a9", roughness: 0.88 });
  for (const x of [-0.74, 0.74]) {
    tube(group, [[x, 2.85, 0.135], [x, 2.84 - span, 0.135]], 0.002, cord);
    for (let i = 0; i < count; i++)
      tube(group, [[x - 0.014, 2.81 - i * pitch, 0.12], [x + 0.014, 2.81 - i * pitch, 0.145]], 0.0011, cord);
  }
  bottomRail(group, settings, 2.84 - span, 0.12);
  chain(group, settings);
}
