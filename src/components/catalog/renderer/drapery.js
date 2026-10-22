import * as THREE from 'three';
import { cloth, box } from '@/components/catalog/renderer/mesh';
import { textileMaterial } from '@/components/catalog/renderer/textiles';
import { rod, seams } from '@/components/catalog/renderer/hardware';

export function drapery(group, fabric, image, settings, open, scale, wave) {
  const hardware = rod(group, settings, wave);
  const material = textileMaterial(fabric, image, scale);
  const stitch = new THREE.MeshStandardMaterial({ color: fabric.color_code || '#d9c7a7', roughness: .95 });
  const count = wave ? 9 : 8;
  const width = 1.4 * (1 - open * .83), height = 2.85;
  const amplitude = .046 + open * .026;
  for (const left of [-1.4, 1.4 - width]) {
    const deform = (u, v) => {
      const phase = u * count * Math.PI * 2;
      const irregular = wave ? 0 : Math.sin(u * 41 + v * 3.1) * .004 + Math.sin(v * 19 + u * 27) * .002;
      return {
        z: amplitude * Math.sin(phase + (wave ? 0 : Math.sin(v * 2.6) * .19)) * (.68 + .32 * Math.sin(v * Math.PI / 2)) + irregular,
        x: Math.sin(v * 4.1) * Math.sin(u * Math.PI) * .012,
        y: -Math.sin(phase) * (.005 + .007 * v * v),
        fullness: 2.1 / (1 - open * .83),
      };
    };
    cloth(group, width, height, left, 2.965, .27, deform, material, 240, 96);
    seams(group, width, left, 2.965, height, .27, deform, stitch);
    for (let i = 0; i <= count; i++) {
      const x = left + i / count * width;
      if (wave) box(group, [.012, .023, .02], [x, 2.982, .27], hardware);
      else {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.029, .0045, 8, 20), hardware);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(x, 3, .27);
        group.add(ring);
      }
    }
  }
}

export function slidingPanels(group, fabric, image, settings, open, scale) {
  rod(group, settings, true);
  const material = textileMaterial(fabric, image, scale);
  for (let i = 0; i < 4; i++) {
    const left = -1.32 + i * .66 - i * open * .46;
    cloth(group, .73, 2.85, left, 2.965, .22 + i * .036, (u, v) => ({ z: Math.sin(u * Math.PI) * .005 + Math.sin(v * Math.PI) * .003 }), material);
    box(group, [.73, .021, .026], [left + .365, .114, .22 + i * .036], new THREE.MeshStandardMaterial({ color: settings.rail_color, metalness: .7, roughness: .4 }));
  }
}