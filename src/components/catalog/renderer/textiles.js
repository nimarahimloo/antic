import * as THREE from 'three';

const images = new Map();
export async function sampleImage(url) {
  if (!url) return null;
  if (!images.has(url)) {
    const promise = new THREE.ImageLoader().setCrossOrigin('anonymous').loadAsync(url);
    images.set(url, promise);
    promise.catch(() => images.delete(url));
    if (images.size > 12) images.delete(images.keys().next().value);
  }
  return images.get(url);
}

export function grainTexture(kind = 'weave') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    const random = noise - Math.floor(noise);
    const weave = Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 2);
    const value = kind === 'wood' ? 128 + Math.sin(x * .24 + Math.sin(y * .013) * 4) * 27 + random * 12 : kind === 'plaster' ? 128 + random * 38 : 128 + weave * 48 + random * 12;
    const i = (y * 256 + x) * 4;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'weave' ? 35 : 2, kind === 'wood' ? .5 : 35);
  return texture;
}

function colorTexture(image, scale) {
  if (!image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  // A narrow crossfade at opposing edges removes hard tiled seams, without mirroring motifs.
  ctx.drawImage(image, 0, 0, 1024, 1024);
  const original = ctx.getImageData(0, 0, 1024, 1024);
  const result = ctx.createImageData(1024, 1024), p = original.data;
  const feather = 40;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
    const wx = x < feather ? .5 * (1 - x / feather) : x >= 1024 - feather ? .5 * (1 - (1023 - x) / feather) : 0;
    const wy = y < feather ? .5 * (1 - y / feather) : y >= 1024 - feather ? .5 * (1 - (1023 - y) / feather) : 0;
    const i = (y * 1024 + x) * 4, ix = (y * 1024 + 1023 - x) * 4, iy = ((1023 - y) * 1024 + x) * 4;
    for (let c = 0; c < 3; c++) result.data[i + c] = p[i + c] * (1 - wx - wy) + p[ix + c] * wx + p[iy + c] * wy;
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

export function textileMaterial(fabric, image, scale, options = {}) {
  const category = fabric.category_slug;
  const satin = category === 'silk' || category === 'aurora';
  const velvet = category === 'velvet';
  const sheer = options.sheer || category === 'sheer' || category === 'pleated-mesh';
  const blackout = /blackout|بلک|سه.لایه/.test(`${fabric.subcategory} ${fabric.texture}`);
  const material = new THREE.MeshPhysicalMaterial({
    color: image && !options.solid ? '#ffffff' : fabric.color_code || '#d9c7a7',
    map: options.solid ? null : colorTexture(image, scale),
    bumpMap: grainTexture(), bumpScale: velvet ? .0003 : .0007,
    roughness: satin ? .43 : velvet ? .94 : .82,
    metalness: 0, sheen: velvet ? 1 : satin ? .85 : .3,
    sheenColor: new THREE.Color(fabric.color_code || '#e8dcc9'),
    sheenRoughness: satin ? .45 : .83,
    side: THREE.DoubleSide, transparent: !!sheer || !!options.bands,
    opacity: sheer ? .62 : 1, depthWrite: !sheer && !options.bands,
  });
  material.userData.textile = true;
  const backlight = blackout ? 0 : sheer ? .28 : velvet ? .005 : .095;
  material.onBeforeCompile = shader => {
    shader.uniforms.clothBacklight = { value: backlight };
    shader.uniforms.bandPhase = { value: options.phase || 0 };
    shader.vertexShader = `varying vec3 clothPoint;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nclothPoint = position;');
    shader.fragmentShader = `varying vec3 clothPoint; uniform float clothBacklight; uniform float bandPhase;\n${shader.fragmentShader}`;
    const bands = options.bands ? 'float band = step(0.083, mod(clothPoint.y + bandPhase, 0.205)); diffuseColor.a *= mix(0.14, 1.0, band);' : '';
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${bands}`);
    // Transmitted window light: frame silhouettes attenuate it, rather than a flat opacity wash.
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\nfloat mullion = smoothstep(0.032, 0.065, abs(clothPoint.x)) * smoothstep(0.024, 0.065, abs(clothPoint.y - 1.71));\nfloat windowArea = (1.0 - smoothstep(1.04, 1.16, abs(clothPoint.x))) * smoothstep(0.57, 0.74, clothPoint.y) * (1.0 - smoothstep(2.78, 2.91, clothPoint.y));\ntotalEmissiveRadiance += diffuseColor.rgb * clothBacklight * windowArea * mix(0.18, 1.0, mullion);`);
  };
  material.customProgramCacheKey = () => `cloth:${backlight}:${!!options.bands}:${options.phase || 0}`;
  return material;
}