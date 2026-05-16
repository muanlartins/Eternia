import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { applyToonToTree, createToonGradient } from './three-utils.js';
import { buildProceduralClip, type ProceduralAnimSpec } from './procedural-anims.js';
import { applyNaiaTransforms, attachNaiaProps, isNaiaModelUrl } from './naia-model.js';

interface LoadedModel {
  root: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

async function loadAnyModel(url: string): Promise<LoadedModel> {
  const ext = url.split('.').pop()?.toLowerCase();
  if (ext === 'fbx') {
    const loader = new FBXLoader();
    const obj = (await loader.loadAsync(url)) as THREE.Group;
    return { root: obj, animations: obj.animations ?? [] };
  }
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  return { root: gltf.scene, animations: gltf.animations ?? [] };
}

export interface Character3DPortraitOptions {
  container: HTMLElement;
  modelUrl: string;
  extraAnimationUrls?: readonly string[];
  toonShading?: boolean;
  swayAmplitude?: number;
  swayPeriod?: number;
  chestRatio?: number;
  cameraDistance?: number;
  baseRotationY?: number;
  proceduralIdle?: ProceduralAnimSpec;
  enableUserRotation?: boolean;
  onLoad?: () => void;
  onLoadError?: (err: unknown) => void;
}

export class Character3DPortrait {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private outlineEffect: OutlineEffect;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private rafId: number | null = null;
  private running = false;

  private modelRoot: THREE.Object3D | null = null;
  private posBaseY = 0;
  private mixer: THREE.AnimationMixer | null = null;
  private currentAction: THREE.AnimationAction | null = null;

  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private toonGradient: THREE.DataTexture;
  private toonOn: boolean;

  private swayAmplitude: number;
  private swayPeriod: number;
  private chestRatio: number;
  private cameraDistance: number;
  private baseRotationY: number;
  private proceduralIdleSpec: ProceduralAnimSpec | null;
  private modelUrl: string;
  private bindQuaternions = new Map<THREE.Bone, THREE.Quaternion>();

  private userRotationEnabled: boolean;
  private userRotationY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartRotation = 0;
  private dragPointerId = -1;

  private resizeObs: ResizeObserver | null = null;

  constructor(opts: Character3DPortraitOptions) {
    this.container = opts.container;
    this.toonOn = opts.toonShading ?? true;
    this.swayAmplitude = opts.swayAmplitude ?? 0.18;
    this.swayPeriod = opts.swayPeriod ?? 6;
    this.chestRatio = opts.chestRatio ?? 0.62;
    this.cameraDistance = opts.cameraDistance ?? 2.4;
    this.baseRotationY = opts.baseRotationY ?? 0;
    this.proceduralIdleSpec = opts.proceduralIdle ?? null;
    this.modelUrl = opts.modelUrl;
    this.userRotationEnabled = opts.enableUserRotation ?? false;
    this.toonGradient = createToonGradient();

    const canvas = document.createElement('canvas');
    const pointerEvents = this.userRotationEnabled ? 'auto' : 'none';
    const cursor = this.userRotationEnabled ? 'grab' : 'default';
    canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:${pointerEvents};cursor:${cursor};touch-action:none;`;
    this.container.appendChild(canvas);

    if (this.userRotationEnabled) {
      canvas.addEventListener('pointerdown', this.onPointerDown);
      canvas.addEventListener('pointermove', this.onPointerMove);
      canvas.addEventListener('pointerup', this.onPointerUp);
      canvas.addEventListener('pointercancel', this.onPointerUp);
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.outlineEffect = new OutlineEffect(this.renderer, {
      defaultThickness: 0.0035,
      defaultColor: [0, 0, 0],
      defaultAlpha: 0.95,
      defaultKeepAlive: true,
    });

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const hemi = new THREE.HemisphereLight(0x8fc7a4, 0x140d10, 0.55);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff1d6, 1.25);
    key.position.set(2.5, 4, 3);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x6abf95, 0.85);
    rim.position.set(-2.5, 2, -2.5);
    this.scene.add(rim);

    const fill = new THREE.DirectionalLight(0xd4a574, 0.35);
    fill.position.set(0, 1, 5);
    this.scene.add(fill);

    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(() => this.onResize());
      this.resizeObs.observe(this.container);
    }
    window.addEventListener('resize', this.onResize);

    this.loadModel(opts.modelUrl, opts.extraAnimationUrls ?? [])
      .then(() => opts.onLoad?.())
      .catch((err) => {
        console.warn('[Character3DPortrait] failed to load:', err);
        opts.onLoadError?.(err);
      });
  }

  private async loadModel(url: string, extras: readonly string[] = []) {
    const base = await loadAnyModel(url);
    this.installModel(base);
    if (this.modelRoot && isNaiaModelUrl(this.modelUrl)) {
      await attachNaiaProps(this.modelRoot, this.modelUrl);
      if (this.toonOn) {
        applyToonToTree(this.modelRoot, this.originalMaterials, this.toonGradient);
      }
    }
    if (extras.length > 0 && this.modelRoot) {
      const results = await Promise.allSettled(extras.map((u) => loadAnyModel(u)));
      for (let i = 0; i < results.length; i++) {
        const r = results[i]!;
        if (r.status !== 'fulfilled') continue;
        const clips = r.value.animations;
        if (!clips || clips.length === 0 || !this.mixer) continue;
        for (const clip of clips) {
          const name = (extras[i]!.split('/').pop() ?? 'extra')
            .replace(/\.(fbx|glb|gltf)$/i, '');
          if (clip.name === 'mixamo.com' || !clip.name) clip.name = name;
        }
      }
    }
  }

  private installModel(loaded: LoadedModel) {
    const root = loaded.root;

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetH = 1.7;
    if (size.y > 0) {
      const scale = targetH / size.y;
      root.scale.setScalar(scale);
      box.setFromObject(root);
      box.getSize(size);
      box.getCenter(center);
      root.position.x -= center.x;
      root.position.z -= center.z;
      root.position.y -= box.min.y;
    }
    this.posBaseY = root.position.y;

    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) this.originalMaterials.set(m, m.material);
    });

    if (this.toonOn) {
      applyToonToTree(root, this.originalMaterials, this.toonGradient);
    }

    const chestY = box.min.y + size.y * this.chestRatio;
    this.camera.position.set(0, chestY, targetH * this.cameraDistance);
    this.camera.lookAt(0, chestY, 0);

    root.rotation.y = this.baseRotationY;

    if (isNaiaModelUrl(this.modelUrl)) {
      applyNaiaTransforms(root);
    }

    root.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone) this.bindQuaternions.set(b, b.quaternion.clone());
    });

    if (this.proceduralIdleSpec) {
      let skeleton: THREE.Skeleton | null = null;
      root.traverse((o) => {
        const sm = o as THREE.SkinnedMesh;
        if (sm.isSkinnedMesh && sm.skeleton) skeleton = sm.skeleton;
      });
      if (skeleton) {
        const clip = buildProceduralClip(
          this.proceduralIdleSpec,
          skeleton,
          this.bindQuaternions,
        );
        if (clip) {
          this.mixer = new THREE.AnimationMixer(root);
          this.currentAction = this.mixer.clipAction(clip);
          this.currentAction.setLoop(THREE.LoopRepeat, Infinity);
          this.currentAction.play();
        }
      }
    } else {
      const clips = loaded.animations;
      if (clips.length > 0) {
        this.mixer = new THREE.AnimationMixer(root);
        const idle =
          clips.find((c) => /idle|breath/i.test(c.name)) ?? clips[0]!;
        this.currentAction = this.mixer.clipAction(idle);
        this.currentAction.play();
      }
    }

    this.scene.add(root);
    this.modelRoot = root;
    this.onResize();
  }

  setToonShading(on: boolean) {
    this.toonOn = on;
    if (!this.modelRoot) return;
    if (on) {
      applyToonToTree(this.modelRoot, this.originalMaterials, this.toonGradient);
    } else {
      this.modelRoot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh) return;
        const orig = this.originalMaterials.get(m);
        if (orig) m.material = orig;
      });
    }
  }

  isLoaded(): boolean {
    return this.modelRoot !== null;
  }

  resetUserRotation() {
    this.userRotationY = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    this.resizeObs?.disconnect();
    window.removeEventListener('resize', this.onResize);
    if (this.userRotationEnabled) {
      const c = this.renderer.domElement;
      c.removeEventListener('pointerdown', this.onPointerDown);
      c.removeEventListener('pointermove', this.onPointerMove);
      c.removeEventListener('pointerup', this.onPointerUp);
      c.removeEventListener('pointercancel', this.onPointerUp);
    }
    if (this.modelRoot) {
      this.modelRoot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose();
        }
      });
    }
    this.toonGradient.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.isDragging) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartRotation = this.userRotationY;
    this.dragPointerId = e.pointerId;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.renderer.domElement.style.cursor = 'grabbing';
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging || e.pointerId !== this.dragPointerId) return;
    const w = this.container.clientWidth || 1;
    const dx = e.clientX - this.dragStartX;
    this.userRotationY = this.dragStartRotation + (dx / w) * Math.PI * 2;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isDragging || e.pointerId !== this.dragPointerId) return;
    this.isDragging = false;
    this.dragPointerId = -1;
    try {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {}
    this.renderer.domElement.style.cursor = 'grab';
  };

  private tick = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;

    if (this.modelRoot) {
      let sway = 0;
      if (this.swayAmplitude > 0 && !this.isDragging) {
        const phase = (t * Math.PI * 2) / this.swayPeriod;
        sway = Math.sin(phase) * this.swayAmplitude;
      }
      this.modelRoot.rotation.y =
        this.baseRotationY + this.userRotationY + sway;
      if (!this.mixer) {
        const breathPhase = (t * Math.PI * 2) / 3.5;
        this.modelRoot.position.y = this.posBaseY + Math.sin(breathPhase) * 0.008;
      }
    }

    if (this.mixer) this.mixer.update(dt);
    this.outlineEffect.render(this.scene, this.camera);
  };

}
