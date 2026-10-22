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

/**
 * Local GPU curtain engine.
 * Fabric image is cached; open/raise only rebuilds geometry so drag stays smooth.
 */
export function createCurtainEngine(host, canvas, context, settings, status) {
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.97;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(settings.wall_color);
  const camera = new THREE.PerspectiveCamera(43, 4 / 3, 0.05, 40);
  camera.position.set(0.49, 1.78, 4.14);
  camera.lookAt(0, 1.7, 0);

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.32;
  environment.dispose();
  pmrem.dispose();

  lighting(scene);
  const { view } = buildRoom(scene, settings);

  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new SSAOPass(scene, camera, 1, 1);
  ao.kernelRadius = 0.12;
  ao.minDistance = 0.002;
  ao.maxDistance = 0.1;
  composer.addPass(ao);
  const output = new OutputPass();
  composer.addPass(output);

  let alive = true;
  let revision = 0;
  let curtain = null;
  let frame = 0;
  let loop = 0;
  let fabricKey = '';
  let fabricRef = null;
  let imageRef = null;
  let openRef = 0.3;
  let scaleRef = 0.65;
  let motionUntil = 0;

  const render = () => {
    if (!alive || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!alive) return;
      // subtle sway while dragging / settling
      if (curtain && performance.now() < motionUntil) {
        const t = performance.now() * 0.004;
        curtain.rotation.z = Math.sin(t) * 0.008;
        curtain.position.x = Math.sin(t * 1.3) * 0.004;
      } else if (curtain) {
        curtain.rotation.z *= 0.85;
        curtain.position.x *= 0.85;
      }
      composer.render();
    });
  };

  const startMotionLoop = (ms = 600) => {
    motionUntil = performance.now() + ms;
    if (loop) return;
    const tick = () => {
      if (!alive) {
        loop = 0;
        return;
      }
      render();
      if (performance.now() < motionUntil + 200) loop = requestAnimationFrame(tick);
      else loop = 0;
    };
    loop = requestAnimationFrame(tick);
  };

  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || !alive) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  loadView(view, settings.view_image).then(() => {
    if (alive) render();
    else view.material.map?.dispose();
  });

  canvas.addEventListener('webglcontextlost', () => {
    if (alive) status({ error: 'نمایش سه‌بعدی متوقف شد؛ صفحه را دوباره باز کنید.' });
  });

  const rebuild = (fabric, image, open, scale, withCalibrate) => {
    if (curtain) {
      disposeGroup(curtain);
      curtain = null;
    }
    curtain = buildCurtain(fabric, image, settings, open, scale);
    scene.add(curtain);
    openRef = open;
    scaleRef = scale;
    if (withCalibrate) {
      const calibration = calibrate({ renderer, composer, scene, camera }, curtain, targetColor(fabric, image));
      status({ loading: false, calibration });
    }
    startMotionLoop(450);
    render();
  };

  return {
    async update(fabric, open, scale) {
      const key = fabric ? `${fabric.id || fabric.code || ''}|${fabric.image || ''}|${fabric.color_code || ''}|${fabric.category_slug || ''}` : '';
      const sameFabric = key && key === fabricKey;

      // Fast path: only openness changed — no network, keep texture
      if (sameFabric && fabricRef) {
        rebuild(fabricRef, imageRef, open, scale, false);
        return;
      }

      const version = ++revision;
      status({ loading: true, warning: '', calibration: null });
      fabricKey = key;
      fabricRef = fabric;
      imageRef = null;

      rebuild(fabric, null, open, scale, false);

      let image = null;
      if (fabric?.image) {
        image = await sampleImage(fabric.image).catch(() => {
          if (alive && version === revision) {
            status({ warning: 'عکس پارچه بارگذاری نشد؛ فعلاً رنگ مدل نمایش داده می‌شود.' });
          }
          return null;
        });
      }
      if (!alive || version !== revision) return;
      imageRef = image;
      if (image) rebuild(fabric, image, open, scale, true);
      else {
        const calibration = calibrate(
          { renderer, composer, scene, camera },
          curtain,
          targetColor(fabric, null)
        );
        status({ loading: false, calibration });
        render();
      }
    },

    /** Immediate open change for drag (no await) */
    setOpen(open) {
      if (!fabricRef) {
        openRef = open;
        return;
      }
      rebuild(fabricRef, imageRef, open, scaleRef, false);
    },

    pulseMotion(ms = 500) {
      startMotionLoop(ms);
    },

    dispose() {
      alive = false;
      revision++;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(loop);
      observer.disconnect();
      disposeGroup(scene);
      environmentTarget.dispose();
      ao.dispose();
      output.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
