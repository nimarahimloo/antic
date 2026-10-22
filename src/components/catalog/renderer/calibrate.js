import * as THREE from 'three';

const toLinear = c => (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);

export function lab([r, g, b]) {
  const f = t => (t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * .4124 + g * .3576 + b * .1805) / .95047);
  const y = f(r * .2126 + g * .7152 + b * .0722);
  const z = f((r * .0193 + g * .1192 + b * .9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export const deltaE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

// Average real color of the fabric sample photo (linear RGB).
export function targetColor(fabric, image) {
  if (image) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, 64, 64);
    let data;
    try { data = ctx.getImageData(0, 0, 64, 64).data; } catch { return null; }
    const sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += toLinear(data[i + c] / 255);
    return sum.map(v => v / (data.length / 4));
  }
  if (!fabric?.color_code) return null;
  const color = new THREE.Color(fabric.color_code);
  return [color.r, color.g, color.b];
}

// Measures the curtain's rendered pixels exactly as the visitor sees them (after light, shadow and tone mapping).
function measure({ renderer, composer, scene, camera }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const mw = 200, mh = Math.max(1, Math.round(200 * size.y / size.x));
  const target = new THREE.WebGLRenderTarget(mw, mh);
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const background = scene.background;
  scene.background = new THREE.Color('#000000'); scene.overrideMaterial = white; camera.layers.set(1);
  renderer.setRenderTarget(target); renderer.render(scene, camera);
  const mask = new Uint8Array(mw * mh * 4);
  renderer.readRenderTargetPixels(target, 0, 0, mw, mh, mask);
  renderer.setRenderTarget(null);
  scene.background = background; scene.overrideMaterial = null; camera.layers.set(0);
  target.dispose(); white.dispose();

  composer.render();
  const gl = renderer.getContext();
  const pixels = new Uint8Array(size.x * size.y * 4);
  gl.readPixels(0, 0, size.x, size.y, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const sum = [0, 0, 0]; let count = 0;
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    if (mask[(y * mw + x) * 4] < 128) continue;
    const px = Math.floor((x + .5) / mw * size.x), py = Math.floor((y + .5) / mh * size.y);
    const i = (py * size.x + px) * 4;
    for (let c = 0; c < 3; c++) sum[c] += toLinear(pixels[i + c] / 255);
    count++;
  }
  return count > 50 ? sum.map(v => v / count) : null;
}

// Closes the loop: render → measure → correct fabric albedo, until the rendered color matches the real sample.
export function calibrate(context, curtain, target) {
  const materials = new Set();
  curtain.traverse(o => {
    if (o.isMesh && o.material?.userData?.textile) { materials.add(o.material); o.layers.enable(1); }
  });
  if (!materials.size || !target) return null;
  let error = null;
  for (let step = 0; step < 5; step++) {
    const rendered = measure(context);
    if (!rendered) return null;
    error = deltaE(rendered, target);
    if (error < 1.5 || step === 4) break;
    materials.forEach(material => {
      ['r', 'g', 'b'].forEach((k, c) => {
        const ratio = Math.min(1.8, Math.max(.55, target[c] / Math.max(rendered[c], .0005)));
        material.color[k] = Math.min(3, Math.max(.05, material.color[k] * ratio));
      });
    });
  }
  return { deltaE: Math.round(error * 10) / 10 };
}