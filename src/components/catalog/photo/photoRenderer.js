/**
 * Live fabric → chroma map.
 * scale ≈ 1 → one fabric image across the green region (no micro-tiling).
 */

const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPhoto, uFabric;
uniform vec2 uSize;
uniform float uTile, uAspect, uMean, uTop, uWarp, uAO, uDetail;
uniform int uMat;

vec3 lin(vec3 c){ return pow(max(c, 0.), vec3(2.2)); }
vec3 srgb(vec3 c){ return pow(clamp(c, 0., 1.), vec3(1./2.2)); }

float keyOf(vec3 c){
  float g = c.g - max(c.r, c.b);
  float sat = c.g / max(c.r + c.g + c.b, 1e-3);
  return clamp(smoothstep(0.035, 0.14, g) * smoothstep(0.26, 0.4, sat), 0., 1.);
}

float sh(vec2 q){ return lin(texture(uPhoto, q).rgb).g / max(uMean, 1e-4); }

void main(){
  vec3 p = texture(uPhoto, vUv).rgb;
  float k = keyOf(p);
  if (k < 0.006) { o = vec4(p, 1.); return; }

  float s = lin(p).g / max(uMean, 1e-4);
  float blurS = lin(textureLod(uPhoto, vUv, 3.2).rgb).g / max(uMean, 1e-4);
  float micro = clamp(s / max(blurS, 0.02), 0.5, 2.0);
  s *= pow(micro, uDetail);
  s = pow(max(s, 0.), 0.92);

  vec2 e = 1.25 / uSize;
  float gx = sh(vUv + vec2(e.x, 0.)) - sh(vUv - vec2(e.x, 0.));
  float gy = sh(vUv + vec2(0., e.y)) - sh(vUv - vec2(0., e.y));
  float slope = smoothstep(0.06, 0.7, length(vec2(gx, gy)));
  float ao = mix(1., smoothstep(0.3, 1.2, s), uAO * 0.55);

  vec2 px = vec2(vUv.x * uSize.x, (uTop - vUv.y) * uSize.y);
  float compress = mix(1., 0.92, smoothstep(0.75, 0.3, s));
  // uTile = window width * scale; scale~1 → one fabric across
  vec2 uv = px / vec2(uTile, uTile / max(uAspect, 0.12) * compress);
  uv.x += gx * uWarp;
  uv.y += gy * uWarp * 0.2;
  // clamp edge instead of hard REPEAT seams
  uv = clamp(uv, vec2(0.001), vec2(0.999));

  vec3 fLin = lin(texture(uFabric, uv).rgb);
  vec3 local = lin(textureLod(uFabric, uv, 1.5).rgb);
  vec3 avg = lin(textureLod(uFabric, uv, 4.0).rgb);
  vec3 ratio = clamp(fLin / max(local, vec3(0.004)), vec3(0.8), vec3(1.25));
  fLin = mix(fLin, avg * ratio, 0.18);

  vec3 shaded = fLin * s * ao;

  if (uMat == 1) {
    float sv = s < 1. ? pow(s, 1.15) : 1. + (s - 1.) * 0.3;
    shaded = fLin * sv * ao * (1. + slope * 0.25);
  } else if (uMat == 2) {
    float hl = smoothstep(1.05, 1.6, s) * 0.22;
    shaded = fLin * s * ao + hl * mix(fLin, vec3(1.), 0.3);
  } else if (uMat == 3) {
    vec3 light = vec3(1., 0.99, 0.96) * clamp(s, 0., 1.4);
    shaded = mix(fLin * s * ao, light * mix(fLin, vec3(1.), 0.35), 0.28);
  }

  float kSoft = smoothstep(0., 0.28, k) * k;
  vec3 despill = lin(vec3(p.r, min(p.g, max(p.r, p.b) * 1.01), p.b));
  o = vec4(srgb(mix(despill, shaded, kSoft)), 1.);
}`;

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function texture(gl, unit, source, repeat) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  // CLAMP by default for natural one-shot fabric; REPEAT only if needed
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

export function analyzeTemplate(image) {
  const w = 224;
  const h = Math.max(1, Math.round((224 * image.naturalHeight) / image.naturalWidth));
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0,
    n = 0,
    top = h;
  const logs = [];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255,
      g = d[i + 1] / 255,
      b = d[i + 2] / 255;
    if (g - Math.max(r, b) > 0.1) {
      const linG = g ** 2.2;
      sum += linG;
      n++;
      logs.push(Math.log(linG + 1e-3));
      top = Math.min(top, Math.floor(i / 4 / w));
    }
  }
  const avg = logs.length ? logs.reduce((a, v) => a + v, 0) / logs.length : 0;
  const logStd = logs.length
    ? Math.sqrt(logs.reduce((a, v) => a + (v - avg) ** 2, 0) / logs.length)
    : 0.12;
  return { mean: n ? sum / n : 1, coverage: n / (w * h), top: 1 - top / h, logStd };
}

export function materialProfile(material) {
  switch ((material || "cotton").toLowerCase()) {
    case "velvet":
      return { id: 1, detail: 0.22, tile: 1.0, warp: 0.04, ao: 0.42 };
    case "silk":
    case "satin":
      return { id: 2, detail: 0.2, tile: 1.0, warp: 0.03, ao: 0.3 };
    case "sheer":
    case "voile":
      return { id: 3, detail: 0.14, tile: 1.05, warp: 0.02, ao: 0.18 };
    default:
      return { id: 0, detail: 0.26, tile: 1.0, warp: 0.03, ao: 0.38 };
  }
}

export function renderPhoto(canvas, photo, fabric, info, materialOrScale, scaleOverride) {
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error("WebGL2 unavailable");

  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // CLAMP_TO_EDGE — no repeating stamps
  const textures = [texture(gl, 0, photo, false), texture(gl, 1, fabric, false)];
  const fw = fabric.naturalWidth || fabric.width || 1;
  const fh = fabric.naturalHeight || fabric.height || 1;

  let material = "cotton";
  let scale;
  if (typeof materialOrScale === "string") {
    material = materialOrScale;
    scale = typeof scaleOverride === "number" ? scaleOverride : undefined;
  } else if (typeof materialOrScale === "number") {
    scale = materialOrScale;
  }

  const profile = materialProfile(material);
  if (scale == null) scale = profile.tile;
  scale = Math.min(1.35, Math.max(0.75, scale));

  const u = (name) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u("uPhoto"), 0);
  gl.uniform1i(u("uFabric"), 1);
  gl.uniform2f(u("uSize"), canvas.width, canvas.height);
  // full-width mapping: tile size = canvas width * scale
  gl.uniform1f(u("uTile"), canvas.width * scale);
  gl.uniform1f(u("uAspect"), fw / Math.max(fh, 1));
  gl.uniform1f(u("uMean"), info.mean);
  gl.uniform1f(u("uTop"), info.top);
  gl.uniform1i(u("uMat"), profile.id);
  gl.uniform1f(u("uDetail"), profile.detail);
  gl.uniform1f(u("uWarp"), profile.warp);
  gl.uniform1f(u("uAO"), profile.ao);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  textures.forEach((t) => gl.deleteTexture(t));
  gl.deleteProgram(prog);
}
