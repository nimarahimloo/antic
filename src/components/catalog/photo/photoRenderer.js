// Photo-based renderer: real installed-curtain photo (fabric in chroma green) + real fabric swatch.
// Light, shadow and folds come from the photo; color and weave come from the swatch.
const VS = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPhoto, uFabric;
uniform vec2 uSize; uniform float uTile, uAspect, uMean, uLod, uTop, uContrast, uSheen, uDetail;
uniform int uMat;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
float keyOf(vec3 c){ return smoothstep(.05, .2, c.g - max(c.r, c.b)); }
float sh(vec2 q){ return lin(texture(uPhoto, q).rgb).g / uMean; }
void main(){
  vec3 p = texture(uPhoto, vUv).rgb;
  float k = keyOf(p);
  float s = lin(p).g / uMean;
  // micro-fold detail: local shading vs. its blurred neighbourhood deepens creases and pleat crowns
  float blurS = lin(textureLod(uPhoto, vUv, 4.).rgb).g / uMean;
  s *= pow(clamp(s / max(blurS, .02), .5, 2.), uDetail);
  // tonal matching to the material's real-photo fold contrast
  s = pow(max(s, 0.), uContrast);
  vec2 e = 2. / uSize;
  vec2 g = vec2(sh(vUv + vec2(e.x, 0.)) - sh(vUv - vec2(e.x, 0.)), sh(vUv + vec2(0., e.y)) - sh(vUv - vec2(0., e.y)));
  float slope = smoothstep(.15, .9, length(g));
  // fold-following warp: the fabric compresses inside shadowed folds like real cloth
  vec2 px = vec2(vUv.x * uSize.x, (uTop - vUv.y) * uSize.y);
  vec2 uv = px / vec2(uTile, uTile / uAspect);
  uv.x += g.x * .12;
  vec3 f = lin(texture(uFabric, uv).rgb);
  // flatten the swatch photo's own lighting so tiles join without visible seams
  vec3 local = lin(textureLod(uFabric, uv, uLod).rgb);
  vec3 avg = lin(textureLod(uFabric, uv, 14.).rgb);
  f = avg * clamp(f / max(local, vec3(.003)), vec3(.6), vec3(1.5));
  vec3 despill = lin(vec3(p.r, min(p.g, max(p.r, p.b)), p.b));
  vec3 col = f * s;
  if (uMat == 1) {
    // velvet: pile absorbs light in valleys, highlights stay soft, nap glows on fold edges
    float sv = s < 1. ? pow(s, 1.25) : 1. + (s - 1.) * .45;
    col = f * sv * (1. + uSheen * slope * .5);
  } else if (uMat == 2) {
    // silk/satin: tight glossy highlights on fold crowns
    col = f * s + uSheen * smoothstep(1.05, 1.7, s) * mix(f, vec3(1.), .6) * .5;
  } else if (uMat == 3) {
    // sheer: daylight passes through the cloth, weave contrast drops
    vec3 light = vec3(1., .98, .94) * clamp(s, 0., 1.6);
    col = mix(f * s, light * mix(f, vec3(1.), .6), .45);
  }
  o = vec4(pow(clamp(mix(despill, col, k), 0., 1.), vec3(1. / 2.2)), 1.);
}`;

function shader(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function texture(gl, unit, source, repeat) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

// Average light on the green fabric and where the fabric starts (so the pattern hangs from the top edge).
export function analyzeTemplate(image) {
  const w = 160, h = Math.round(160 * image.naturalHeight / image.naturalWidth);
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0, n = 0, top = h;
  const logs = [];
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    if (g - Math.max(r, b) > .15) { sum += g ** 2.2; n++; logs.push(Math.log(g ** 2.2 + 1e-3)); top = Math.min(top, Math.floor(i / 4 / w)); }
  }
  const avg = logs.reduce((a, v) => a + v, 0) / (logs.length || 1);
  const logStd = Math.sqrt(logs.reduce((a, v) => a + (v - avg) ** 2, 0) / (logs.length || 1));
  return { mean: n ? sum / n : 1, coverage: n / (w * h), top: 1 - top / h, logStd };
}

export function renderPhoto(canvas, photo, fabric, info, scale, profile) {
  canvas.width = photo.naturalWidth; canvas.height = photo.naturalHeight;
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const textures = [texture(gl, 0, photo, false), texture(gl, 1, fabric, true)];
  const fw = fabric.naturalWidth || fabric.width, fh = fabric.naturalHeight || fabric.height;
  const u = name => gl.getUniformLocation(prog, name);
  gl.uniform1i(u('uPhoto'), 0); gl.uniform1i(u('uFabric'), 1);
  gl.uniform2f(u('uSize'), canvas.width, canvas.height);
  gl.uniform1f(u('uTile'), canvas.width * scale * .42);
  gl.uniform1f(u('uAspect'), fw / fh);
  gl.uniform1f(u('uMean'), info.mean);
  gl.uniform1f(u('uTop'), info.top);
  gl.uniform1i(u('uMat'), profile.id);
  gl.uniform1f(u('uContrast'), profile.contrast);
  gl.uniform1f(u('uSheen'), profile.sheen);
  gl.uniform1f(u('uDetail'), profile.detail);
  gl.uniform1f(u('uLod'), Math.max(0, Math.log2(Math.min(fw, fh)) - 3));
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  textures.forEach(t => gl.deleteTexture(t)); gl.deleteProgram(prog);
}