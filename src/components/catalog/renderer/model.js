import * as THREE from 'three';
import { resolveStyle } from '@/components/catalog/windowStyles';
import { drapery, slidingPanels } from '@/components/catalog/renderer/drapery';
import { roman, pleated, rollerShade, zebra, venetian } from '@/components/catalog/renderer/blinds';
import { rod, metal } from '@/components/catalog/renderer/hardware';

export function buildCurtain(fabric, image, settings, open, scale) {
  const group = new THREE.Group();
  if (!fabric) return group;
  const style = resolveStyle(fabric);
  if (fabric.category_slug === 'accessories') {
    rod(group, settings);
    if (fabric.subcategory === 'ring') for (let i = 0; i < 16; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .005, 10, 24), metal(fabric.color_code || settings.rail_color));
      ring.position.set(-1.25 + i * .167, 3, .27); ring.rotation.y = Math.PI / 2; group.add(ring);
    }
  } else if (style === 'drape' || style === 'wave') drapery(group, fabric, image, settings, open, scale, style === 'wave');
  else if (style === 'panel') slidingPanels(group, fabric, image, settings, open, scale);
  else if (style === 'roman') roman(group, fabric, image, settings, open, scale);
  else if (style.startsWith('pleated')) pleated(group, fabric, image, settings, open, scale, style);
  else if (style === 'zebra') zebra(group, fabric, image, settings, open, scale);
  else if (style === 'roller') venetian(group, fabric, image, settings, open, scale);
  else rollerShade(group, fabric, image, settings, open, scale, style === 'double');
  return group;
}