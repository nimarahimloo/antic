import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Parent = THREE.Group | THREE.Mesh | THREE.Object3D;

export function box(
  parent: Parent,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  radius = 0.006
): THREE.Mesh {
  const geometry = radius
    ? new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 3))
    : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(
  parent: Parent,
  radius: number,
  length: number,
  position: [number, number, number],
  material: THREE.Material,
  horizontal = false
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material);
  mesh.position.set(...position);
  if (horizontal) mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function tube(
  parent: Parent,
  points: number[][],
  radius: number,
  material: THREE.Material
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(24, points.length * 2), radius, 6, false),
    material
  );
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Vertex coordinates and UVs are in metres; texel density stays identical between panels.
export function cloth(
  parent: Parent,
  width: number,
  height: number,
  left: number,
  top: number,
  depth: number,
  deform: (u: number, v: number) => { x?: number; y?: number; z?: number; fullness?: number },
  material: THREE.Material,
  nx = 128,
  ny = 64
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height, nx, ny);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const u = uv.getX(i);
    const v = 1 - uv.getY(i);
    const delta = deform(u, v);
    position.setXYZ(i, left + u * width + (delta.x || 0), top - v * height + (delta.y || 0), depth + (delta.z || 0));
    uv.setXY(i, u * width * (delta.fullness || 1), (1 - v) * height);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = !material.transparent;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function disposeGroup(group: THREE.Group | THREE.Mesh | THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const mesh = object;
      geometries.add(mesh.geometry);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of mats) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if ((value as { isTexture?: boolean })?.isTexture) {
            textures.add(value as unknown as THREE.Texture);
          }
        }
      }
    }
  });
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
  geometries.forEach((g) => g.dispose());
  group.removeFromParent();
}
