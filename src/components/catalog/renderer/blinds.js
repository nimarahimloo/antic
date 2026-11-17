import * as THREE from 'three';
import { cloth, tube, cylinder } from '@/components/catalog/renderer/mesh';
import { textileMaterial } from '@/components/catalog/renderer/textiles';
import { cassette, chain, bottomRail, seams } from '@/components/catalog/renderer/hardware';

export function roman(group, fabric, image, settings, open, scale) {
  cassette(group, settings, 2.88, .08);
  const material = textileMaterial(fabric, image, scale);
  const stitch = new THREE.MeshStandardMaterial({ color: fabric.color_code || '#d9c7a7', roughness: .9 });
  const height = 2.16 * (1 - open), top = 2.84, pitch = .34;
  const deform = (u, v) => {
    const distance = v * height;
    const t = (distance % pitch) / pitch;
    return { z: .018 * Math.sin(Math.PI * t) + .003 * Math.sin(u * 8 + v * 7), y: -.003 * Math.sin(u * Math.PI) };
  };
  cloth(group, 2.14, height, -1.07, top, .10, deform, material, 160, 120);
  for (let y = top - pitch; y > top - height; y -= pitch) {
    const v = (top - y) / height;
    const points = Array.from({ length: 65 }, (_, i) => {
      const u = i / 64, delta = deform(u, v);
      return [-1.067 + u * 2.134, y + (delta.y || 0), .103 + delta.z];
    });
    tube(group, points, .0013, stitch);
  }
  // Lifted Roman fabric stacks at the LOWER edge; it does not turn into a roller at the top.
  const stack = Math.max(1, Math.round(open * 7));
  for (let i = 0; i < stack; i++) {
    const y = top - height - i * .015;
    cloth(group, 2.145, .069, -1.0725, y + .04, .118 + i * .006, (u, v) => ({ z: .021 * Math.sin(v * Math.PI), y: -.004 * Math.sin(u * Math.PI) }), material, 128, 16);
  }
  seams(group, 2.14, -1.07, top, height, .10, deform, stitch);
  chain(group, settings, 1.14, .10);
}

export function pleated(group, fabric, image, settings, open, scale, style) {
  const depth = style === 'pleated-manual' ? .08 : .17;
  cassette(group, settings, 2.88, depth);
  const material = textileMaterial(fabric, image, scale, { sheer: style === 'pleated-sheer' });
  const height = 2.16 * (1 - open * .92), count = 58;
  // Horizontal accordion pleats, their pitch compresses on lifting while depth stays physical.
  const deform = (u, v) => ({ z: .016 * (2 / Math.PI * Math.asin(Math.sin(v * count * Math.PI * 2))), y: -.0015 * Math.sin(u * Math.PI) });
  cloth(group, 2.14, height, -1.07, 2.84, depth, deform, material, 96, count * 6);
  if (style === 'pleated-sheer') {
    cloth(group, 2.14, height, -1.07, 2.84, depth - .034, (u, v) => ({ z: -deform(u, v).z }), textileMaterial(fabric, image, scale, { sheer: true }), 64, count * 6);
  }
  bottomRail(group, settings, 2.84 - height, depth);
  const cord = new THREE.MeshStandardMaterial({ color: '#bfb6a6', roughness: .9 });
  for (const x of [-.82, .82]) tube(group, [[x, 2.84, depth + .018], [x, 2.84 - height, depth + .018]], .0013, cord);
  if (style !== 'pleated-manual') chain(group, settings);
}

export function rollerShade(group, fabric, image, settings, open, scale, double = false) {
  const top = 2.84;
  cassette(group, settings, 2.89, .12);
  const height = 2.16 * (1 - open * .92);
  if (double) {
    const rearHeight = 2.16 * (1 - Math.min(.92, open + .25));
    const rear = textileMaterial(fabric, null, scale, { solid: true });
    cloth(group, 2.14, rearHeight, -1.07, top, .07, () => ({}), rear);
    bottomRail(group, settings, top - rearHeight, .07);
    cassette(group, settings, 2.92, .035);
    chain(group, settings, -1.18, .07);
  }
  const material = textileMaterial(fabric, image, scale, { sheer: double || /screen|اسکرین/.test(`${fabric.subcategory} ${fabric.name}`) });
  const deform = (u, v) => ({ z: .003 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) + .025 * Math.exp(-v * height * 75) });
  cloth(group, 2.14, height, -1.07, top, .17, deform, material);
  cylinder(group, .023, 2.14, [0, top + .016, .148], material, true);
  bottomRail(group, settings, top - height, .17);
  chain(group, settings);
}

export function zebra(group, fabric, image, settings, open, scale) {
  cassette(group, settings, 2.89, .1);
  const height = 2.1;
  const rear = textileMaterial(fabric, image, scale, { bands: true });
  const front = textileMaterial(fabric, image, scale, { bands: true, phase: open * .12 });
  const deform = (u, v) => ({ z: .002 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) });
  cloth(group, 2.14, height, -1.07, 2.84, .07, deform, rear);
  cloth(group, 2.14, height, -1.07, 2.84, .105, deform, front);
  cylinder(group, .027, 2.14, [0, 2.84 - height, .088], front, true);
  bottomRail(group, settings, 2.84 - height - .015, .09);
  chain(group, settings, 1.15, .10);
}

export function venetian(group, fabric, image, settings, open, scale) {
  cassette(group, settings, 2.89, .12);
  const material = textileMaterial(fabric, image, scale);
  material.sheen = 0;
  material.roughness = .42;
  const count = 34, span = 2.16 * (1 - open * .87), pitch = span / count;
  for (let i = 0; i < count; i++) {
    cloth(group, 2.14, .058, -1.07, 2.83 - i * pitch, .12, (u, v) => ({ z: Math.sin(v * Math.PI) * .009 + v * .012 }), material, 32, 10);
  }
  const cord = new THREE.MeshStandardMaterial({ color: '#bcb5a9', roughness: .88 });
  for (const x of [-.74, .74]) {
    tube(group, [[x, 2.85, .135], [x, 2.84 - span, .135]], .002, cord);
    for (let i = 0; i < count; i++) tube(group, [[x - .014, 2.81 - i * pitch, .12], [x + .014, 2.81 - i * pitch, .145]], .0011, cord);
  }
  bottomRail(group, settings, 2.84 - span, .12);
  chain(group, settings);
}