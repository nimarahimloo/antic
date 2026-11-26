import * as THREE from "three";
import { box, cylinder, tube } from "@/components/catalog/renderer/mesh";

type Parent = THREE.Group | THREE.Mesh | THREE.Object3D;

interface Settings {
  rail_color?: string;
  frame_color?: string;
}

export function metal(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.29 });
}

export function rod(group: Parent, settings: Settings, wave = false): THREE.Material {
  const material = metal(settings.rail_color ?? "#C9A227");
  if (wave) {
    box(group, [2.84, 0.037, 0.068], [0, 3.015, 0.27], material);
    return material;
  }
  cylinder(group, 0.021, 2.9, [0, 3.005, 0.26], material, true);
  for (const x of [-1.52, 1.52]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.043, 24, 16), material);
    ball.position.set(x, 3.005, 0.26);
    group.add(ball);
  }
  for (const x of [-1.32, 1.32]) {
    box(group, [0.05, 0.1, 0.023], [x, 2.96, 0.09], material);
    tube(group, [[x, 2.96, 0.09], [x, 2.94, 0.19], [x, 2.99, 0.26]], 0.009, material);
  }
  return material;
}

export function cassette(
  group: Parent,
  settings: Settings,
  top = 2.875,
  depth = 0.12,
  width = 2.25
) {
  const material = metal(settings.rail_color ?? "#C9A227");
  box(group, [width, 0.067, 0.067], [0, top, depth], material, 0.015);
  const end = new THREE.MeshStandardMaterial({ color: settings.frame_color ?? "#3b352c", roughness: 0.65 });
  for (const x of [-width / 2, width / 2]) box(group, [0.025, 0.069, 0.072], [x, top, depth], end);
}

export function bottomRail(
  group: Parent,
  settings: Settings,
  y: number,
  depth = 0.12,
  width = 2.18
) {
  box(group, [width, 0.025, 0.032], [0, y, depth], metal(settings.rail_color ?? "#C9A227"));
}

export function chain(group: Parent, settings: Settings, x = 1.19, z = 0.15) {
  const material = metal(settings.rail_color ?? "#C9A227");
  const points = [
    [x - 0.017, 2.85, z],
    [x - 0.017, 1.48, z],
    [x, 1.455, z],
    [x + 0.017, 1.48, z],
    [x + 0.017, 2.85, z],
  ];
  tube(group, points, 0.0018, material);
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0035, 6, 4), material, 156);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 156; i++) {
    dummy.position.set(x + (i < 78 ? -0.017 : 0.017), 2.84 - (i % 78) * 0.0174, z);
    dummy.updateMatrix();
    beads.setMatrixAt(i, dummy.matrix);
  }
  group.add(beads);
  box(group, [0.018, 0.034, 0.023], [x, 1.455, z], material);
}

export function seams(
  group: Parent,
  width: number,
  left: number,
  top: number,
  height: number,
  depth: number,
  deform: (u: number, v: number) => { x?: number; y?: number; z?: number },
  material: THREE.Material
) {
  for (const u of [0.007, 0.993]) {
    const points = Array.from({ length: 41 }, (_, i) => {
      const v = i / 40;
      const d = deform(u, v);
      return [
        left + u * width + (d.x || 0),
        top - v * height + (d.y || 0),
        depth + (d.z || 0) + 0.001,
      ];
    });
    tube(group, points, 0.002, material);
  }
  const points = Array.from({ length: 101 }, (_, i) => {
    const u = i / 100;
    const d = deform(u, 0.99);
    return [
      left + u * width + (d.x || 0),
      top - 0.99 * height + (d.y || 0),
      depth + (d.z || 0) + 0.001,
    ];
  });
  tube(group, points, 0.0035, material);
}
