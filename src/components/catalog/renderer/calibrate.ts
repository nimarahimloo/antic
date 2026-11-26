import * as THREE from "three";

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

type ColorTuple = [number, number, number];

export function lab([r, g, b]: ColorTuple): ColorTuple {
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const y = f(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)] as ColorTuple;
}

export const deltaE = (a: ColorTuple, b: ColorTuple) => {
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

// Average real color of the fabric sample photo (linear RGB).
export function targetColor(
  fabric: { color_code?: string | null; [key: string]: unknown } | null | undefined,
  image: HTMLImageElement | null
): ColorTuple | null {
  if (image) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, 64, 64);
    let data: Uint8ClampedArray | null = null;
    try {
      data = ctx.getImageData(0, 0, 64, 64).data;
    } catch {
      return null;
    }
    const sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += toLinear(data[i + c] / 255);
    const n = data.length / 4;
    return [sum[0] / n, sum[1] / n, sum[2] / n] as ColorTuple;
  }
  if (!fabric?.color_code) return null;
  const color = new THREE.Color(fabric.color_code);
  return [color.r, color.g, color.b] as ColorTuple;
}

// Measures the curtain's rendered pixels exactly as the visitor sees them (after light, shadow and tone mapping).
function measure({
  renderer,
  composer,
  scene,
  camera,
}: {
  renderer: THREE.WebGLRenderer;
  composer: { render: () => void };
  scene: THREE.Scene;
  camera: THREE.Camera;
}): ColorTuple | null {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const mw = 200;
  const mh = Math.max(1, Math.round(200 * size.y / size.x));
  const target = new THREE.WebGLRenderTarget(mw, mh);
  const white = new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.DoubleSide });
  const background = scene.background;
  scene.background = new THREE.Color("#000000");
  scene.overrideMaterial = white;
  camera.layers.set(1);
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  const mask = new Uint8Array(mw * mh * 4);
  renderer.readRenderTargetPixels(target, 0, 0, mw, mh, mask);
  renderer.setRenderTarget(null);
  scene.background = background;
  scene.overrideMaterial = null;
  camera.layers.set(0);
  target.dispose();
  white.dispose();

  composer.render();
  const gl = renderer.getContext();
  if (!gl) return null;
  const pixels = new Uint8Array(size.x * size.y * 4);
  gl.readPixels(0, 0, size.x, size.y, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const sum = [0, 0, 0];
  let count = 0;
  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      if (mask[(y * mw + x) * 4] < 128) continue;
      const px = Math.floor((x + 0.5) / mw * size.x);
      const py = Math.floor((y + 0.5) / mh * size.y);
      const i = (py * size.x + px) * 4;
      for (let c = 0; c < 3; c++) sum[c] += toLinear(pixels[i + c] / 255);
      count++;
    }
  return count > 50 ? ([sum[0] / count, sum[1] / count, sum[2] / count] as ColorTuple) : null;
}

// Closes the loop: render → measure → correct fabric albedo, until the rendered color matches the real sample.
export function calibrate(
  context: {
    renderer: THREE.WebGLRenderer;
    composer: { render: () => void };
    scene: THREE.Scene;
    camera: THREE.Camera;
  },
  curtain: THREE.Group | THREE.Mesh | THREE.Object3D,
  target: ColorTuple | null
) {
  const materials = new Set<THREE.Material>();
  curtain.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if ((m as { userData?: { textile?: boolean } })?.userData?.textile) {
          materials.add(m as THREE.Material);
          mesh.layers.enable(1);
        }
      }
    }
  });
  if (!materials.size || !target) return null;
  let error = 0;
  for (let step = 0; step < 5; step++) {
    const rendered = measure(context);
    if (!rendered) return null;
    error = deltaE(rendered, target);
    if (error < 1.5 || step === 4) break;
    materials.forEach((material) => {
      const colorMaterial = material as unknown as { r: number; g: number; b: number };
      const ratioR = Math.min(1.8, Math.max(0.55, target[0] / Math.max(rendered[0], 0.0005)));
      const ratioG = Math.min(1.8, Math.max(0.55, target[1] / Math.max(rendered[1], 0.0005)));
      const ratioB = Math.min(1.8, Math.max(0.55, target[2] / Math.max(rendered[2], 0.0005)));
      colorMaterial.r = Math.min(3, Math.max(0.05, colorMaterial.r * ratioR));
      colorMaterial.g = Math.min(3, Math.max(0.05, colorMaterial.g * ratioG));
      colorMaterial.b = Math.min(3, Math.max(0.05, colorMaterial.b * ratioB));
    });
  }
  return { deltaE: Math.round(error * 10) / 10 };
}
