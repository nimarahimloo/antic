import * as THREE from 'three';
import { box, cylinder, tube } from '@/components/catalog/renderer/mesh';

export function metal(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: .82, roughness: .29 });
}

export function rod(group, settings, wave = false) {
  const material = metal(settings.rail_color);
  if (wave) {
    box(group, [2.84, .037, .068], [0, 3.015, .27], material);
    return material;
  }
  cylinder(group, .021, 2.9, [0, 3.005, .26], material, true);
  for (const x of [-1.52, 1.52]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.043, 24, 16), material);
    ball.position.set(x, 3.005, .26);
    group.add(ball);
  }
  for (const x of [-1.32, 1.32]) {
    box(group, [.05, .10, .023], [x, 2.96, .09], material);
    tube(group, [[x, 2.96, .09], [x, 2.94, .19], [x, 2.99, .26]], .009, material);
  }
  return material;
}

export function cassette(group, settings, top = 2.875, depth = .12, width = 2.25) {
  const material = metal(settings.rail_color);
  box(group, [width, .067, .067], [0, top, depth], material, .015);
  const end = new THREE.MeshStandardMaterial({ color: settings.frame_color, roughness: .65 });
  for (const x of [-width / 2, width / 2]) box(group, [.025, .069, .072], [x, top, depth], end);
}

export function bottomRail(group, settings, y, depth = .12, width = 2.18) {
  box(group, [width, .025, .032], [0, y, depth], metal(settings.rail_color));
}

export function chain(group, settings, x = 1.19, z = .15) {
  const material = metal(settings.rail_color);
  const points = [[x - .017, 2.85, z], [x - .017, 1.48, z], [x, 1.455, z], [x + .017, 1.48, z], [x + .017, 2.85, z]];
  tube(group, points, .0018, material);
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.0035, 6, 4), material, 156);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 156; i++) {
    dummy.position.set(x + (i < 78 ? -.017 : .017), 2.84 - (i % 78) * .0174, z);
    dummy.updateMatrix(); beads.setMatrixAt(i, dummy.matrix);
  }
  group.add(beads);
  box(group, [.018, .034, .023], [x, 1.455, z], material);
}

export function seams(group, width, left, top, height, depth, deform, material) {
  for (const u of [0.007, .993]) {
    const points = Array.from({ length: 41 }, (_, i) => {
      const v = i / 40, d = deform(u, v);
      return [left + u * width + (d.x || 0), top - v * height + (d.y || 0), depth + (d.z || 0) + .001];
    });
    tube(group, points, .002, material);
  }
  const points = Array.from({ length: 101 }, (_, i) => {
    const u = i / 100, d = deform(u, .99);
    return [left + u * width + (d.x || 0), top - .99 * height + (d.y || 0), depth + (d.z || 0) + .001];
  });
  tube(group, points, .0035, material);
}