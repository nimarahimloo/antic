import * as THREE from "three";
import { resolveStyle } from "@/components/catalog/windowStyles";
import { drapery, slidingPanels } from "@/components/catalog/renderer/drapery";
import { roman, pleated, rollerShade, zebra, venetian } from "@/components/catalog/renderer/blinds";
import { rod, metal } from "@/components/catalog/renderer/hardware";

interface FabricLike {
  category_slug?: string | null;
  subcategory?: string | null;
  color_code?: string | null;
  image?: string | null;
  id?: string | null;
  code?: string | null;
  [key: string]: unknown;
}

interface Settings {
  rail_color?: string;
  frame_color?: string;
  wall_color?: string;
  view_image?: string;
}

export function buildCurtain(
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  settings: Settings,
  open: number,
  scale: number
): THREE.Group {
  const group = new THREE.Group();
  if (!fabric) return group;
  const style = resolveStyle(fabric);
  if (fabric.category_slug === "accessories") {
    rod(group, settings);
    if (fabric.subcategory === "ring") {
      for (let i = 0; i < 16; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.03, 0.005, 10, 24),
          metal(fabric.color_code ?? settings.rail_color ?? "#C9A227")
        );
        ring.position.set(-1.25 + i * 0.167, 3, 0.27);
        ring.rotation.y = Math.PI / 2;
        group.add(ring);
      }
    }
  } else if (style === "drape" || style === "wave") {
    drapery(group, fabric, image, settings, open, scale, style === "wave");
  } else if (style === "panel") {
    slidingPanels(group, fabric, image, settings, open, scale);
  } else if (style === "roman") {
    roman(group, fabric, image, settings, open, scale);
  } else if (style.startsWith("pleated")) {
    pleated(group, fabric, image, settings, open, scale, style);
  } else if (style === "zebra") {
    zebra(group, fabric, image, settings, open, scale);
  } else if (style === "roller") {
    venetian(group, fabric, image, settings, open, scale);
  } else {
    rollerShade(group, fabric, image, settings, open, scale, style === "double");
  }
  return group;
}
