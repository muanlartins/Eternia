import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { applyToonToTree, createToonGradient, makeToon } from './three-utils.js';
import { buildProceduralClip, IDLE_NAIA } from './procedural-anims.js';
import type { ProceduralAnimSpec } from './procedural-anims.js';
import { applyNaiaTransforms, attachNaiaProps } from './naia-model.js';
import type { ShaderConfig } from './shader-config.js';

// Eager-load every saved Naia anim JSON so the runtime can pick them by `name` field.
const NAIA_ANIM_SOURCES = import.meta.glob<{ default: ProceduralAnimSpec }>(
  '../data/anim/naia/*.json',
  { eager: true },
);
function findNaiaAnim(name: string): ProceduralAnimSpec | null {
  for (const mod of Object.values(NAIA_ANIM_SOURCES)) {
    if (mod.default?.name?.toLowerCase() === name.toLowerCase()) return mod.default;
  }
  return null;
}

const MOVING_VX_THRESHOLD = 5;
const ROT_LERP = 0.18;
const ANIM_FADE_MS = 200;

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

  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private naia: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private bindQuaternions = new Map<THREE.Bone, THREE.Quaternion>();
  private toonGradient: THREE.DataTexture;
  private toonEnabled = true;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  private idleAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private moving = false;
  private baseRotationY = 0;
  private currentRotationY = 0;
  private targetRotationY = 0;

  private feetOffsetY = 0;
  private naiaOriginalSizeY = 0;
  private naiaScale = 1.4;

  private gameWidth: number;
  private gameHeight: number;
  private loaded = false;

  private mobModelCache = new Map<string, THREE.Object3D>();
  private mobModelLoading = new Map<string, Promise<void>>();
  private mobs = new Map<MobLike, MobEntry>();
  private mobsSpawning = new Set<MobLike>();

  private zoom: number;

  constructor(container: HTMLElement, gameWidth: number, gameHeight: number, zoom: number = 1) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.zoom = zoom;

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

    const halfW = (gameWidth * PIXEL_TO_METERS) / 2 / zoom;
    const halfH = (gameHeight * PIXEL_TO_METERS) / 2 / zoom;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    this.hemiLight = new THREE.HemisphereLight(0x8fc7a4, 0x2a1f1a, 0.55);
    this.scene.add(this.hemiLight);
    this.dirLight = new THREE.DirectionalLight(0xfff1d6, 0.85);
    this.dirLight.position.set(2, 4, 3);
    this.scene.add(this.dirLight);
    this.rimLight = new THREE.DirectionalLight(0x6abf95, 0.55);
    this.rimLight.position.set(-2, 2, -2);
    this.scene.add(this.rimLight);
    this.fillLight = new THREE.DirectionalLight(0xd4a574, 0.32);
    this.fillLight.position.set(0, 1, 5);
    this.scene.add(this.fillLight);

    this.toonGradient = createToonGradient();
  }

  /** Apply a ShaderConfig to lights + outline + toon ramp. Re-bakes toon materials. */
  setShaderConfig(c: ShaderConfig): void {
    this.renderer.toneMappingExposure = c.toneExposure;
    this.dirLight.intensity = c.keyIntensity;
    this.dirLight.color.set(c.keyColor);
    this.dirLight.position.set(c.keyDirX, c.keyDirY, c.keyDirZ);
    this.rimLight.intensity = c.rimIntensity;
    this.rimLight.color.set(c.rimColor);
    this.hemiLight.intensity = c.hemiIntensity;
    this.hemiLight.color.set(c.hemiSkyColor);
    this.hemiLight.groundColor.set(c.hemiGroundColor);
    this.fillLight.intensity = c.fillIntensity;
    this.fillLight.color.set(c.fillColor);
    const outlineAny = this.outlineEffect as unknown as {
      defaultThickness?: number;
      defaultAlpha?: number;
      defaultColor?: number[];
    };
    outlineAny.defaultThickness = c.outlineThickness;
    outlineAny.defaultAlpha = c.outlineAlpha;
    outlineAny.defaultColor = new THREE.Color(c.outlineColor).toArray();
    this.toonEnabled = c.toonEnabled;
    this.toonGradient = createToonGradient([c.toonBand0, c.toonBand1, c.toonBand2]);
    if (this.naia) {
      if (c.toonEnabled) {
        applyToonToTree(this.naia, this.originalMaterials, this.toonGradient);
      } else {
        this.naia.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const orig = this.originalMaterials.get(m);
          if (orig) m.material = orig;
        });
      }
    }
    // Mob models share the same toon gradient — re-bake them too.
    for (const [, entry] of this.mobs) {
      const obj = entry.obj;
      obj.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mat = m.material;
        if (Array.isArray(mat)) {
          m.material = mat.map((mm) => makeToon(mm, this.toonGradient));
        } else if (mat) {
          m.material = makeToon(mat, this.toonGradient);
        }
      });
    }
    void c;
  }

  setZoom(z: number) {
    this.zoom = z;
    const halfW = (this.gameWidth * PIXEL_TO_METERS) / 2 / z;
    const halfH = (this.gameHeight * PIXEL_TO_METERS) / 2 / z;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  setNaiaScale(meters: number) {
    this.naiaScale = meters;
    if (!this.naia || this.naiaOriginalSizeY === 0) return;
    this.naia.scale.setScalar(meters / this.naiaOriginalSizeY);
    const box = new THREE.Box3().setFromObject(this.naia);
    this.feetOffsetY = -box.min.y;
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
      this.naiaOriginalSizeY = size.y;
      obj.scale.setScalar(this.naiaScale / size.y);
    }
    box.setFromObject(obj);
    this.feetOffsetY = -box.min.y;

    await attachNaiaProps(obj, modelUrl);

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
    console.log('[GameThreeLayer] model loaded:', modelUrl);
    console.log('[GameThreeLayer] skeleton:', skeleton ? `${(skeleton as THREE.Skeleton).bones.length} bones` : 'NULL');
    if (skeleton) {
      const s = skeleton as THREE.Skeleton;
      console.log('[GameThreeLayer] sample bone names:', s.bones.slice(0, 6).map((b) => b.name));
      this.mixer = new THREE.AnimationMixer(obj);
      // Prefer a user-recorded Idle.json over the procedural fallback if one exists.
      const idleSpec = findNaiaAnim('Idle') ?? IDLE_NAIA;
      const idleClip = buildProceduralClip(idleSpec, skeleton, this.bindQuaternions);
      console.log('[GameThreeLayer] idle clip tracks:', idleClip?.tracks.length ?? 0, 'source:', idleSpec === IDLE_NAIA ? 'fallback IDLE_NAIA' : 'user Idle.json');
      if (idleClip) {
        this.idleAction = this.mixer.clipAction(idleClip);
        this.idleAction.setLoop(THREE.LoopRepeat, Infinity);
        this.idleAction.play();
      }
      const walkSpec = findNaiaAnim('Walk');
      console.log('[GameThreeLayer] walk spec found?', !!walkSpec, 'poses:', walkSpec?.poses.length);
      if (walkSpec) {
        const walkClip = buildProceduralClip(walkSpec, skeleton, this.bindQuaternions);
        console.log('[GameThreeLayer] walk clip tracks:', walkClip?.tracks.length ?? 0);
        if (walkClip) {
          this.walkAction = this.mixer.clipAction(walkClip);
          this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
          // Leave unplayed with default weight=1. setMoving(true) will reset+fadeIn+play.
          // (Pre-playing with setEffectiveWeight(0) breaks crossfade — reset() does NOT
          // restore base weight, so fadeIn's interpolant 0→1 stays multiplied by 0.)
        }
      }
      console.log(
        '[GameThreeLayer] available anim names:',
        Object.keys(NAIA_ANIM_SOURCES).map((p) => p + ' → ' + NAIA_ANIM_SOURCES[p]?.default?.name),
      );
    }

    // Rig orientation. Tripo is authored facing +X world (screen-right at rotation 0).
    // Mixamo is authored facing +Z (camera at rotation 0) — rotating +π/2 around Y
    // sends +Z forward to +X (screen right).
    if (modelUrl.toLowerCase().includes('mixamo')) {
      this.baseRotationY = Math.PI / 2;
    } else {
      this.baseRotationY = 0;
    }
    // frontY (camera-facing) = baseRotationY − π/2. Turning 90° CW from facing-right
    // lands at facing-camera (+Z) for either rig.
    this.targetRotationY = this.baseRotationY - Math.PI / 2;
    this.currentRotationY = this.targetRotationY;
    obj.rotation.y = this.currentRotationY;

    this.scene.add(obj);
    this.naia = obj;
    this.loaded = true;
  }

  /** Crossfade between idle and walk animations. Idempotent. */
  setMoving(moving: boolean): void {
    if (moving === this.moving) return;
    this.moving = moving;
    if (!this.idleAction || !this.walkAction) return;
    const fadeS = ANIM_FADE_MS / 1000;
    if (moving) {
      this.idleAction.fadeOut(fadeS);
      this.walkAction.reset().fadeIn(fadeS).play();
    } else {
      this.walkAction.fadeOut(fadeS);
      this.idleAction.reset().fadeIn(fadeS).play();
    }
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

    const camX = (-cameraOffsetX + this.gameWidth / 2) * PIXEL_TO_METERS / this.zoom;
    const camY = -((-cameraOffsetY + this.gameHeight / 2) * PIXEL_TO_METERS / this.zoom);
    this.camera.position.x = camX;
    this.camera.position.y = camY;

    const isWalking = onGround && Math.abs(vx) > MOVING_VX_THRESHOLD;
    this.setMoving(isWalking);

    // Target rotation: side-profile when walking (toward facing), camera-facing when idle.
    const sideY = this.baseRotationY + (facing > 0 ? 0 : Math.PI);
    const frontY = this.baseRotationY - Math.PI / 2;
    this.targetRotationY = isWalking ? sideY : frontY;

    // Shortest-path lerp toward target.
    let delta = this.targetRotationY - this.currentRotationY;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    this.currentRotationY += delta * ROT_LERP;
    this.naia.rotation.y = this.currentRotationY;
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
      } else if (mob.alive && !this.mobsSpawning.has(mob)) {
        this.mobsSpawning.add(mob);
        void this.spawnMob(mob, url).finally(() => {
          this.mobsSpawning.delete(mob);
        });
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

    if (!mob.alive) {
      // Mob died while model was loading — drop the mesh, never add to scene.
      return;
    }
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
