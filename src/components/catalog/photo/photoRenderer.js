// Photo-based renderer: real installed-curtain photo (chroma green fabric) + fabric swatch.
// Folds/light from photo; pattern/color from swatch. Tuned for natural patterned cloth.

const VS = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPhoto, uFabric;
uniform vec2 uSize;
uniform float uTile, uAspect, uMean, uLod, uTop, uContrast, uSheen, uDetail, uWarp, uAO;
uniform int uMat;

vec3 lin(vec3 c){ return pow(max(c, vec3(0.)), vec3(2.2)); }
vec3 srgb(vec3 c){ return pow(clamp(c, 0., 1.), vec3(1./2.2)); }

float keyOf(vec3 c){
  float g = c.g - max(c.r, c.b);
  float sat = c.g / max(c.r + c.g + c.b, 1e-3);
  float k = smoothstep(0.04, 0.16, g) * smoothstep(0.28, 0.42, sat);
  return clamp(k, 0., 1.);
}

float sh(vec2 q){ return lin(texture(uPhoto, q).rgb).g / max(uMean, 1e-4); }

void main(){
  vec3 p = texture(uPhoto, vUv).rgb;
  float k = keyOf(p);
  if (k < 0.008) { o = vec4(p, 1.); return; }

  float s = lin(p).g / max(uMean, 1e-4);
  float blurS = lin(textureLod(uPhoto, vUv, 3.5).rgb).g / max(uMean, 1e-4);
  float micro = clamp(s / max(blurS, 0.02), 0.45, 2.2);
  s *= pow(micro, uDetail);
  s = pow(max(s, 0.), uContrast);

  vec2 e = 1.5 / uSize;
  float gx = sh(vUv + vec2(e.x, 0.)) - sh(vUv - vec2(e.x, 0.));
  float gy = sh(vUv + vec2(0., e.y)) - sh(vUv - vec2(0., e.y));
  float slope = smoothstep(0.08, 0.75, length(vec2(gx, gy)));
  float ao = mix(1., smoothstep(0.35, 1.15, s), uAO);

  vec2 px = vec2(vUv.x * uSize.x, (uTop - vUv.y) * uSize.y);
  float compress = mix(1., 0.82, smoothstep(0.7, 0.25, s));
  vec2 uv = px / vec2(uTile, uTile / max(uAspect, 0.15) * compress);
  uv.x += gx * uWarp;
  uv.y += gy * uWarp * 0.35;

  vec3 f = lin(texture(uFabric, uv).rgb);
  vec3 local = lin(textureLod(uFabric, uv, max(uLod - 0.5, 0.)).rgb);
  vec3 avg = lin(textureLod(uFabric, uv, min(uLod + 6., 12.)).rgb);
  vec3 ratio = clamp(f / max(local, vec3(0.004)), vec3(0.55), vec3(1.75));
  f = mix(f, avg * ratio, 0.55);

  vec3 despill = lin(vec3(p.r, min(p.g, max(p.r, p.b) * 1.02), p.b));
  vec3 col = f * s * ao;

  if (uMat == 1) {
    float sv = s < 1. ? pow(s, 1.3) : 1. + (s - 1.) * 0.4;
    col = f * sv * ao * (1. + uSheen * slope * 0.55);
  } else if (uMat == 2) {
    float hl = uSheen * smoothstep(1.02, 1.65, s) * 0.55;
    col = f * s * ao + hl * mix(f, vec3(1.), 0.55);
  } else if (uMat == 3) {
    vec3 light = vec3(1., 0.985, 0.95) * clamp(s, 0., 1.55);
    col = mix(f * s * ao, light * mix(f, vec3(1.), 0.55), 0.42);
  } else {
    col = f * s * ao * (1. + slope * 0.08);
  }

  float kSoft = smoothstep(0.0, 0.35, k) * k;
  vec3 outc = mix(despill, col, kSoft);
  o = vec4(srgb(outc), 1.);
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
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

export function analyzeTemplate(image) {
  const w = 192;
  const h = Math.max(1, Math.round(192 * image.naturalHeight / image.naturalWidth));
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0, n = 0, top = h;
  const logs = [];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    if (g - Math.max(r, b) > 0.12) {
      const linG = g ** 2.2;
      sum += linG; n++;
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

export function materialProfile(material, logStd) {
  const target =
    material === "velvet" ? 0.42
    : material === "silk" || material === "satin" ? 0.36
    : material === "sheer" || material === "voile" ? 0.18
    : 0.28;
  const contrast = Math.min(1.75, Math.max(0.65, target / Math.max(logStd ?? 0.12, 0.05)));
  switch ((material || "cotton").toLowerCase()) {
    case "velvet":
      return { id: 1, contrast, sheen: 0.5, detail: 0.32, tile: 0.48, warp: 0.16, ao: 0.55 };
    case "silk":
    case "satin":
      return { id: 2, contrast, sheen: 0.68, detail: 0.3, tile: 0.4, warp: 0.14, ao: 0.4 };
    case "sheer":
    case "voile":
      return { id: 3, contrast, sheen: 0.12, detail: 0.2, tile: 0.36, warp: 0.08, ao: 0.25 };
    default:
      return { id: 0, contrast, sheen: 0.06, detail: 0.38, tile: 0.52, warp: 0.15, ao: 0.48 };
  }
}

export function renderPhoto(canvas, photo, fabric, info, material, scaleOverride) {
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error("WebGL2 در دسترس نیست");

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

  const textures = [texture(gl, 0, photo, false), texture(gl, 1, fabric, true)];
  const fw = fabric.naturalWidth || fabric.width;
  const fh = fabric.naturalHeight || fabric.height;
  const profile = materialProfile(material, info.logStd);
  const scale = scaleOverride ?? profile.tile;

  const u = (name) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u("uPhoto"), 0);
  gl.uniform1i(u("uFabric"), 1);
  gl.uniform2f(u("uSize"), canvas.width, canvas.height);
  gl.uniform1f(u("uTile"), canvas.width * scale * 0.55);
  gl.uniform1f(u("uAspect"), fw / Math.max(fh, 1));
  gl.uniform1f(u("uMean"), info.mean);
  gl.uniform1f(u("uTop"), info.top);
  gl.uniform1i(u("uMat"), profile.id);
  gl.uniform1f(u("uContrast"), profile.contrast);
  gl.uniform1f(u("uSheen"), profile.sheen);
  gl.uniform1f(u("uDetail"), profile.detail);
  gl.uniform1f(u("uWarp"), profile.warp);
  gl.uniform1f(u("uAO"), profile.ao);
  gl.uniform1f(u("uLod"), Math.max(0, Math.log2(Math.min(fw, fh)) - 2.5));

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  textures.forEach((t) => gl.deleteTexture(t));
  gl.deleteProgram(prog);
}
