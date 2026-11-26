import * as THREE from "three";

type FabricLike = {
  category_slug?: string | null;
  subcategory?: string | null;
  texture?: string | null;
  color_code?: string | null;
  image?: string | null;
  [key: string]: unknown;
};

const images = new Map<string, Promise<HTMLImageElement>>();

export async function sampleImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  if (!images.has(url)) {
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const loader = new THREE.ImageLoader().setCrossOrigin("anonymous");
      loader.load(url, resolve, undefined, reject);
    });
    images.set(url, promise);
    promise.catch(() => images.delete(url));
    if (images.size > 12) {
      const firstKey = images.keys().next().value;
      if (firstKey) images.delete(firstKey);
    }
  }
  return images.get(url) ?? null;
}

export function grainTexture(kind = "weave"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const image = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const random = noise - Math.floor(noise);
      const weave = Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 2);
      const value =
        kind === "wood"
          ? 128 + Math.sin(x * 0.24 + Math.sin(y * 0.013) * 4) * 27 + random * 12
          : kind === "plaster"
          ? 128 + random * 38
          : 128 + weave * 48 + random * 12;
      const i = (y * 256 + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "weave" ? 35 : 2, kind === "wood" ? 0.5 : 35);
  return texture;
}

function colorTexture(image: HTMLImageElement, scale: number): THREE.CanvasTexture | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // A narrow crossfade at opposing edges removes hard tiled seams, without mirroring motifs.
  ctx.drawImage(image, 0, 0, 1024, 1024);
  const original = ctx.getImageData(0, 0, 1024, 1024);
  const result = ctx.createImageData(1024, 1024);
  const p = original.data;
  const feather = 40;
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      const wx =
        x < feather
          ? 0.5 * (1 - x / feather)
          : x >= 1024 - feather
          ? 0.5 * (1 - (1023 - x) / feather)
          : 0;
      const wy =
        y < feather
          ? 0.5 * (1 - y / feather)
          : y >= 1024 - feather
          ? 0.5 * (1 - (1023 - y) / feather)
          : 0;
      const i = (y * 1024 + x) * 4;
      const ix = (y * 1024 + 1023 - x) * 4;
      const iy = ((1023 - y) * 1024 + x) * 4;
      for (let c = 0; c < 3; c++)
        result.data[i + c] = p[i + c] * (1 - wx - wy) + p[ix + c] * wx + p[iy + c] * wy;
      result.data[i + 3] = 255;
    }
  ctx.putImageData(result, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / scale, 1 / scale);
  texture.anisotropy = 8;
  return texture;
}

interface MaterialOptions {
  sheer?: boolean;
  solid?: boolean;
  bands?: boolean;
  phase?: number;
}

export function textileMaterial(
  fabric: FabricLike | null | undefined,
  image: HTMLImageElement | null,
  scale: number,
  options: MaterialOptions = {}
): THREE.MeshPhysicalMaterial {
  const category = fabric?.category_slug;
  const satin = category === "silk" || category === "aurora";
  const velvet = category === "velvet";
  const sheer = options.sheer || category === "sheer" || category === "pleated-mesh";
  const blackout = /blackout|بلک|سه.لایه/.test(`${fabric?.subcategory ?? ""} ${fabric?.texture ?? ""}`);
  const material = new THREE.MeshPhysicalMaterial({
    color: image && !options.solid ? "#ffffff" : fabric?.color_code ?? "#d9c7a7",
    map: options.solid ? null : colorTexture(image!, scale),
    bumpMap: grainTexture(),
    bumpScale: velvet ? 0.0003 : 0.0007,
    roughness: satin ? 0.43 : velvet ? 0.94 : 0.82,
    metalness: 0,
    sheen: velvet ? 1 : satin ? 0.85 : 0.3,
    sheenColor: new THREE.Color(fabric?.color_code ?? "#e8dcc9"),
    sheenRoughness: satin ? 0.45 : 0.83,
    side: THREE.DoubleSide,
    transparent: !!sheer || !!options.bands,
    opacity: sheer ? 0.62 : 1,
    depthWrite: !sheer && !options.bands,
  });
  material.userData.textile = true;
  const backlight = blackout ? 0 : sheer ? 0.28 : velvet ? 0.005 : 0.095;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.clothBacklight = { value: backlight };
    shader.uniforms.bandPhase = { value: options.phase || 0 };
    shader.vertexShader = `varying vec3 clothPoint;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nclothPoint = position;"
    );
    shader.fragmentShader = `varying vec3 clothPoint; uniform float clothBacklight; uniform float bandPhase;\n${shader.fragmentShader}`;
    const bands = options.bands
      ? 'float band = step(0.083, mod(clothPoint.y + bandPhase, 0.205)); diffuseColor.a *= mix(0.14, 1.0, band);'
      : "";
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>\n${bands}`
    );
    // Transmitted window light: frame silhouettes attenuate it, rather than a flat opacity wash.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>\nfloat mullion = smoothstep(0.032, 0.065, abs(clothPoint.x)) * smoothstep(0.024, 0.065, abs(clothPoint.y - 1.71));\nfloat windowArea = (1.0 - smoothstep(1.04, 1.16, abs(clothPoint.x))) * smoothstep(0.57, 0.74, clothPoint.y) * (1.0 - smoothstep(2.78, 2.91, clothPoint.y));\ntotalEmissiveRadiance += diffuseColor.rgb * clothBacklight * windowArea * mix(0.18, 1.0, mullion);`
    );
  };
  material.customProgramCacheKey = () => `cloth:${backlight}:${!!options.bands}:${options.phase || 0}`;
  return material;
}
