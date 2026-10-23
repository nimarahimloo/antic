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
  const ceramic = new THREE.MeshStandardMaterial({ color: '#d7d0c4', roughness: .28, metalness: .08 });
  const profile = [new THREE.Vector2(.02, 0), new THREE.Vector2(.08, .02), new THREE.Vector2(.11, .08), new THREE.Vector2(.09, .16), new THREE.Vector2(.05, .22), new THREE.Vector2(.03, .24)];
  const vase = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), ceramic);
  vase.position.set(-.89, .585, .12); vase.castShadow = vase.receiveShadow = true; room.add(vase);
  cylinder(room, .024, .004, [-.89, .819, .12], new THREE.MeshStandardMaterial({ color: '#514c42', roughness: 1 }));
  return { room, view };
}

/** Local procedural outdoor view — no external CDN (Unsplash/base44). */
function makeOutdoorCanvas() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#8eb8e8');
  sky.addColorStop(0.55, '#c5daf0');
  sky.addColorStop(1, '#e8eef5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 520);
  ctx.fillStyle = '#7a9a6a';
  ctx.beginPath();
  ctx.moveTo(0, 480);
  for (let x = 0; x <= 1024; x += 40) {
    ctx.lineTo(x, 420 + Math.sin(x * 0.01) * 28 + Math.sin(x * 0.03) * 12);
  }
  ctx.lineTo(1024, 520); ctx.lineTo(0, 520); ctx.fill();
  ctx.fillStyle = '#5f7d52';
  ctx.beginPath();
  ctx.moveTo(0, 520);
  for (let x = 0; x <= 1024; x += 28) {
    ctx.lineTo(x, 470 + Math.sin(x * 0.02 + 1) * 35);
  }
  ctx.lineTo(1024, 640); ctx.lineTo(0, 640); ctx.fill();
  const ground = ctx.createLinearGradient(0, 640, 0, 1024);
  ground.addColorStop(0, '#9aab88');
  ground.addColorStop(1, '#6d7a5c');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 640, 1024, 384);
  ctx.fillStyle = 'rgba(45,70,40,0.55)';
  for (const [tx, ty, r] of [[180, 500, 90], [420, 480, 110], [700, 510, 95], [900, 490, 80]]) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, r * 0.7, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

export async function loadView(view, url) {
  let image = null;
  if (url) {
    try {
      image = await sampleImage(url);
    } catch {
      image = null;
    }
  }
  if (!image) {
    image = makeOutdoorCanvas();
  }
  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  if (image.width > image.height) {
    texture.repeat.x = image.height / image.width;
    texture.offset.x = (1 - texture.repeat.x) / 2;
  } else if (image.height > image.width) {
    texture.repeat.y = image.width / image.height;
    texture.offset.y = (1 - texture.repeat.y) / 2;
  }
  view.material.map = texture;
  view.material.color.set('#ffffff');
  view.material.needsUpdate = true;
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
