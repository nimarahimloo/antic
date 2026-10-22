import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildRoom, loadView, lighting } from '@/components/catalog/renderer/room';
import { sampleImage } from '@/components/catalog/renderer/textiles';
import { buildCurtain } from '@/components/catalog/renderer/model';
import { disposeGroup } from '@/components/catalog/renderer/mesh';
import { calibrate, targetColor } from '@/components/catalog/renderer/calibrate';

// No network rendering or AI calls: the scene is rendered on the visitor's own GPU, on demand.
export function createCurtainEngine(host, canvas, context, settings, status) {
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .97;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(settings.wall_color);
  const camera = new THREE.PerspectiveCamera(43, 4 / 3, .05, 40);
  camera.position.set(.49, 1.78, 4.14); camera.lookAt(0, 1.70, 0);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(environment, .04);
  scene.environment = environmentTarget.texture; scene.environmentIntensity = .32;
  environment.dispose(); pmrem.dispose();
  lighting(scene);
  const { view } = buildRoom(scene, settings);
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Math.min(4, renderer.capabilities.maxSamples) });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new SSAOPass(scene, camera, 1, 1);
  ao.kernelRadius = .12; ao.minDistance = .002; ao.maxDistance = .10;
  composer.addPass(ao); const output = new OutputPass(); composer.addPass(output);
  let alive = true, revision = 0, curtain = null, frame = 0;
  const render = () => {
    if (!alive || frame) return;
    frame = requestAnimationFrame(() => { frame = 0; if (alive) composer.render(); });
  };
  const resize = () => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height || !alive) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix(); renderer.setSize(width, height, false); composer.setSize(width, height); render();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  loadView(view, settings.view_image).then(() => { if (alive) render(); else view.material.map?.dispose(); });
  canvas.addEventListener('webglcontextlost', () => { if (alive) status({ error: 'نمایش سه‌بعدی متوقف شد؛ صفحه را دوباره باز کنید.' }); });
  return {
    async update(fabric, open, scale) {
      const version = ++revision;
      status({ loading: true, warning: '', calibration: null });
      if (curtain) { disposeGroup(curtain); curtain = null; }
      curtain = buildCurtain(fabric, null, settings, open, scale); scene.add(curtain); render();
      let image = null;
      if (fabric?.image) {
        image = await sampleImage(fabric.image).catch(() => {
          if (alive && version === revision) status({ warning: 'عکس پارچه بارگذاری نشد؛ فعلاً رنگ مدل نمایش داده می‌شود.' });
          return null;
        });
      }
      if (!alive || version !== revision) return;
      if (image) { disposeGroup(curtain); curtain = buildCurtain(fabric, image, settings, open, scale); scene.add(curtain); }
      const calibration = calibrate({ renderer, composer, scene, camera }, curtain, targetColor(fabric, image));
      status({ loading: false, calibration }); render();
    },
    dispose() {
      alive = false; revision++; cancelAnimationFrame(frame); observer.disconnect();
      disposeGroup(scene); environmentTarget.dispose(); ao.dispose(); output.dispose(); composer.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}