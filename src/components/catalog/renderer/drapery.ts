import * as THREE from "three";
import { cloth, box } from "@/components/catalog/renderer/mesh";
import { textileMaterial } from "@/components/catalog/renderer/textiles";
import { rod, seams } from "@/components/catalog/renderer/hardware";

type Parent = THREE.Group | THREE.Mesh | THREE.Object3D;

interface FabricLike {
  color_code?: string | null;
  image?: string | null;
  category_slug?: string | null;
  [key: string]: unknown;
}

interface Settings {
  rail_color?: string;
  frame_color?: string;
}

export function drapery(
  group: Parent,
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number,
  wave: boolean
) {
  const hardware = rod(group, settings, wave);
  const material = textileMaterial(fabric, image, scale);
  const stitch = new THREE.MeshStandardMaterial({ color: fabric?.color_code ?? "#d9c7a7", roughness: 0.95 });
  const count = wave ? 9 : 8;
  const width = 1.4 * (1 - open * 0.83);
  const height = 2.85;
  const amplitude = 0.046 + open * 0.026;
  for (const left of [-1.4, 1.4 - width]) {
    const deform = (u: number, v: number) => {
      const phase = u * count * Math.PI * 2;
      const irregular = wave
        ? 0
        : Math.sin(u * 41 + v * 3.1) * 0.004 + Math.sin(v * 19 + u * 27) * 0.002;
      return {
        z:
          amplitude *
            Math.sin(phase + (wave ? 0 : Math.sin(v * 2.6) * 0.19)) *
            (0.68 + 0.32 * Math.sin(v * (Math.PI / 2))) +
          irregular,
        x: Math.sin(v * 4.1) * Math.sin(u * Math.PI) * 0.012,
        y: -Math.sin(phase) * (0.005 + 0.007 * v * v),
        fullness: 2.1 / (1 - open * 0.83),
      };
    };
    cloth(group, width, height, left, 2.965, 0.27, deform, material, 240, 96);
    seams(group, width, left, 2.965, height, 0.27, deform, stitch);
    for (let i = 0; i <= count; i++) {
      const x = left + (i / count) * width;
      if (wave) box(group, [0.012, 0.023, 0.02], [x, 2.982, 0.27], hardware);
      else {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.0045, 8, 20), hardware);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(x, 3, 0.27);
        group.add(ring);
      }
    }
  }
}

export function slidingPanels(
  group: Parent,
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number
) {
  rod(group, settings, true);
  const material = textileMaterial(fabric, image, scale);
  for (let i = 0; i < 4; i++) {
    const left = -1.32 + i * 0.66 - i * open * 0.46;
    cloth(
      group,
      0.73,
      2.85,
      left,
      2.965,
      0.22 + i * 0.036,
      (u, v) => ({ z: Math.sin(u * Math.PI) * 0.005 + Math.sin(v * Math.PI) * 0.003 }),
      material
    );
    box(
      group,
      [0.73, 0.021, 0.026],
      [left + 0.365, 0.114, 0.22 + i * 0.036],
      new THREE.MeshStandardMaterial({ color: settings.rail_color, metalness: 0.7, roughness: 0.4 })
    );
  }
}
