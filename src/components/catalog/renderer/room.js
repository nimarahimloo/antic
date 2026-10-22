import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { box, cylinder } from '@/components/catalog/renderer/mesh';
import { grainTexture, sampleImage } from '@/components/catalog/renderer/textiles';

export function buildRoom(scene, settings) {
  const room = new THREE.Group(); scene.add(room);
  const plaster = new THREE.MeshStandardMaterial({ color: settings.wall_color, roughness: .94, bumpMap: grainTexture('plaster'), bumpScale: .002 });
  const wood = new THREE.MeshStandardMaterial({ color: settings.frame_color, roughness: .53, bumpMap: grainTexture('wood'), bumpScale: .0015 });
  const sill = new THREE.MeshStandardMaterial({ color: '#cec7b9', roughness: .46 });
  // True wall opening and deep reveals, not a rectangle pasted over a flat wall.
  box(room, [2.2, 3.8, .23], [-2.25, 1.8, -.24], plaster);
  box(room, [2.2, 3.8, .23], [2.25, 1.8, -.24], plaster);
  box(room, [2.31, .9, .23], [0, 3.36, -.24], plaster);
  box(room, [2.31, .66, .23], [0, .3, -.24], plaster);
  box(room, [.2, 3.8, 4], [-3.34, 1.8, 1.6], plaster);
  for (const x of [-1.14, 1.14]) {
    box(room, [.10, 2.20, .22], [x, 1.76, -.06], wood);
    box(room, [.033, 2.47, .035], [x + Math.sign(x) * .07, 1.76, .06], wood);
    box(room, [.028, 2.30, .023], [x - Math.sign(x) * .049, 1.76, .058], wood);
  }
  for (const y of [.61, 2.91]) {
    box(room, [2.39, .10, .22], [0, y, -.06], wood);
    box(room, [2.48, .026, .035], [0, y + (y > 2 ? .07 : -.07), .06], wood);
  }
  box(room, [.058, 2.20, .078], [0, 1.76, -.11], wood);
  box(room, [2.18, .048, .078], [0, 1.71, -.11], wood);
  box(room, [2.58, .055, .42], [0, .555, .012], sill);
  box(room, [6.5, .11, .045], [0, .055, -.09], wood);
  const floor = new THREE.MeshStandardMaterial({ color: '#78614c', roughness: .68, bumpMap: grainTexture('wood'), bumpScale: .002 });
  for (let i = 0; i < 22; i++) box(room, [.28, .035, 5], [-3.05 + i * .282, -.018, 1.7], floor);
  // A real photographic view is a reusable texture, not a generated image per fabric.
  const view = new THREE.Mesh(new THREE.PlaneGeometry(2.26, 2.26), new THREE.MeshBasicMaterial({ color: '#bcc5af', toneMapped: false }));
  view.position.set(0, 1.76, -.40); room.add(view);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.22), new THREE.MeshPhysicalMaterial({ color: '#e6ede8', transparent: true, opacity: .045, roughness: .08, metalness: .1, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.set(0, 1.76, -.18); room.add(glass);
  // Small matte ceramic on the ledge establishes scale and receives the same window light.
  const ceramic = new THREE.MeshStandardMaterial({ color: '#d3cdbc', roughness: .88 });
  const profile = [new THREE.Vector2(.058, 0), new THREE.Vector2(.09, .025), new THREE.Vector2(.10, .13), new THREE.Vector2(.057, .20), new THREE.Vector2(.034, .23)];
  const vase = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), ceramic);
  vase.position.set(-.89, .585, .12); vase.castShadow = vase.receiveShadow = true; room.add(vase);
  cylinder(room, .024, .004, [-.89, .819, .12], new THREE.MeshStandardMaterial({ color: '#514c42', roughness: 1 }));
  return { room, view };
}

export async function   loadView(view, url) {
  const image = await sampleImage(url || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1400&q=85');
  const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
  // Crop photograph without stretching the aspect ratio.
  if (image.width > image.height) { texture.repeat.x = image.height / image.width; texture.offset.x = (1 - texture.repeat.x) / 2; }
  else { texture.repeat.y = image.width / image.height; texture.offset.y = (1 - texture.repeat.y) / 2; }
  view.material.map = texture; view.material.color.set('#ffffff'); view.material.needsUpdate = true;
}

export function lighting(scene) {
  RectAreaLightUniformsLib.init();
  scene.add(new THREE.HemisphereLight('#f0f5fa', '#867463', .72));
  const fill = new THREE.RectAreaLight('#fff2df', 2.8, 2.3, 2.8);
  fill.position.set(-1.4, 2.5, 2.6); fill.lookAt(0, 1.6, 0); scene.add(fill);
  const key = new THREE.DirectionalLight('#fff3df', .65);
  key.position.set(-3.5, 5.2, 4.5); key.target.position.set(0, 1.5, 0);
  key.castShadow = false; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3.7, bottom: -2, near: .1, far: 12 });
  key.shadow.bias = -.00015; key.shadow.normalBias = .009; key.shadow.radius = 4;
  scene.add(key, key.target);
  const daylight = new THREE.DirectionalLight('#fff6e8', 2.4);
  daylight.position.set(-1.1, 3.4, -2); daylight.target.position.set(.8, 0, 2.6);
  daylight.castShadow = true; daylight.shadow.mapSize.set(1024, 1024);
  Object.assign(daylight.shadow.camera, { left: -2.3, right: 2.3, top: 3, bottom: -3, near: .1, far: 10 });
  daylight.shadow.normalBias = .01; daylight.shadow.bias = -.0001;
  scene.add(daylight, daylight.target);
}