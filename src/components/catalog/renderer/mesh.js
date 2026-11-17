import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function box(parent, size, position, material, radius = 0.006) {
  const geometry = radius ? new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 3)) : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent, radius, length, position, material, horizontal = false) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material);
  mesh.position.set(...position);
  if (horizontal) mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function tube(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 2), radius, 6, false), material);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Vertex coordinates and UVs are in metres; texel density stays identical between panels.
export function cloth(parent, width, height, left, top, depth, deform, material, nx = 128, ny = 64) {
  const geometry = new THREE.PlaneGeometry(width, height, nx, ny);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const u = uv.getX(i), v = 1 - uv.getY(i);
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

export function disposeGroup(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material || [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(t => t.dispose());
  materials.forEach(m => m.dispose());
  geometries.forEach(g => g.dispose());
  group.removeFromParent();
}