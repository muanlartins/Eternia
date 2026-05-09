import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { applyToonToTree, createToonGradient } from './three-utils.js';
import { buildProceduralClip, IDLE_NAIA } from './procedural-anims.js';
import { applyNaiaTransforms, attachNaiaProps } from './naia-model.js';

export interface MobLike {
  x: number;
  y: number;
  alive: boolean;
  facing: 1 | -1;
  spec: {
    width: number;
    height: number;
    model3DUrl?: string;
    baseRotationY3D?: number;
  };
}

interface MobEntry {
  obj: THREE.Object3D;
  feetOffsetY: number;
}

const PIXEL_TO_METERS = 1.7 / 96;

export class GameThreeLayer {
  readonly canvas: HTMLCanvasElement;

  private renderer: THREE.WebGLRenderer;
  private outlineEffect: OutlineEffect;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private clock = new THREE.Clock();

  private naia: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private bindQuaternions = new Map<THREE.Bone, THREE.Quaternion>();
  private toonGradient: THREE.DataTexture;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  private idleAction: THREE.AnimationAction | null = null;

  private feetOffsetY = 0;

  private gameWidth: number;
  private gameHeight: number;
  private loaded = false;

  private mobModelCache = new Map<string, THREE.Object3D>();
  private mobModelLoading = new Map<string, Promise<void>>();
  private mobs = new Map<MobLike, MobEntry>();

  constructor(container: HTMLElement, gameWidth: number, gameHeight: number) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = [
      'position: absolute',
      'inset: 0',
      'width: 100%',
      'height: 100%',
      'pointer-events: none',
      'z-index: 5',
    ].join('; ');
    container.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(gameWidth, gameHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.outlineEffect = new OutlineEffect(this.renderer, {
      defaultThickness: 0.0035,
      defaultColor: [0, 0, 0],
      defaultAlpha: 0.95,
      defaultKeepAlive: true,
    });

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const halfW = (gameWidth * PIXEL_TO_METERS) / 2;
    const halfH = (gameHeight * PIXEL_TO_METERS) / 2;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0x8fc7a4, 0x2a1f1a, 0.55);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff1d6, 0.85);
    dir.position.set(2, 4, 3);
    this.scene.add(dir);
    const rim = new THREE.DirectionalLight(0x6abf95, 0.55);
    rim.position.set(-2, 2, -2);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd4a574, 0.32);
    fill.position.set(0, 1, 5);
    this.scene.add(fill);

    this.toonGradient = createToonGradient();
  }

  async loadNaia(modelUrl: string = '/models/naia.glb'): Promise<void> {
    if (this.loaded) return;
    const ext = modelUrl.split('.').pop()?.toLowerCase();
    let obj: THREE.Object3D;
    try {
      if (ext === 'fbx') {
        const loader = new FBXLoader();
        obj = (await loader.loadAsync(modelUrl)) as THREE.Group;
      } else {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelUrl);
        obj = gltf.scene;
      }
    } catch (err) {
      console.error('[GameThreeLayer] failed to load Naia:', err);
      return;
    }

    applyNaiaTransforms(obj);

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0) {
      obj.scale.setScalar(1.7 / size.y);
    }
    box.setFromObject(obj);
    this.feetOffsetY = -box.min.y;

    await attachNaiaProps(obj);

    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) this.originalMaterials.set(m, m.material);
    });
    applyToonToTree(obj, this.originalMaterials, this.toonGradient);

    obj.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone) this.bindQuaternions.set(b, b.quaternion.clone());
    });

    let skeleton: THREE.Skeleton | null = null;
    obj.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton) skeleton = sm.skeleton;
    });
    if (skeleton) {
      this.mixer = new THREE.AnimationMixer(obj);
      const idleClip = buildProceduralClip(IDLE_NAIA, skeleton, this.bindQuaternions);
      if (idleClip) {
        this.idleAction = this.mixer.clipAction(idleClip);
        this.idleAction.setLoop(THREE.LoopRepeat, Infinity);
        this.idleAction.play();
      }
    }

    this.scene.add(obj);
    this.naia = obj;
    this.loaded = true;
  }

  sync(
    playerX: number,
    playerY: number,
    vx: number,
    facing: 1 | -1,
    onGround: boolean,
    cameraOffsetX: number,
    cameraOffsetY: number,
  ): void {
    if (!this.naia) return;

    this.naia.position.x = playerX * PIXEL_TO_METERS;
    this.naia.position.y = -playerY * PIXEL_TO_METERS + this.feetOffsetY;
    this.naia.position.z = 0;

    const camX = (-cameraOffsetX + this.gameWidth / 2) * PIXEL_TO_METERS;
    const camY = -((-cameraOffsetY + this.gameHeight / 2) * PIXEL_TO_METERS);
    this.camera.position.x = camX;
    this.camera.position.y = camY;

    this.naia.rotation.y = facing > 0 ? 0 : Math.PI;

    void vx;
    void onGround;
  }

  syncMobs(stageMobs: readonly MobLike[]): void {
    const seen = new Set<MobLike>();
    for (const mob of stageMobs) {
      seen.add(mob);
      const url = mob.spec.model3DUrl;
      if (!url) continue;

      const existing = this.mobs.get(mob);
      if (existing) {
        if (mob.alive) {
          this.updateMobTransform(existing, mob);
        } else {
          this.scene.remove(existing.obj);
          this.mobs.delete(mob);
        }
      } else if (mob.alive) {
        void this.spawnMob(mob, url);
      }
    }
    for (const [mob, entry] of this.mobs) {
      if (!seen.has(mob)) {
        this.scene.remove(entry.obj);
        this.mobs.delete(mob);
      }
    }
  }

  private async ensureMobModel(url: string): Promise<THREE.Object3D> {
    const cached = this.mobModelCache.get(url);
    if (cached) return cached;
    const loading = this.mobModelLoading.get(url);
    if (loading) {
      await loading;
      return this.mobModelCache.get(url)!;
    }
    const promise = (async () => {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      this.mobModelCache.set(url, gltf.scene);
    })();
    this.mobModelLoading.set(url, promise);
    try {
      await promise;
    } finally {
      this.mobModelLoading.delete(url);
    }
    return this.mobModelCache.get(url)!;
  }

  private async spawnMob(mob: MobLike, url: string): Promise<void> {
    let source: THREE.Object3D;
    try {
      source = await this.ensureMobModel(url);
    } catch (err) {
      console.error(`[GameThreeLayer] failed to load mob ${url}:`, err);
      return;
    }
    const obj = SkeletonUtils.clone(source);

    const targetH = mob.spec.height * PIXEL_TO_METERS;
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0) {
      obj.scale.setScalar(targetH / size.y);
    }
    box.setFromObject(obj);
    const feetOffsetY = -box.min.y;

    const localMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) localMaterials.set(m, m.material);
    });
    applyToonToTree(obj, localMaterials, this.toonGradient);

    this.scene.add(obj);
    const entry: MobEntry = { obj, feetOffsetY };
    this.mobs.set(mob, entry);
    this.updateMobTransform(entry, mob);
  }

  private updateMobTransform(entry: MobEntry, mob: MobLike): void {
    const bottomCenterX = mob.x + mob.spec.width / 2;
    const bottomY = mob.y + mob.spec.height;
    entry.obj.position.x = bottomCenterX * PIXEL_TO_METERS;
    entry.obj.position.y = -bottomY * PIXEL_TO_METERS + entry.feetOffsetY;
    entry.obj.position.z = 0;

    const baseRot = mob.spec.baseRotationY3D ?? 0;
    entry.obj.rotation.y = (mob.facing > 0 ? 0 : Math.PI) + baseRot;
  }

  playShoot(): void {}

  playHit(): void {}

  render(): void {
    const dt = this.clock.getDelta();
    if (this.mixer) this.mixer.update(dt);
    this.outlineEffect.render(this.scene, this.camera);
  }
}
