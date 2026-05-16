import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { createToonGradient, makeToon } from './three-utils.js';
import {
  applyNaiaTransforms,
  attachNaiaProps,
  getBowstringRig,
  getNaiaRigKey,
  isNaiaModelUrl,
  NAIA_BOW_NAME,
  NAIA_BOW_ARROW_NAME,
  NAIA_BOWSTRING_NAME,
  NAIA_BOWSTRING_MID_NAME,
  NAIA_GLASSES_NAME,
  propTransformToJson,
} from './naia-model.js';
import savedPropOffsetsRaw from './naia-props-offsets.json';
import {
  buildProceduralClip,
  PROCEDURAL_ANIMS,
} from './procedural-anims.js';
import type { AnimMarker, Easing, Hitbox, HitboxKind, PoseExtras, ProceduralAnimSpec } from './procedural-anims.js';
import { AnimStore } from './anim-store.js';
import styles from './ThreePilot.module.css';

interface LoadedModel {
  root: THREE.Object3D;
  animations: THREE.AnimationClip[];
}

interface EditorBonePose {
  bone: string;
  euler: [number, number, number];
  pos?: [number, number, number];
  scl?: [number, number, number];
}

interface EditorPose {
  time: number;
  bones: EditorBonePose[];
  extras?: PoseExtras;
  ease?: Easing;
}

interface ShaderConfig {
  toonEnabled: boolean;
  outlineEnabled: boolean;
  toneExposure: number;
  outlineThickness: number;
  outlineAlpha: number;
  outlineColor: string;
  keyIntensity: number;
  rimIntensity: number;
  hemiIntensity: number;
  fillIntensity: number;
  keyDirX: number;
  keyDirY: number;
  keyDirZ: number;
  keyColor: string;
  rimColor: string;
  hemiSkyColor: string;
  hemiGroundColor: string;
  fillColor: string;
  toonBand0: number;
  toonBand1: number;
  toonBand2: number;
  bgMode: 'transparent' | 'solid';
  bgColor: string;
  fov: number;
  showGrid: boolean;
  showGround: boolean;
}

const DEFAULT_SHADER_CONFIG: ShaderConfig = {
  toonEnabled: true,
  outlineEnabled: true,
  toneExposure: 0.9,
  outlineThickness: 0.0035,
  outlineAlpha: 0.95,
  outlineColor: '#000000',
  keyIntensity: 0.85,
  rimIntensity: 2,
  hemiIntensity: 2,
  fillIntensity: 2,
  keyDirX: 2.5,
  keyDirY: 4,
  keyDirZ: 3,
  keyColor: '#fff1d6',
  rimColor: '#6abf95',
  hemiSkyColor: '#8fc7a4',
  hemiGroundColor: '#140d10',
  fillColor: '#d4a574',
  toonBand0: 60,
  toonBand1: 180,
  toonBand2: 240,
  bgMode: 'transparent',
  bgColor: '#0a1410',
  fov: 35,
  showGrid: true,
  showGround: true,
};

const SHADER_LS_KEY = 'eternia.editor.shaderConfig';

function loadShaderConfig(): ShaderConfig {
  try {
    const raw = localStorage.getItem(SHADER_LS_KEY);
    if (!raw) return { ...DEFAULT_SHADER_CONFIG };
    const parsed = JSON.parse(raw) as Partial<ShaderConfig>;
    return { ...DEFAULT_SHADER_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_SHADER_CONFIG };
  }
}

function saveShaderConfig(cfg: ShaderConfig): void {
  try {
    localStorage.setItem(SHADER_LS_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

async function loadAnyModel(file: File | string): Promise<LoadedModel> {
  const isFile = file instanceof File;
  const url = isFile ? URL.createObjectURL(file) : file;
  const name = isFile ? file.name : file;
  const ext = name.split('.').pop()?.toLowerCase();
  try {
    if (ext === 'fbx') {
      const loader = new FBXLoader();
      const obj = (await loader.loadAsync(url)) as THREE.Group;
      return { root: obj, animations: obj.animations ?? [] };
    }
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    return { root: gltf.scene, animations: gltf.animations ?? [] };
  } finally {
    if (isFile) URL.revokeObjectURL(url);
  }
}

export class ThreePilot {
  readonly element: HTMLElement;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private rafId: number | null = null;

  private currentRoot: THREE.Object3D | null = null;
  private currentModelLabel: string = '/models/naia-mixamo.glb';
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private currentAction: THREE.AnimationAction | null = null;
  private isPlaying = true;
  private playbackSpeed = 1;

  private toonEnabled = true;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private bindQuaternions = new Map<THREE.Bone, THREE.Quaternion>();
  private bindPositions = new Map<THREE.Bone, THREE.Vector3>();
  private bindScales = new Map<THREE.Bone, THREE.Vector3>();

  private capturedPoses: EditorPose[] = [];

  private animStore = new AnimStore();
  private currentAnimName = '';
  private currentDuration = 1;
  private currentLoop = true;
  private currentMarkers: AnimMarker[] = [];
  private currentHitboxes: Hitbox[] = [];
  private hitboxRoot: THREE.Group;
  private hitboxMeshes = new Map<string, THREE.Mesh>();
  private autoSaveTimer: number | null = null;
  private poseClipboard: {
    bones: EditorBonePose[];
    extras?: PoseExtras;
  } | null = null;
  private symMode = false;
  private activeKfIdx = -1;

  private stepFps = 0;
  private stepAccumulator = 0;

  private outlineEffect: OutlineEffect;
  private outlineEnabled = true;

  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fillLight: THREE.DirectionalLight | null = null;
  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;
  private shaderConfig: ShaderConfig = { ...DEFAULT_SHADER_CONFIG };

  private canvasEl: HTMLCanvasElement;
  private dropzoneEl: HTMLElement;
  private statusEl: HTMLElement;
  private playToggle: HTMLElement;

  private propGizmo: TransformControls | null = null;
  private attachedProp: THREE.Object3D | null = null;
  private lastUniformScale = 1;
  private statTris: HTMLElement;
  private statBones: HTMLElement;
  private statMaterials: HTMLElement;
  private statClips: HTMLElement;

  private resizeObs: ResizeObserver | null = null;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.innerHTML = `
      <div class="${styles.viewport}">
        <canvas class="${styles.canvas}" data-canvas></canvas>
        <div class="${styles.viewportHud}">
          <div class="${styles.viewportHudLeft}">
            <div class="${styles.eyebrow}">Sprint 5 · Pilot</div>
            <h1 class="${styles.title}">Câmara 3D</h1>
          </div>
          <div class="${styles.viewportHudRight}">
            <button class="${styles.closeBtn}" data-close>Fechar (F9)</button>
          </div>
        </div>
        <div class="${styles.dropzone}" data-dropzone data-active="false">
          <div class="${styles.dropzoneBox}">
            <div class="${styles.dropzoneTitle}">Solte o .glb aqui</div>
            <div class="${styles.dropzoneSub}">.glb · .gltf · até 50 MB</div>
          </div>
        </div>
        <div class="${styles.tip}">
          Arraste para orbitar · botão direito p/ pan · scroll p/ zoom
        </div>
        <div class="${styles.status}" data-status>nenhum modelo carregado</div>
      </div>
      <aside class="${styles.panel}">
        <div class="${styles.panelHead}">
          <div class="${styles.eyebrow}">Bancada de teste</div>
          <h2 class="${styles.title}" style="font-size: var(--text-lg);">Controles</h2>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Modelo</span>
          <select class="${styles.select}" data-model-select>
            <option value="/models/naia-mixamo.glb">Naia</option>
            <option value="/models/forest-sprite.glb">Forest Sprite</option>
            <option value="/models/bramble-breast.glb">Bramble Beast</option>
          </select>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-play data-active="true" style="flex: 1;">⏸ Pause</button>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Animações</span>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <select class="${styles.select}" data-anim-select style="flex:1 1 0;min-width:0;"></select>
            <button class="${styles.controlBtn}" data-anim-new title="Nova animação" style="flex:0 0 auto;">+</button>
            <button class="${styles.controlBtn}" data-anim-rename title="Renomear" style="flex:0 0 auto;">✎</button>
            <button class="${styles.controlBtn}" data-anim-delete title="Excluir" style="flex:0 0 auto;">×</button>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;">duração:</span>
            <input class="${styles.range}" type="number" min="0.1" step="0.1" data-anim-duration style="flex:1 1 0;min-width:0;">
            <span class="${styles.statLabel}" style="white-space:nowrap;">s</span>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;white-space:nowrap;">
              <input type="checkbox" data-anim-loop> loop
            </label>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <button class="${styles.controlBtn}" data-anim-play style="flex:1 1 0;">▶ Play</button>
            <button class="${styles.controlBtn}" data-anim-stop style="flex:0 0 auto;">⏹</button>
            <span class="${styles.statLabel}" style="white-space:nowrap;">×</span>
            <input type="range" min="0.25" max="2" step="0.25" value="1" data-anim-speed style="flex:1 1 0;min-width:60px;">
            <span class="${styles.statLabel}" style="white-space:nowrap;" data-anim-speed-label>1.00x</span>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <button class="${styles.controlBtn}" data-anim-save style="flex:1 1 0;">💾 Salvar em disco</button>
            <label class="${styles.fileBtn}" style="flex:0 0 auto;">
              Import
              <input type="file" accept=".json,application/json" data-anim-import-file>
            </label>
          </div>
          <div class="${styles.empty}" data-anim-status style="font-size:11px;opacity:0.6;text-align:right;">—</div>
          <div class="${styles.timelineWrap}" data-timeline>
            <svg class="${styles.timelineSvg}" data-timeline-svg></svg>
            <div class="${styles.timelineControls}">
              <button class="${styles.controlBtn}" data-timeline-distribute title="redistribui keyframes uniformemente">⇔ distribuir</button>
              <span class="${styles.statLabel}" style="margin-left:auto;">click no vão → insere · click no losango → seleciona · drag → retime · click no triângulo → cicla easing</span>
            </div>
          </div>
          <div class="${styles.posesList}" data-anim-poses-list>
            <div class="${styles.empty}">nenhuma pose capturada</div>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Bone Editor — pose ao vivo</span>
          <div class="${styles.boneDiagramWrap}">
            <svg class="${styles.boneDiagram}" data-bone-diagram preserveAspectRatio="xMidYMid meet"></svg>
          </div>
          <select class="${styles.select}" data-bonelab-bone></select>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:14px;">X</span>
            <input class="${styles.range}" type="number" step="1" min="-360" max="360" data-bonelab-x style="flex:0 0 60px;text-align:right;" placeholder="0">
            <input type="range" min="-360" max="360" step="1" value="0" data-bonelab-x-slider style="flex:1 1 0;min-width:0;">
            <span class="${styles.statLabel}" style="white-space:nowrap;">°</span>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:14px;">Y</span>
            <input class="${styles.range}" type="number" step="1" min="-360" max="360" data-bonelab-y style="flex:0 0 60px;text-align:right;" placeholder="0">
            <input type="range" min="-360" max="360" step="1" value="0" data-bonelab-y-slider style="flex:1 1 0;min-width:0;">
            <span class="${styles.statLabel}" style="white-space:nowrap;">°</span>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:14px;">Z</span>
            <input class="${styles.range}" type="number" step="1" min="-360" max="360" data-bonelab-z style="flex:0 0 60px;text-align:right;" placeholder="0">
            <input type="range" min="-360" max="360" step="1" value="0" data-bonelab-z-slider style="flex:1 1 0;min-width:0;">
            <span class="${styles.statLabel}" style="white-space:nowrap;">°</span>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:14px;">P</span>
            <input class="${styles.range}" type="number" step="0.005" data-bonelab-px style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dx">
            <input class="${styles.range}" type="number" step="0.005" data-bonelab-py style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dy">
            <input class="${styles.range}" type="number" step="0.005" data-bonelab-pz style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dz">
            <span class="${styles.statLabel}" style="white-space:nowrap;">pos</span>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:14px;">S</span>
            <input class="${styles.range}" type="number" step="0.01" min="0.05" data-bonelab-sx style="flex:1 1 0;min-width:0;text-align:right;" placeholder="1.00" value="1">
            <input class="${styles.range}" type="number" step="0.01" min="0.05" data-bonelab-sy style="flex:1 1 0;min-width:0;text-align:right;" placeholder="1.00" value="1">
            <input class="${styles.range}" type="number" step="0.01" min="0.05" data-bonelab-sz style="flex:1 1 0;min-width:0;text-align:right;" placeholder="1.00" value="1">
            <span class="${styles.statLabel}" style="white-space:nowrap;">scl</span>
          </div>
          <div class="${styles.controls}" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="${styles.statLabel}" style="white-space: nowrap;">t =</span>
            <input class="${styles.range}" type="number" min="0" max="20" step="0.05" data-anim-time style="flex: 1; min-width: 60px;" placeholder="0">
            <span class="${styles.statLabel}" style="white-space: nowrap;">s</span>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;">
            <button class="${styles.controlBtn}" data-pose-sym data-active="false" title="modo simétrico — editar um lado replica espelhado no outro automaticamente" style="flex:0 0 auto;">🪞 sym</button>
            <button class="${styles.controlBtn}" data-pose-flip title="flip — espelha pose inteira (one-shot, swap L↔R)" style="flex:0 0 auto;">⇄ flip</button>
            <button class="${styles.controlBtn}" data-pose-copy title="copiar pose (Ctrl+C)" style="flex:0 0 auto;">⎘ copy</button>
            <button class="${styles.controlBtn}" data-pose-paste title="colar pose (Ctrl+V)" style="flex:0 0 auto;">⎗ paste</button>
          </div>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-anim-add-keyframe style="flex: 2;">＋ Add Keyframe</button>
            <button class="${styles.controlBtn}" data-bonelab-reset style="flex: 1;">Bind T-pose</button>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Bulk apply · todos os keyframes</span>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <select class="${styles.select}" data-bulk-bone style="flex:1 1 0;min-width:0;">
              <option value="">— todos os bones —</option>
            </select>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:30px;">+rot</span>
            <input class="${styles.range}" type="number" step="1" data-bulk-rx style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dx°">
            <input class="${styles.range}" type="number" step="1" data-bulk-ry style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dy°">
            <input class="${styles.range}" type="number" step="1" data-bulk-rz style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dz°">
            <button class="${styles.controlBtn}" data-bulk-rot-apply style="flex:0 0 auto;">aplicar</button>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:30px;">+pos</span>
            <input class="${styles.range}" type="number" step="0.005" data-bulk-px style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dx">
            <input class="${styles.range}" type="number" step="0.005" data-bulk-py style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dy">
            <input class="${styles.range}" type="number" step="0.005" data-bulk-pz style="flex:1 1 0;min-width:0;text-align:right;" placeholder="dz">
            <button class="${styles.controlBtn}" data-bulk-pos-apply style="flex:0 0 auto;">aplicar</button>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:30px;">×scl</span>
            <input class="${styles.range}" type="number" step="0.01" min="0.1" max="5" data-bulk-scl style="flex:1 1 0;min-width:0;text-align:right;" placeholder="1.00" value="1">
            <button class="${styles.controlBtn}" data-bulk-scl-apply style="flex:0 0 auto;">aplicar</button>
            <button class="${styles.controlBtn}" data-bulk-mirror title="mirror em todos os keyframes" style="flex:0 0 auto;">🪞 mirror all</button>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Markers — combo timing</span>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-marker-add style="flex:1;">＋ Marker @ t</button>
          </div>
          <div class="${styles.posesList}" data-markers-list>
            <div class="${styles.empty}">sem markers</div>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Hitboxes — janelas de dano</span>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <select class="${styles.select}" data-hitbox-kind style="flex:1 1 0;min-width:0;">
              <option value="light">light</option>
              <option value="heavy">heavy</option>
              <option value="special">special</option>
            </select>
            <button class="${styles.controlBtn}" data-hitbox-add style="flex:0 0 auto;">＋ Hitbox</button>
          </div>
          <div class="${styles.posesList}" data-hitboxes-list>
            <div class="${styles.empty}">sem hitboxes</div>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Props — calibrar bow + glasses</span>
          <select class="${styles.select}" data-prop-target>
            <option value="">— escolha uma prop —</option>
            <option value="naia-bow">Arco (+ corda)</option>
            <option value="naia-bowstring">└─ Corda (parent)</option>
            <option value="naia-bowstring-mid">└─ Pull mid (puxar corda)</option>
            <option value="naia-glasses">Óculos</option>
          </select>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-prop-mode="translate" data-active="true" style="flex: 1;">T · Mover</button>
            <button class="${styles.controlBtn}" data-prop-mode="rotate" style="flex: 1;">R · Rotacionar</button>
            <button class="${styles.controlBtn}" data-prop-mode="scale" style="flex: 1;">S · Escalar</button>
          </div>
          <div class="${styles.controls}" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="${styles.statLabel}" style="white-space: nowrap;">pos:</span>
            <input class="${styles.range}" type="number" step="0.005" data-prop-px style="flex: 1 1 0; min-width: 0;" placeholder="X">
            <input class="${styles.range}" type="number" step="0.005" data-prop-py style="flex: 1 1 0; min-width: 0;" placeholder="Y">
            <input class="${styles.range}" type="number" step="0.005" data-prop-pz style="flex: 1 1 0; min-width: 0;" placeholder="Z">
          </div>
          <div class="${styles.controls}" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="${styles.statLabel}" style="white-space: nowrap;">rot:</span>
            <input class="${styles.range}" type="number" step="1" data-prop-rx style="flex: 1 1 0; min-width: 0;" placeholder="X°">
            <input class="${styles.range}" type="number" step="1" data-prop-ry style="flex: 1 1 0; min-width: 0;" placeholder="Y°">
            <input class="${styles.range}" type="number" step="1" data-prop-rz style="flex: 1 1 0; min-width: 0;" placeholder="Z°">
          </div>
          <div class="${styles.controls}" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="${styles.statLabel}" style="white-space: nowrap;">scale:</span>
            <input class="${styles.range}" type="number" step="0.05" data-prop-scale style="flex: 1 1 0; min-width: 0;" placeholder="1.0">
          </div>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-prop-save style="flex: 1;">Copiar offsets → JSON</button>
            <button class="${styles.controlBtn}" data-prop-reset style="flex: 1;">Reset</button>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Shader Dev — luz · outline · toon</span>
          <div class="${styles.controls}" style="display:flex;gap:var(--space-2);">
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;">
              <input type="checkbox" data-shdr-toon> toon
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;">
              <input type="checkbox" data-shdr-outline> outline
            </label>
            <button class="${styles.controlBtn}" data-shdr-reset style="margin-left:auto;flex:0 0 auto;">reset</button>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">expo</span>
            <input type="range" min="0.3" max="2" step="0.05" data-shdr-expo-slider style="flex:1 1 0;min-width:0;">
            <input class="${styles.range}" type="number" step="0.05" data-shdr-expo style="flex:0 0 56px;text-align:right;">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">key</span>
            <input type="range" min="0" max="3" step="0.05" data-shdr-key-slider style="flex:1 1 0;min-width:0;">
            <input class="${styles.range}" type="number" step="0.05" data-shdr-key style="flex:0 0 56px;text-align:right;">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">rim</span>
            <input type="range" min="0" max="3" step="0.05" data-shdr-rim-slider style="flex:1 1 0;min-width:0;">
            <input class="${styles.range}" type="number" step="0.05" data-shdr-rim style="flex:0 0 56px;text-align:right;">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">hemi</span>
            <input type="range" min="0" max="3" step="0.05" data-shdr-hemi-slider style="flex:1 1 0;min-width:0;">
            <input class="${styles.range}" type="number" step="0.05" data-shdr-hemi style="flex:0 0 56px;text-align:right;">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">fill</span>
            <input type="range" min="0" max="3" step="0.05" data-shdr-fill-slider style="flex:1 1 0;min-width:0;">
            <input class="${styles.range}" type="number" step="0.05" data-shdr-fill style="flex:0 0 56px;text-align:right;">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">key dir</span>
            <input class="${styles.range}" type="number" step="0.1" data-shdr-kx style="flex:1 1 0;min-width:0;text-align:right;" placeholder="X">
            <input class="${styles.range}" type="number" step="0.1" data-shdr-ky style="flex:1 1 0;min-width:0;text-align:right;" placeholder="Y">
            <input class="${styles.range}" type="number" step="0.1" data-shdr-kz style="flex:1 1 0;min-width:0;text-align:right;" placeholder="Z">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">outline</span>
            <input type="range" min="0" max="0.012" step="0.0005" data-shdr-thick-slider style="flex:1 1 0;min-width:0;">
            <input class="${styles.range}" type="number" step="0.0005" data-shdr-thick style="flex:0 0 64px;text-align:right;" title="thickness">
            <input class="${styles.range}" type="number" min="0" max="1" step="0.05" data-shdr-alpha style="flex:0 0 56px;text-align:right;" title="alpha">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">toon ramp</span>
            <input class="${styles.range}" type="number" min="0" max="255" step="5" data-shdr-band0 style="flex:1 1 0;min-width:0;text-align:right;" title="shadow band 0..255">
            <input class="${styles.range}" type="number" min="0" max="255" step="5" data-shdr-band1 style="flex:1 1 0;min-width:0;text-align:right;" title="mid band">
            <input class="${styles.range}" type="number" min="0" max="255" step="5" data-shdr-band2 style="flex:1 1 0;min-width:0;text-align:right;" title="highlight band">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">colors</span>
            <label style="display:flex;align-items:center;gap:2px;font-size:9px;">key<input type="color" data-shdr-key-color style="width:22px;height:18px;padding:0;border:0;background:transparent;"></label>
            <label style="display:flex;align-items:center;gap:2px;font-size:9px;">rim<input type="color" data-shdr-rim-color style="width:22px;height:18px;padding:0;border:0;background:transparent;"></label>
            <label style="display:flex;align-items:center;gap:2px;font-size:9px;">hSky<input type="color" data-shdr-hemi-sky style="width:22px;height:18px;padding:0;border:0;background:transparent;"></label>
            <label style="display:flex;align-items:center;gap:2px;font-size:9px;">hGr<input type="color" data-shdr-hemi-gr style="width:22px;height:18px;padding:0;border:0;background:transparent;"></label>
            <label style="display:flex;align-items:center;gap:2px;font-size:9px;">fill<input type="color" data-shdr-fill-color style="width:22px;height:18px;padding:0;border:0;background:transparent;"></label>
            <label style="display:flex;align-items:center;gap:2px;font-size:9px;">out<input type="color" data-shdr-outline-color style="width:22px;height:18px;padding:0;border:0;background:transparent;"></label>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">scene</span>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;">
              <input type="checkbox" data-shdr-bg-solid> bg solid
            </label>
            <input type="color" data-shdr-bg-color style="flex:0 0 28px;height:18px;padding:0;border:0;background:transparent;">
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;margin-left:auto;">
              <input type="checkbox" data-shdr-grid> grid
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:11px;">
              <input type="checkbox" data-shdr-ground> ground
            </label>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <span class="${styles.statLabel}" style="white-space:nowrap;width:48px;">FOV</span>
            <input type="range" min="20" max="80" step="1" data-shdr-fov-slider style="flex:1 1 0;min-width:0;">
            <input class="${styles.range}" type="number" min="20" max="80" step="1" data-shdr-fov style="flex:0 0 56px;text-align:right;">
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <input class="${styles.select}" type="text" data-shdr-mat-url placeholder="/models/naia.glb" style="flex:1 1 0;min-width:0;">
            <button class="${styles.controlBtn}" data-shdr-mat-pull title="aplica os materials/texturas de outro GLB no rig atual (preserva mesh+skin)" style="flex:0 0 auto;">Pull mats</button>
          </div>
          <div class="${styles.controls}" style="display:flex;align-items:center;gap:var(--space-2);">
            <button class="${styles.controlBtn}" data-shdr-preset-copy title="copia config atual pra clipboard como JSON" style="flex:1 1 0;">📋 export preset</button>
            <button class="${styles.controlBtn}" data-shdr-preset-paste title="cola preset JSON do clipboard" style="flex:1 1 0;">📥 import preset</button>
          </div>
        </div>

        <div class="${styles.stats}">
          <div class="${styles.stat}">
            <div class="${styles.statLabel}">Triângulos</div>
            <div class="${styles.statValue}" data-stat-tris>—</div>
          </div>
          <div class="${styles.stat}">
            <div class="${styles.statLabel}">Bones</div>
            <div class="${styles.statValue}" data-stat-bones>—</div>
          </div>
          <div class="${styles.stat}">
            <div class="${styles.statLabel}">Materiais</div>
            <div class="${styles.statValue}" data-stat-mats>—</div>
          </div>
          <div class="${styles.stat}">
            <div class="${styles.statLabel}">Clipes</div>
            <div class="${styles.statValue}" data-stat-clips>—</div>
          </div>
        </div>
      </aside>
    `;
    this.element = root;

    this.canvasEl = root.querySelector('[data-canvas]') as HTMLCanvasElement;
    this.dropzoneEl = root.querySelector('[data-dropzone]') as HTMLElement;
    this.statusEl = root.querySelector('[data-status]') as HTMLElement;
    this.playToggle = root.querySelector('[data-play]') as HTMLElement;
    this.statTris = root.querySelector('[data-stat-tris]') as HTMLElement;
    this.statBones = root.querySelector('[data-stat-bones]') as HTMLElement;
    this.statMaterials = root.querySelector('[data-stat-mats]') as HTMLElement;
    this.statClips = root.querySelector('[data-stat-clips]') as HTMLElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasEl,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.outlineEffect = new OutlineEffect(this.renderer, {
      defaultThickness: 0.0035,
      defaultColor: [0, 0, 0],
      defaultAlpha: 0.95,
      defaultKeepAlive: true,
    });

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x0a1410, 8, 22);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(2.5, 1.7, 3.2);

    this.controls = new OrbitControls(this.camera, this.canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.9, 0);
    this.controls.minDistance = 1;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI * 0.49;

    this.hemiLight = new THREE.HemisphereLight(0x8fc7a4, 0x140d10, 0.4);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff1d6, 0.85);
    this.dirLight.position.set(2.5, 4, 3);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 12;
    this.dirLight.shadow.camera.left = -3;
    this.dirLight.shadow.camera.right = 3;
    this.dirLight.shadow.camera.top = 3;
    this.dirLight.shadow.camera.bottom = -3;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.DirectionalLight(0x6abf95, 0.55);
    this.rimLight.position.set(-2.5, 2, -2.5);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0xd4a574, 0.2);
    this.fillLight.position.set(0, 1, 5);
    this.scene.add(this.fillLight);

    this.shaderConfig = loadShaderConfig();
    this.applyShaderConfig();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x16271f,
      roughness: 0.95,
      metalness: 0,
    });
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(8, 64), groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.grid = new THREE.GridHelper(8, 16, 0x2e8b57, 0x1f3a30);
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.45;
    this.grid.position.y = 0.001;
    this.scene.add(this.grid);

    this.propGizmo = new TransformControls(this.camera, this.canvasEl);
    this.propGizmo.setSpace('local');
    this.propGizmo.setSize(0.7);
    this.propGizmo.addEventListener('dragging-changed', (e) => {
      this.controls.enabled = !(e.value as boolean);
      if (!e.value && this.attachedProp?.name === NAIA_BOWSTRING_MID_NAME) {
        this.captureCurrentState();
      }
    });
    this.propGizmo.addEventListener('change', () => {
      this.enforceUniformScale();
      this.refreshPropInputs();
      if (this.attachedProp?.name === NAIA_BOWSTRING_MID_NAME && this.currentRoot) {
        const rig = getBowstringRig(this.currentRoot);
        if (rig) rig.setArrowVisible(midPullIsDrawn(rig.getMidPullLocal()));
      }
    });
    const gizmoHelper = (this.propGizmo as unknown as { getHelper?: () => THREE.Object3D }).getHelper?.();
    this.scene.add(gizmoHelper ?? (this.propGizmo as unknown as THREE.Object3D));

    this.hitboxRoot = new THREE.Group();
    this.hitboxRoot.name = '__hitbox-root';
    this.scene.add(this.hitboxRoot);

    this.spawnPlaceholder();
    this.bindEvents();

    void this.loadModel('/models/naia-mixamo.glb', [])
      .then(() => {
        if (this.currentAnimName && this.activeKfIdx >= 0) {
          this.applyKeyframeToModel(this.activeKfIdx);
        } else {
          this.playProceduralAnim('proc-idle-breath');
          this.markProcAnimButtonActive('proc-idle-breath');
        }
      })
      .catch(() => {
        this.setStatus('drop um .fbx ou .glb na viewport');
      });
  }

  async upgradeTexturesFromTripo(url: string): Promise<void> {
    if (!this.currentRoot) return;
    let tripoMats: THREE.Material[] = [];
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      gltf.scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh && m.material) {
          if (Array.isArray(m.material)) tripoMats.push(...m.material);
          else tripoMats.push(m.material);
        }
      });
    } catch {
      return;
    }
    if (tripoMats.length === 0) {
      console.warn('[ThreePilot] Tripo glb loaded but had no materials');
      return;
    }

    let upgraded = false;
    this.currentRoot.traverse((obj) => {
      const sm = obj as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const newMat = tripoMats.length === 1 ? tripoMats[0]! : tripoMats;
      this.originalMaterials.set(sm, newMat);
      sm.material = newMat;
      upgraded = true;
    });

    if (upgraded && this.toonEnabled) this.applyToon(true);

    if (upgraded) {
      this.setStatus(`texturas Tripo aplicadas (${tripoMats.length} mats)`);
      console.log(
        `[ThreePilot] Tripo texture upgrade: ${tripoMats.length} material(s) applied to SkinnedMesh`,
      );
    }
  }

  private markProcAnimButtonActive(specName: string) {
    const btns = this.element.querySelectorAll<HTMLElement>('[data-procanim]');
    for (const b of btns) {
      b.dataset.active = b.dataset.procanim === specName ? 'true' : 'false';
    }
  }

  inspectModel(): void {
    if (!this.currentRoot) {
      console.warn('[ThreePilot] no model loaded');
      this.setStatus('nada carregado');
      return;
    }
    console.group('[ThreePilot] model inspection');

    console.group('Bones (hierarchy)');
    const printBone = (b: THREE.Bone, depth: number) => {
      console.log(`${'  '.repeat(depth)}${b.name}`);
      for (const c of b.children) {
        if ((c as THREE.Bone).isBone) printBone(c as THREE.Bone, depth + 1);
      }
    };
    const roots: THREE.Bone[] = [];
    this.currentRoot.traverse((obj) => {
      const b = obj as THREE.Bone;
      if (b.isBone && (!b.parent || !(b.parent as THREE.Bone).isBone)) roots.push(b);
    });
    for (const r of roots) printBone(r, 0);
    console.groupEnd();

    console.group('Materials');
    const materials = new Set<THREE.Material>();
    let meshCount = 0;
    this.currentRoot.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        meshCount++;
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((mm) => materials.add(mm));
        else if (mat) materials.add(mat);
      }
    });
    console.log(`meshes: ${meshCount}, materials: ${materials.size}`);
    for (const m of materials) {
      const std = m as THREE.MeshStandardMaterial;
      const img = (std.map?.image ?? null) as { width?: number; height?: number } | null;
      const mapInfo = std.map
        ? `${img?.width ?? '?'}×${img?.height ?? '?'}`
        : 'NONE (texture missing)';
      console.log(
        `  "${m.name || '(unnamed)'}" type=${m.type} color=#${std.color?.getHexString() ?? '?'} map=${mapInfo}`,
      );
    }
    console.groupEnd();

    console.groupEnd();
    this.setStatus(
      `inspecionado · veja console (F12) · meshes ${meshCount} · materials ${materials.size}`,
    );
  }

  applyBoneTest(bonePattern: string, axis: 'x' | 'y' | 'z', degrees: number): void {
    if (!this.currentRoot) {
      this.setStatus('carregue um modelo base primeiro');
      return;
    }
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    let target: THREE.Bone | null = null;
    for (const [bone] of this.bindQuaternions) {
      if (bone.name === bonePattern) {
        target = bone;
        break;
      }
    }
    if (!target) {
      const re = new RegExp(`${bonePattern}$`, 'i');
      for (const [bone] of this.bindQuaternions) {
        if (re.test(bone.name)) {
          target = bone;
          break;
        }
      }
    }
    if (!target) {
      this.setStatus(`bone não encontrado: ${bonePattern}`);
      return;
    }
    const rad = THREE.MathUtils.degToRad(degrees);
    const deltaQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        axis === 'x' ? rad : 0,
        axis === 'y' ? rad : 0,
        axis === 'z' ? rad : 0,
        'XYZ',
      ),
    );
    const bindQ = this.bindQuaternions.get(target);
    if (bindQ) {
      target.quaternion.copy(bindQ).multiply(deltaQ);
    } else {
      target.quaternion.copy(deltaQ);
    }
    this.setStatus(`bone test: ${target.name}.${axis} = ${degrees}° (delta from bind)`);
  }

  private populateBoneLabDropdown(): void {
    const select = this.element.querySelector<HTMLSelectElement>('[data-bonelab-bone]');
    if (!select) return;
    const bones = Array.from(this.bindQuaternions.keys());
    const priority = (name: string): number => {
      const lower = name.toLowerCase();
      if (/upleg|thigh/.test(lower)) return 0;
      if (/leg|shin|knee/.test(lower)) return 1;
      if (/arm/.test(lower) && !/forearm/.test(lower)) return 2;
      if (/forearm/.test(lower)) return 3;
      if (/spine/.test(lower)) return 4;
      if (/hips|pelvis/.test(lower)) return 5;
      if (/head/.test(lower)) return 6;
      return 99;
    };
    bones.sort((a, b) => {
      const pa = priority(a.name);
      const pb = priority(b.name);
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
    select.innerHTML = '';
    for (const bone of bones) {
      const opt = document.createElement('option');
      opt.value = bone.name;
      opt.textContent = bone.name;
      select.appendChild(opt);
    }
  }

  /** Live-write current model state to the active keyframe. Called after every edit. */
  captureCurrentState(): void {
    if (this.activeKfIdx < 0 || !this.currentRoot) return;
    const kf = this.capturedPoses[this.activeKfIdx];
    if (!kf) return;
    const changed: EditorBonePose[] = [];
    const tmpInv = new THREE.Quaternion();
    const tmpDelta = new THREE.Quaternion();
    const tmpEuler = new THREE.Euler();
    for (const [bone, bindQ] of this.bindQuaternions) {
      tmpInv.copy(bindQ).invert();
      tmpDelta.copy(tmpInv).multiply(bone.quaternion);
      tmpEuler.setFromQuaternion(tmpDelta, 'XYZ');
      const dx = THREE.MathUtils.radToDeg(tmpEuler.x);
      const dy = THREE.MathUtils.radToDeg(tmpEuler.y);
      const dz = THREE.MathUtils.radToDeg(tmpEuler.z);
      const hasRot = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(dz) > 0.5;

      let posDelta: [number, number, number] | null = null;
      const bindP = this.bindPositions.get(bone);
      if (bindP) {
        const dpx = bone.position.x - bindP.x;
        const dpy = bone.position.y - bindP.y;
        const dpz = bone.position.z - bindP.z;
        if (Math.abs(dpx) > 0.001 || Math.abs(dpy) > 0.001 || Math.abs(dpz) > 0.001) {
          posDelta = [
            Math.round(dpx * 10000) / 10000,
            Math.round(dpy * 10000) / 10000,
            Math.round(dpz * 10000) / 10000,
          ];
        }
      }

      let sclVal: [number, number, number] | null = null;
      const bindS = this.bindScales.get(bone);
      if (bindS && bindS.x !== 0 && bindS.y !== 0 && bindS.z !== 0) {
        const rx = bone.scale.x / bindS.x;
        const ry = bone.scale.y / bindS.y;
        const rz = bone.scale.z / bindS.z;
        if (
          Math.abs(rx - 1) > 0.005 ||
          Math.abs(ry - 1) > 0.005 ||
          Math.abs(rz - 1) > 0.005
        ) {
          sclVal = [
            Math.round(rx * 1000) / 1000,
            Math.round(ry * 1000) / 1000,
            Math.round(rz * 1000) / 1000,
          ];
        }
      }

      if (hasRot || posDelta || sclVal) {
        const entry: EditorBonePose = {
          bone: bone.name,
          euler: [
            Math.round(dx * 10) / 10,
            Math.round(dy * 10) / 10,
            Math.round(dz * 10) / 10,
          ],
        };
        if (posDelta) entry.pos = posDelta;
        if (sclVal) entry.scl = sclVal;
        changed.push(entry);
      }
    }
    kf.bones = changed;
    const extras = this.captureExtras();
    if (extras) kf.extras = extras;
    else delete kf.extras;
    this.renderPosesList();
    this.renderTimeline();
    this.queueAutoSave();
  }

  /** Apply a keyframe to the model state (visual). Active keyframe = source of truth. */
  private applyKeyframeToModel(idx: number): void {
    if (idx < 0 || idx >= this.capturedPoses.length || !this.currentRoot) return;
    const kf = this.capturedPoses[idx]!;
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    for (const [bone, q] of this.bindQuaternions) bone.quaternion.copy(q);
    for (const [bone, p] of this.bindPositions) bone.position.copy(p);
    for (const [bone, s] of this.bindScales) bone.scale.copy(s);
    for (const br of kf.bones) {
      const bone = this.findBoneByName(br.bone);
      if (!bone) continue;
      const bindQ = this.bindQuaternions.get(bone);
      const deltaQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(br.euler[0]),
          THREE.MathUtils.degToRad(br.euler[1]),
          THREE.MathUtils.degToRad(br.euler[2]),
          'XYZ',
        ),
      );
      if (bindQ) bone.quaternion.copy(bindQ).multiply(deltaQ);
      else bone.quaternion.copy(deltaQ);
      if (br.pos) {
        const bindP = this.bindPositions.get(bone);
        if (bindP) {
          bone.position.set(
            bindP.x + br.pos[0],
            bindP.y + br.pos[1],
            bindP.z + br.pos[2],
          );
        }
      }
      if (br.scl) {
        const bindS = this.bindScales.get(bone);
        if (bindS) {
          bone.scale.set(
            bindS.x * br.scl[0],
            bindS.y * br.scl[1],
            bindS.z * br.scl[2],
          );
        }
      }
    }
    if (kf.extras) {
      this.applyExtrasToScene(kf.extras);
    } else {
      const rig = getBowstringRig(this.currentRoot);
      if (rig) {
        rig.setMidPullLocal({ x: 0, y: 0, z: 0 });
        rig.setArrowVisible(false);
      }
    }
    const animTimeInput = this.element.querySelector<HTMLInputElement>('[data-anim-time]');
    if (animTimeInput) animTimeInput.value = kf.time.toFixed(2);
    this.refreshBoneEditorInputs();
    this.renderBoneDiagram();
    this.renderTimeline();
  }

  makeKeyframeActive(idx: number): void {
    if (idx < 0 || idx >= this.capturedPoses.length) return;
    this.activeKfIdx = idx;
    this.applyKeyframeToModel(idx);
    this.renderPosesList();
  }

  addNewKeyframe(): void {
    if (!this.currentAnimName) {
      this.setStatus('crie uma animação primeiro');
      return;
    }
    let newTime = 0;
    if (this.capturedPoses.length > 0) {
      const lastT = Math.max(...this.capturedPoses.map((p) => p.time));
      newTime = lastT + 0.15;
    }
    const used = new Set(this.capturedPoses.map((p) => Number(p.time.toFixed(3))));
    while (used.has(Number(newTime.toFixed(3)))) newTime += 0.05;
    newTime = Math.round(newTime * 1000) / 1000;
    const newKf: typeof this.capturedPoses[number] = { time: newTime, bones: [] };
    this.capturedPoses.push(newKf);
    this.capturedPoses.sort((a, b) => a.time - b.time);
    this.activeKfIdx = this.capturedPoses.indexOf(newKf);
    this.applyKeyframeToModel(this.activeKfIdx);
    this.renderPosesList();
    this.queueAutoSave();
    this.setStatus(`novo keyframe @ t=${newTime.toFixed(2)}s (T-pose, ativo)`);
  }

  /** Ensure anim has at least one keyframe; create a T-pose at t=0 if empty. */
  private ensureInitialKeyframe(): void {
    if (this.capturedPoses.length === 0) {
      this.capturedPoses.push({ time: 0, bones: [] });
    }
    if (this.activeKfIdx < 0 || this.activeKfIdx >= this.capturedPoses.length) {
      this.activeKfIdx = 0;
    }
  }

  private captureExtras(): PoseExtras | null {
    if (!this.currentRoot) return null;
    const rig = getBowstringRig(this.currentRoot);
    if (!rig) return null;
    const mid = rig.getMidPullLocal();
    const out: PoseExtras = {
      bowMidPull: [
        Math.round(mid.x * 10000) / 10000,
        Math.round(mid.y * 10000) / 10000,
        Math.round(mid.z * 10000) / 10000,
      ],
    };
    out.arrowVisible = midPullIsDrawn(mid);
    return out;
  }

  private applyExtrasToScene(extras: PoseExtras | undefined): void {
    if (!this.currentRoot) return;
    const rig = getBowstringRig(this.currentRoot);
    if (!rig) return;
    if (extras?.bowMidPull) {
      rig.setMidPullLocal({
        x: extras.bowMidPull[0],
        y: extras.bowMidPull[1],
        z: extras.bowMidPull[2],
      });
    }
    const visible = extras?.arrowVisible
      ?? midPullIsDrawn(rig.getMidPullLocal());
    rig.setArrowVisible(visible);
  }

  private renderPosesList(): void {
    const el = this.element.querySelector<HTMLElement>('[data-anim-poses-list]');
    if (!el) return;
    if (this.capturedPoses.length === 0) {
      el.innerHTML = `<div class="${styles.empty}">sem keyframes</div>`;
      return;
    }
    el.innerHTML = this.capturedPoses
      .map((p, idx) => {
        const bones = p.bones
          .map((b) => {
            const extras: string[] = [];
            if (b.pos) extras.push(`📐[${b.pos[0].toFixed(3)}, ${b.pos[1].toFixed(3)}, ${b.pos[2].toFixed(3)}]`);
            if (b.scl) extras.push(`⇲[${b.scl[0].toFixed(2)}, ${b.scl[1].toFixed(2)}, ${b.scl[2].toFixed(2)}]`);
            return `
              <div class="${styles.poseBoneRow}">
                <span class="${styles.poseBoneName}">${b.bone.replace(/^mixamorig/, '')}</span>
                <span class="${styles.poseBoneEuler}">[${b.euler[0].toFixed(1)}, ${b.euler[1].toFixed(1)}, ${b.euler[2].toFixed(1)}]${extras.length ? ' · ' + extras.join(' ') : ''}</span>
              </div>`;
          })
          .join('');
        const active = idx === this.activeKfIdx;
        const easeBadge = p.ease && p.ease !== 'linear' ? ` · ${p.ease}` : '';
        return `
          <div class="${styles.poseRow}" data-pose-idx="${idx}" data-selected="${active}" style="cursor:pointer;">
            <div class="${styles.poseRowHead}">
              <span class="${styles.poseTime}">${active ? '● ' : ''}t=${p.time.toFixed(2)}s${easeBadge}</span>
              <span class="${styles.poseCount}">${p.bones.length} bones${p.extras?.bowMidPull ? ' · 🏹' : ''}</span>
              <button class="${styles.poseRowBtn}" data-pose-duplicate="${idx}" title="duplicar">⎘</button>
              <button class="${styles.poseRowBtn} ${styles.poseRowBtnDel}" data-pose-delete="${idx}" title="deletar">×</button>
            </div>
            ${
              p.bones.length > 0
                ? `<div class="${styles.poseBones}">${bones}</div>`
                : ''
            }
          </div>`;
      })
      .join('');
    for (const row of el.querySelectorAll<HTMLElement>('[data-pose-idx]')) {
      row.addEventListener('click', () => {
        this.makeKeyframeActive(Number(row.dataset.poseIdx));
      });
    }
    for (const btn of el.querySelectorAll<HTMLElement>('[data-pose-duplicate]')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.duplicateKeyframeAtIdx(Number(btn.dataset.poseDuplicate));
      });
    }
    for (const btn of el.querySelectorAll<HTMLElement>('[data-pose-delete]')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteKeyframeAtIdx(Number(btn.dataset.poseDelete));
      });
    }
  }

  duplicateKeyframeAtIdx(idx: number): void {
    if (idx < 0 || idx >= this.capturedPoses.length) return;
    const src = this.capturedPoses[idx]!;
    const used = new Set(this.capturedPoses.map((p) => Number(p.time.toFixed(3))));
    let nt = src.time + 0.15;
    while (used.has(Number(nt.toFixed(3)))) nt += 0.05;
    nt = Math.round(nt * 1000) / 1000;
    const clone: EditorPose = {
      time: nt,
      bones: src.bones.map((b) => {
        const out: EditorBonePose = {
          bone: b.bone,
          euler: [b.euler[0], b.euler[1], b.euler[2]],
        };
        if (b.pos) out.pos = [b.pos[0], b.pos[1], b.pos[2]];
        if (b.scl) out.scl = [b.scl[0], b.scl[1], b.scl[2]];
        return out;
      }),
    };
    if (src.extras) clone.extras = { ...src.extras };
    if (src.ease) clone.ease = src.ease;
    this.capturedPoses.push(clone);
    this.capturedPoses.sort((a, b) => a.time - b.time);
    this.activeKfIdx = this.capturedPoses.indexOf(clone);
    this.applyKeyframeToModel(this.activeKfIdx);
    this.renderPosesList();
    this.renderTimeline();
    this.queueAutoSave();
    this.setStatus(`keyframe duplicado em t=${nt.toFixed(2)}s (ativo)`);
  }

  deleteKeyframeAtIdx(idx: number): void {
    if (idx < 0 || idx >= this.capturedPoses.length) return;
    if (!window.confirm(`Excluir keyframe t=${this.capturedPoses[idx]!.time.toFixed(2)}s?`)) return;
    this.capturedPoses.splice(idx, 1);
    if (this.capturedPoses.length === 0) {
      this.capturedPoses.push({ time: 0, bones: [] });
      this.activeKfIdx = 0;
    } else {
      if (this.activeKfIdx === idx) {
        this.activeKfIdx = Math.min(idx, this.capturedPoses.length - 1);
      } else if (this.activeKfIdx > idx) {
        this.activeKfIdx -= 1;
      }
    }
    this.applyKeyframeToModel(this.activeKfIdx);
    this.renderPosesList();
    this.renderTimeline();
    this.queueAutoSave();
  }


  private findBoneByName(name: string): THREE.Bone | null {
    for (const [bone] of this.bindQuaternions) {
      if (bone.name === name) return bone;
    }
    return null;
  }

  importPosesFromJSON(json: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      this.setStatus('JSON inválido — veja console');
      console.error('[ThreePilot] import parse error:', err);
      return;
    }
    const spec = parsed as {
      poses?: {
        time: number;
        ease?: Easing;
        bones: {
          bone: string;
          euler: [number, number, number];
          pos?: [number, number, number];
          scl?: [number, number, number];
        }[];
      }[];
    };
    if (!spec.poses || !Array.isArray(spec.poses)) {
      this.setStatus('JSON sem campo "poses"');
      return;
    }
    this.capturedPoses = spec.poses
      .filter((p) => typeof p.time === 'number' && Array.isArray(p.bones))
      .map((p) => {
        const out: EditorPose = {
          time: p.time,
          bones: p.bones.map((b) => {
            const bone: EditorBonePose = {
              bone: String(b.bone),
              euler: [
                Number(b.euler?.[0] ?? 0),
                Number(b.euler?.[1] ?? 0),
                Number(b.euler?.[2] ?? 0),
              ],
            };
            if (Array.isArray(b.pos) && b.pos.length === 3) {
              bone.pos = [Number(b.pos[0]), Number(b.pos[1]), Number(b.pos[2])];
            }
            if (Array.isArray(b.scl) && b.scl.length === 3) {
              bone.scl = [Number(b.scl[0]), Number(b.scl[1]), Number(b.scl[2])];
            }
            return bone;
          }),
        };
        if (p.ease) out.ease = p.ease;
        return out;
      })
      .sort((a, b) => a.time - b.time);
    this.renderPosesList();
    this.renderTimeline();
    this.setStatus(`importadas ${this.capturedPoses.length} poses · click ▶ Play timeline`);
  }

  playCapturedTimeline(): void {
    if (this.capturedPoses.length === 0 || !this.currentRoot) {
      this.setStatus('nenhuma pose capturada');
      return;
    }
    let skeleton: THREE.Skeleton | null = null;
    this.currentRoot.traverse((obj) => {
      const sm = obj as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton) skeleton = sm.skeleton;
    });
    if (!skeleton) {
      this.setStatus('skeleton não encontrado');
      return;
    }
    const duration = Math.max(...this.capturedPoses.map((p) => p.time)) || 1;

    const allBoneNames = new Set<string>();
    for (const pose of this.capturedPoses) {
      for (const b of pose.bones) allBoneNames.add(b.bone);
    }
    if (allBoneNames.size === 0) {
      this.setStatus('todas as poses estão vazias — capture rotações primeiro');
      return;
    }
    const expandedPoses: ProceduralAnimSpec['poses'] = this.capturedPoses.map((pose) => {
      const bones: ProceduralAnimSpec['poses'][number]['bones'] = Array.from(allBoneNames).map((name) => {
        const found = pose.bones.find((b) => b.bone === name);
        const out: ProceduralAnimSpec['poses'][number]['bones'][number] = {
          bone: name,
          euler: (found?.euler ?? [0, 0, 0]) as [number, number, number],
        };
        if (found?.pos) out.pos = [found.pos[0], found.pos[1], found.pos[2]];
        if (found?.scl) out.scl = [found.scl[0], found.scl[1], found.scl[2]];
        return out;
      });
      const expanded: ProceduralAnimSpec['poses'][number] = { time: pose.time, bones };
      if (pose.ease) expanded.ease = pose.ease;
      return expanded;
    });

    const spec: ProceduralAnimSpec = {
      name: 'proc-custom-timeline',
      duration,
      loop: true,
      poses: expandedPoses,
    };
    const clip = buildProceduralClip(spec, skeleton, this.bindQuaternions);
    if (!clip) {
      this.setStatus('falha ao construir clipe — bones não casaram');
      return;
    }

    const midTimes: number[] = [];
    const midValues: number[] = [];
    const arrowTimes: number[] = [];
    const arrowValues: boolean[] = [];
    for (const pose of this.capturedPoses) {
      const e = pose.extras;
      if (e?.bowMidPull) {
        midTimes.push(pose.time);
        midValues.push(e.bowMidPull[0], e.bowMidPull[1], e.bowMidPull[2]);
      }
      if (e?.arrowVisible !== undefined) {
        arrowTimes.push(pose.time);
        arrowValues.push(e.arrowVisible);
      }
    }
    if (midTimes.length >= 2) {
      clip.tracks.push(
        new THREE.VectorKeyframeTrack(
          `${NAIA_BOWSTRING_MID_NAME}.position`,
          midTimes,
          midValues,
        ),
      );
    }
    if (arrowTimes.length >= 1) {
      clip.tracks.push(
        new THREE.BooleanKeyframeTrack(
          `${NAIA_BOW_ARROW_NAME}.visible`,
          arrowTimes,
          arrowValues,
        ),
      );
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.currentRoot);
    }
    this.mixer = new THREE.AnimationMixer(this.currentRoot);
    this.currentAction = null;
    this.isPlaying = true;
    this.stepAccumulator = 0;

    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.timeScale = this.playbackSpeed;
    action.reset().play();
    this.currentAction = action;

    console.log(
      `[ThreePilot] playing timeline · ${expandedPoses.length} poses · duration ${duration.toFixed(2)}s · ${clip.tracks.length} tracks · ${allBoneNames.size} bones`,
    );
    this.setStatus(
      `▶ playing · ${expandedPoses.length} poses (${allBoneNames.size} bones) · ${duration.toFixed(2)}s`,
    );
  }

  exportCapturedAsJSON(): void {
    if (this.capturedPoses.length === 0) {
      this.setStatus('nenhuma pose capturada');
      return;
    }
    const duration = Math.max(...this.capturedPoses.map((p) => p.time)) || 1;
    const spec = {
      name: 'proc-naia-custom',
      duration,
      loop: true,
      poses: this.capturedPoses,
    };
    const json = JSON.stringify(spec, null, 2);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(json).then(
        () => {
          this.setStatus(`JSON copiado · ${this.capturedPoses.length} poses · cola num arquivo`);
          console.log('[ThreePilot] exported animation spec:\n', json);
        },
        () => {
          console.log('[ThreePilot] exported animation spec (clipboard failed):\n', json);
          this.setStatus('JSON logado no console (clipboard bloqueado)');
        },
      );
    } else {
      console.log('[ThreePilot] exported animation spec:\n', json);
      this.setStatus('JSON logado no console');
    }
  }

  clearCapturedPoses(): void {
    this.capturedPoses = [];
    this.renderPosesList();
    this.setStatus('poses limpas');
    this.queueAutoSave();
  }

  private populateAnimList(): void {
    const sel = this.element.querySelector<HTMLSelectElement>('[data-anim-select]');
    if (!sel) return;
    const all = this.animStore.list();
    sel.innerHTML = '';
    if (all.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— sem animações —';
      sel.appendChild(opt);
    }
    for (const a of all) {
      const opt = document.createElement('option');
      opt.value = a.name;
      opt.textContent = a.name;
      sel.appendChild(opt);
    }
    if (!this.currentAnimName && all.length > 0) {
      this.currentAnimName = all[0]!.name;
      this.applySpecToEditor(all[0]!);
    }
    sel.value = this.currentAnimName;
  }

  private applySpecToEditor(spec: ProceduralAnimSpec): void {
    this.currentAnimName = spec.name;
    this.currentDuration = spec.duration;
    this.currentLoop = spec.loop;
    this.capturedPoses = spec.poses.map((p) => {
      const out: EditorPose = {
        time: p.time,
        bones: p.bones.map((b) => {
          const bone: EditorBonePose = {
            bone: typeof b.bone === 'string' ? b.bone : String(b.bone),
            euler: [b.euler[0], b.euler[1], b.euler[2]],
          };
          if (b.pos) bone.pos = [b.pos[0], b.pos[1], b.pos[2]];
          if (b.scl) bone.scl = [b.scl[0], b.scl[1], b.scl[2]];
          return bone;
        }),
      };
      if (p.extras) out.extras = { ...p.extras };
      if (p.ease) out.ease = p.ease;
      return out;
    });
    this.currentMarkers = spec.markers ? spec.markers.map((m) => ({ ...m })) : [];
    this.currentHitboxes = spec.hitboxes ? spec.hitboxes.map((h) => ({ ...h })) : [];
    this.disposeHitboxMeshes();
    this.ensureInitialKeyframe();
    this.renderPosesList();
    this.renderTimeline();
    this.renderMarkersList();
    this.renderHitboxesList();
    const dur = this.element.querySelector<HTMLInputElement>('[data-anim-duration]');
    if (dur) dur.value = spec.duration.toFixed(2);
    const loop = this.element.querySelector<HTMLInputElement>('[data-anim-loop]');
    if (loop) loop.checked = spec.loop;
    if (this.currentRoot) this.applyKeyframeToModel(this.activeKfIdx);
    this.setAnimStatus(`carregada: ${spec.name}`);
  }

  loadAnim(name: string): void {
    if (!name) return;
    const spec = this.animStore.get(name);
    if (!spec) {
      this.setStatus(`anim não encontrada: ${name}`);
      return;
    }
    this.applySpecToEditor(spec);
  }

  private handleNewAnim(): void {
    const name = window.prompt('Nome da nova animação (ex: bow-draw):')?.trim();
    if (!name) return;
    const validation = this.animStore.validateName(name);
    if (validation) {
      this.setAnimStatus(`nome inválido: ${validation}`);
      return;
    }
    if (this.animStore.has(name)) {
      this.setAnimStatus('já existe — escolha outro nome');
      return;
    }
    const spec = this.animStore.createBlank(name);
    if (!spec) return;
    this.applySpecToEditor(spec);
    this.populateAnimList();
    void this.saveCurrentAnim();
  }

  private handleRenameAnim(): void {
    if (!this.currentAnimName) return;
    const next = window.prompt('Novo nome:', this.currentAnimName)?.trim();
    if (!next || next === this.currentAnimName) return;
    const renamed = this.animStore.rename(this.currentAnimName, next);
    if (!renamed) {
      this.setAnimStatus('rename falhou (nome inválido ou já existe)');
      return;
    }
    void this.animStore.deleteAnim(this.currentAnimName);
    this.currentAnimName = renamed.name;
    void this.animStore.saveToDisk(renamed);
    this.populateAnimList();
    this.setAnimStatus(`renomeada → ${renamed.name}`);
  }

  private handleDeleteAnim(): void {
    if (!this.currentAnimName) return;
    if (!window.confirm(`Excluir "${this.currentAnimName}"?`)) return;
    const target = this.currentAnimName;
    this.currentAnimName = '';
    this.capturedPoses = [];
    this.currentDuration = 1;
    this.currentLoop = true;
    void this.animStore.deleteAnim(target).then((r) => this.setAnimStatus(r.message));
    this.renderPosesList();
    this.populateAnimList();
  }

  private queueAutoSave(): void {
    if (!this.currentAnimName) return;
    if (this.autoSaveTimer !== null) {
      window.clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = window.setTimeout(() => {
      this.autoSaveTimer = null;
      const spec = this.buildCurrentSpec();
      if (!spec) return;
      this.animStore.upsertLocal(spec);
      this.setAnimStatus('auto-save (local)');
    }, 400);
  }

  private buildCurrentSpec(): ProceduralAnimSpec | null {
    if (!this.currentAnimName) return null;
    const dur = Math.max(
      this.currentDuration,
      ...this.capturedPoses.map((p) => p.time),
      0.1,
    );
    const spec: ProceduralAnimSpec = {
      name: this.currentAnimName,
      duration: dur,
      loop: this.currentLoop,
      poses: this.capturedPoses.map((p) => {
        const out: ProceduralAnimSpec['poses'][number] = {
          time: p.time,
          bones: p.bones.map((b) => {
            const bone: ProceduralAnimSpec['poses'][number]['bones'][number] = {
              bone: b.bone,
              euler: [b.euler[0], b.euler[1], b.euler[2]],
            };
            if (b.pos) bone.pos = [b.pos[0], b.pos[1], b.pos[2]];
            if (b.scl) bone.scl = [b.scl[0], b.scl[1], b.scl[2]];
            return bone;
          }),
        };
        if (p.extras) out.extras = { ...p.extras };
        if (p.ease) out.ease = p.ease;
        return out;
      }),
    };
    if (this.currentMarkers.length > 0) {
      spec.markers = this.currentMarkers.map((m) => ({ ...m }));
    }
    if (this.currentHitboxes.length > 0) {
      spec.hitboxes = this.currentHitboxes.map((h) => ({ ...h }));
    }
    return spec;
  }

  async saveCurrentAnim(): Promise<void> {
    const spec = this.buildCurrentSpec();
    if (!spec) {
      this.setAnimStatus('nada pra salvar — crie uma animação primeiro');
      return;
    }
    this.setAnimStatus('salvando…');
    const r = await this.animStore.saveToDisk(spec);
    this.setAnimStatus(r.message);
  }

  private setAnimStatus(text: string): void {
    const el = this.element.querySelector<HTMLElement>('[data-anim-status]');
    if (el) el.textContent = text;
  }

  stopTimelinePlayback(): void {
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    this.resetToBindPose();
    this.setStatus('⏹ stopped');
  }

  private mirrorRightArmToLeft(): void {
    if (!this.currentRoot) return;
    const bones = new Map<string, THREE.Bone>();
    this.currentRoot.traverse((obj) => {
      const b = obj as THREE.Bone;
      if (b.isBone) bones.set(b.name, b);
    });
    const pairs: [string, string][] = [
      ['mixamorigRightShoulder', 'mixamorigLeftShoulder'],
      ['mixamorigRightArm', 'mixamorigLeftArm'],
      ['mixamorigRightForeArm', 'mixamorigLeftForeArm'],
      ['mixamorigRightHand', 'mixamorigLeftHand'],
    ];
    for (const [rightName, leftName] of pairs) {
      const right = bones.get(rightName);
      const left = bones.get(leftName);
      if (!right || !left) continue;
      left.position.set(-right.position.x, right.position.y, right.position.z);
      left.quaternion.set(
        right.quaternion.x,
        -right.quaternion.y,
        -right.quaternion.z,
        right.quaternion.w,
      );
    }
    console.log('[ThreePilot] LeftArm chain mirrored from RightArm');
  }

  resetToBindPose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    for (const [bone, q] of this.bindQuaternions) bone.quaternion.copy(q);
    for (const [bone, p] of this.bindPositions) bone.position.copy(p);
    for (const [bone, s] of this.bindScales) bone.scale.copy(s);
    if (this.currentRoot) {
      const rig = getBowstringRig(this.currentRoot);
      if (rig) {
        rig.setMidPullLocal({ x: 0, y: 0, z: 0 });
        rig.setArrowVisible(false);
      }
    }
    this.captureCurrentState();
    this.refreshBoneEditorInputs();
    this.setStatus('keyframe ativo → T-pose');
  }

  copyCurrentPose(): void {
    if (!this.currentRoot) return;
    const bones: EditorBonePose[] = [];
    const tmpInv = new THREE.Quaternion();
    const tmpDelta = new THREE.Quaternion();
    const tmpEuler = new THREE.Euler();
    for (const [bone, bindQ] of this.bindQuaternions) {
      tmpInv.copy(bindQ).invert();
      tmpDelta.copy(tmpInv).multiply(bone.quaternion);
      tmpEuler.setFromQuaternion(tmpDelta, 'XYZ');
      const dx = THREE.MathUtils.radToDeg(tmpEuler.x);
      const dy = THREE.MathUtils.radToDeg(tmpEuler.y);
      const dz = THREE.MathUtils.radToDeg(tmpEuler.z);
      const hasRot = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(dz) > 0.5;
      let posDelta: [number, number, number] | null = null;
      const bindP = this.bindPositions.get(bone);
      if (bindP) {
        const dpx = bone.position.x - bindP.x;
        const dpy = bone.position.y - bindP.y;
        const dpz = bone.position.z - bindP.z;
        if (Math.abs(dpx) > 0.001 || Math.abs(dpy) > 0.001 || Math.abs(dpz) > 0.001) {
          posDelta = [
            Math.round(dpx * 10000) / 10000,
            Math.round(dpy * 10000) / 10000,
            Math.round(dpz * 10000) / 10000,
          ];
        }
      }
      let sclVal: [number, number, number] | null = null;
      const bindS = this.bindScales.get(bone);
      if (bindS && bindS.x !== 0 && bindS.y !== 0 && bindS.z !== 0) {
        const rx = bone.scale.x / bindS.x;
        const ry = bone.scale.y / bindS.y;
        const rz = bone.scale.z / bindS.z;
        if (Math.abs(rx - 1) > 0.005 || Math.abs(ry - 1) > 0.005 || Math.abs(rz - 1) > 0.005) {
          sclVal = [
            Math.round(rx * 1000) / 1000,
            Math.round(ry * 1000) / 1000,
            Math.round(rz * 1000) / 1000,
          ];
        }
      }
      if (hasRot || posDelta || sclVal) {
        const entry: EditorBonePose = {
          bone: bone.name,
          euler: [
            Math.round(dx * 10) / 10,
            Math.round(dy * 10) / 10,
            Math.round(dz * 10) / 10,
          ],
        };
        if (posDelta) entry.pos = posDelta;
        if (sclVal) entry.scl = sclVal;
        bones.push(entry);
      }
    }
    const extras = this.captureExtras();
    this.poseClipboard = extras ? { bones, extras } : { bones };
    this.setStatus(`pose copiada · ${bones.length} bones`);
  }

  pastePose(): void {
    if (!this.currentRoot || !this.poseClipboard) {
      this.setStatus('clipboard vazio — copie primeiro');
      return;
    }
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    for (const [bone, q] of this.bindQuaternions) bone.quaternion.copy(q);
    for (const [bone, p] of this.bindPositions) bone.position.copy(p);
    for (const [bone, s] of this.bindScales) bone.scale.copy(s);
    for (const br of this.poseClipboard.bones) {
      this.applyBoneTransform(br.bone, br.euler, br.pos, br.scl, false);
    }
    this.applyExtrasToScene(this.poseClipboard.extras);
    this.captureCurrentState();
    this.setStatus(`pose colada · ${this.poseClipboard.bones.length} bones`);
  }

  mirrorCurrentPose(): void {
    if (!this.currentRoot) return;
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    const allBones = new Map<string, THREE.Bone>();
    for (const [bone] of this.bindQuaternions) allBones.set(bone.name, bone);

    const deltas = new Map<string, THREE.Quaternion>();
    for (const [name, bone] of allBones) {
      const bindQ = this.bindQuaternions.get(bone)!;
      const delta = bindQ.clone().invert().multiply(bone.quaternion);
      deltas.set(name, delta);
    }

    const newDeltas = new Map<string, THREE.Quaternion>();
    for (const [name, delta] of deltas) {
      const partner = mirrorPartnerName(name) ?? name;
      const mirrored = new THREE.Quaternion(delta.x, -delta.y, -delta.z, delta.w);
      newDeltas.set(partner, mirrored);
    }

    for (const [name, bone] of allBones) {
      const bindQ = this.bindQuaternions.get(bone)!;
      const nd = newDeltas.get(name);
      if (nd) bone.quaternion.copy(bindQ).multiply(nd);
      else bone.quaternion.copy(bindQ);
    }
    this.captureCurrentState();
    this.refreshBoneEditorInputs();
    this.setStatus('pose espelhada');
  }

  addMarkerAtCurrentTime(): void {
    if (!this.currentAnimName) {
      this.setStatus('crie uma animação primeiro');
      return;
    }
    const animTimeInput = this.element.querySelector<HTMLInputElement>('[data-anim-time]');
    const t = animTimeInput ? Number(animTimeInput.value) || 0 : 0;
    const name = window.prompt(`Nome do marker @ t=${t.toFixed(2)}s (ex: hit, release, recover):`)?.trim();
    if (!name) return;
    this.currentMarkers = this.currentMarkers.filter((m) => !(m.time === t && m.name === name));
    this.currentMarkers.push({ time: t, name });
    this.currentMarkers.sort((a, b) => a.time - b.time);
    this.renderMarkersList();
    this.queueAutoSave();
    this.setStatus(`marker "${name}" @ t=${t.toFixed(2)}s`);
  }

  deleteMarker(time: number, name: string): void {
    const before = this.currentMarkers.length;
    this.currentMarkers = this.currentMarkers.filter((m) => !(m.time === time && m.name === name));
    if (this.currentMarkers.length < before) {
      this.renderMarkersList();
      this.queueAutoSave();
    }
  }

  addHitboxAtCurrentTime(bone: string, kind: HitboxKind): void {
    if (!this.currentAnimName) {
      this.setStatus('crie uma animação primeiro');
      return;
    }
    const animTimeInput = this.element.querySelector<HTMLInputElement>('[data-anim-time]');
    const t = animTimeInput ? Number(animTimeInput.value) || 0 : 0;
    const defaults = HITBOX_DEFAULTS[kind];
    const hb: Hitbox = {
      id: `hb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      attach: bone,
      offset: [...defaults.offset] as [number, number, number],
      size: [...defaults.size] as [number, number, number],
      startTime: t,
      endTime: Math.round((t + defaults.duration) * 1000) / 1000,
      kind,
      damage: defaults.damage,
    };
    this.currentHitboxes.push(hb);
    this.currentHitboxes.sort((a, b) => a.startTime - b.startTime);
    this.renderHitboxesList();
    this.queueAutoSave();
    this.setStatus(`hitbox ${kind} @ ${bone} t=${t.toFixed(2)}s`);
  }

  deleteHitbox(id: string): void {
    const before = this.currentHitboxes.length;
    this.currentHitboxes = this.currentHitboxes.filter((h) => h.id !== id);
    if (this.currentHitboxes.length < before) {
      const mesh = this.hitboxMeshes.get(id);
      if (mesh) {
        this.hitboxRoot.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.hitboxMeshes.delete(id);
      }
      this.renderHitboxesList();
      this.queueAutoSave();
    }
  }

  private updateHitboxField<K extends keyof Hitbox>(id: string, key: K, value: Hitbox[K]): void {
    const hb = this.currentHitboxes.find((h) => h.id === id);
    if (!hb) return;
    hb[key] = value;
    this.queueAutoSave();
  }

  private renderHitboxesList(): void {
    const el = this.element.querySelector<HTMLElement>('[data-hitboxes-list]');
    if (!el) return;
    if (this.currentHitboxes.length === 0) {
      el.innerHTML = `<div class="${styles.empty}">sem hitboxes</div>`;
      return;
    }
    el.innerHTML = this.currentHitboxes
      .map(
        (hb) => `
          <div class="${styles.poseRow}" data-hb-row="${hb.id}">
            <div class="${styles.poseRowHead}">
              <span class="${styles.poseTime}">${(hb.kind ?? 'light').toUpperCase()}</span>
              <span class="${styles.poseCount}">${escapeHtml(hb.attach.replace(/^mixamorig/, ''))}</span>
              <span class="${styles.poseCount}">${hb.startTime.toFixed(2)}–${hb.endTime.toFixed(2)}s</span>
              <button class="${styles.poseRowBtn} ${styles.poseRowBtnDel}" data-hb-del="${hb.id}" title="deletar">×</button>
            </div>
            <div class="${styles.poseBones}" style="display:flex;flex-wrap:wrap;gap:6px;font-size:11px;">
              <label>t0 <input type="number" step="0.05" data-hb-t0="${hb.id}" value="${hb.startTime}" style="width:50px;"></label>
              <label>t1 <input type="number" step="0.05" data-hb-t1="${hb.id}" value="${hb.endTime}" style="width:50px;"></label>
              <label>w <input type="number" step="0.01" data-hb-sw="${hb.id}" value="${hb.size[0]}" style="width:48px;"></label>
              <label>h <input type="number" step="0.01" data-hb-sh="${hb.id}" value="${hb.size[1]}" style="width:48px;"></label>
              <label>d <input type="number" step="0.01" data-hb-sd="${hb.id}" value="${hb.size[2]}" style="width:48px;"></label>
              <label>ox <input type="number" step="0.01" data-hb-ox="${hb.id}" value="${hb.offset[0]}" style="width:48px;"></label>
              <label>oy <input type="number" step="0.01" data-hb-oy="${hb.id}" value="${hb.offset[1]}" style="width:48px;"></label>
              <label>oz <input type="number" step="0.01" data-hb-oz="${hb.id}" value="${hb.offset[2]}" style="width:48px;"></label>
            </div>
          </div>`,
      )
      .join('');

    for (const btn of el.querySelectorAll<HTMLElement>('[data-hb-del]')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteHitbox(btn.dataset.hbDel!);
      });
    }
    const numericBindings: [string, keyof Hitbox, 'time' | 'size' | 'offset', number?][] = [
      ['data-hb-t0', 'startTime', 'time'],
      ['data-hb-t1', 'endTime', 'time'],
      ['data-hb-sw', 'size', 'size', 0],
      ['data-hb-sh', 'size', 'size', 1],
      ['data-hb-sd', 'size', 'size', 2],
      ['data-hb-ox', 'offset', 'offset', 0],
      ['data-hb-oy', 'offset', 'offset', 1],
      ['data-hb-oz', 'offset', 'offset', 2],
    ];
    for (const [attr, field, , idx] of numericBindings) {
      for (const inp of el.querySelectorAll<HTMLInputElement>(`[${attr}]`)) {
        const id = inp.getAttribute(attr)!;
        inp.addEventListener('input', () => {
          const v = Number(inp.value);
          if (!Number.isFinite(v)) return;
          if (field === 'startTime' || field === 'endTime') {
            this.updateHitboxField(id, field, v);
          } else if (idx !== undefined) {
            const hb = this.currentHitboxes.find((h) => h.id === id);
            if (!hb) return;
            const arr = (hb[field] as [number, number, number]).slice() as [number, number, number];
            arr[idx] = v;
            this.updateHitboxField(id, field, arr);
          }
        });
      }
    }
  }

  private disposeHitboxMeshes(): void {
    for (const mesh of this.hitboxMeshes.values()) {
      this.hitboxRoot.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.hitboxMeshes.clear();
  }

  private updateHitboxRendering(): void {
    if (!this.currentRoot || this.currentHitboxes.length === 0) {
      for (const mesh of this.hitboxMeshes.values()) mesh.visible = false;
      return;
    }
    let t = 0;
    if (this.currentAction && !this.currentAction.paused) {
      t = this.currentAction.time;
    } else {
      const animTimeInput = this.element.querySelector<HTMLInputElement>('[data-anim-time]');
      t = animTimeInput ? Number(animTimeInput.value) || 0 : 0;
    }
    const tmp = new THREE.Matrix4();
    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScale = new THREE.Vector3();
    for (const hb of this.currentHitboxes) {
      let mesh = this.hitboxMeshes.get(hb.id);
      const active = t >= hb.startTime && t <= hb.endTime;
      if (!active) {
        if (mesh) mesh.visible = false;
        continue;
      }
      if (!mesh || meshSizeMismatch(mesh, hb.size)) {
        if (mesh) {
          this.hitboxRoot.remove(mesh);
          mesh.geometry.dispose();
        }
        const geom = new THREE.BoxGeometry(hb.size[0], hb.size[1], hb.size[2]);
        const mat = new THREE.MeshBasicMaterial({
          color: HITBOX_COLOR[hb.kind ?? 'light'],
          wireframe: true,
          transparent: true,
          opacity: 0.85,
          depthTest: false,
        });
        mesh = new THREE.Mesh(geom, mat);
        mesh.renderOrder = 999;
        (mesh.userData as { sizeKey: string }).sizeKey = sizeKey(hb.size);
        this.hitboxMeshes.set(hb.id, mesh);
        this.hitboxRoot.add(mesh);
      }
      const bone = this.findBoneByName(hb.attach);
      if (!bone) {
        mesh.visible = false;
        continue;
      }
      tmp.copy(bone.matrixWorld);
      tmp.decompose(tmpPos, tmpQuat, tmpScale);
      const localOffset = new THREE.Vector3(hb.offset[0], hb.offset[1], hb.offset[2]).applyQuaternion(tmpQuat);
      mesh.position.copy(tmpPos).add(localOffset);
      mesh.quaternion.copy(tmpQuat);
      mesh.visible = true;
    }
  }

  private renderMarkersList(): void {
    const el = this.element.querySelector<HTMLElement>('[data-markers-list]');
    if (!el) return;
    if (this.currentMarkers.length === 0) {
      el.innerHTML = `<div class="${styles.empty}">sem markers</div>`;
      return;
    }
    el.innerHTML = this.currentMarkers
      .map(
        (m) => `
          <div class="${styles.poseRow}">
            <div class="${styles.poseRowHead}">
              <span class="${styles.poseTime}">t=${m.time.toFixed(2)}s</span>
              <span class="${styles.poseCount}">${escapeHtml(m.name)}</span>
              <button class="${styles.poseRowBtn} ${styles.poseRowBtnDel}" data-marker-del-time="${m.time}" data-marker-del-name="${escapeHtml(m.name)}" title="deletar">×</button>
            </div>
          </div>`,
      )
      .join('');
    for (const btn of el.querySelectorAll<HTMLElement>('[data-marker-del-time]')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = Number(btn.dataset.markerDelTime);
        const name = btn.dataset.markerDelName ?? '';
        this.deleteMarker(t, name);
      });
    }
  }

  show() {
    this.element.dataset.visible = 'true';
    this.handleResize();
    this.renderTimeline();
    this.renderBoneDiagram();
    this.clock.start();
    this.tick();
  }

  hide() {
    this.element.dataset.visible = 'false';
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  isVisible(): boolean {
    return this.element.dataset.visible === 'true';
  }

  toggle() {
    if (this.isVisible()) this.hide();
    else this.show();
  }

  async loadModel(input: File | string, extras: readonly File[] = []): Promise<void> {
    const baseLabel = typeof input === 'string' ? input : input.name;
    this.setStatus(extras.length > 0 ? `carregando ${1 + extras.length} arquivos…` : 'carregando…');
    try {
      const baseLoaded = await loadAnyModel(input);
      this.currentModelLabel = baseLabel;
      if (isNaiaModelUrl(baseLabel)) {
        applyNaiaTransforms(baseLoaded.root);
        void attachNaiaProps(baseLoaded.root, baseLabel);
      }
      this.replaceModel(baseLoaded);

      if (extras.length > 0) {
        const extraResults = await Promise.allSettled(
          extras.map((f) => loadAnyModel(f)),
        );
        for (let i = 0; i < extraResults.length; i++) {
          const r = extraResults[i]!;
          if (r.status !== 'fulfilled') continue;
          const clips = r.value.animations;
          for (const clip of clips) {
            const baseName = extras[i]!.name.replace(/\.(fbx|glb|gltf)$/i, '');
            if (clip.name === 'mixamo.com' || !clip.name) clip.name = baseName;
            this.clips.push(clip);
          }
        }
        this.populateAnimSelect();
        this.refreshStats();
      }

      this.setStatus(
        extras.length > 0
          ? `carregado · ${baseLabel} (+${extras.length} anims)`
          : `carregado · ${baseLabel}`,
      );
    } catch (err) {
      console.error('[ThreePilot] failed to load model:', err);
      this.setStatus('falha ao carregar — veja console');
    }
  }

  async addAnimationFiles(files: readonly File[]): Promise<void> {
    if (!this.currentRoot) {
      this.setStatus('carregue um modelo base primeiro');
      return;
    }
    this.setStatus(`adicionando ${files.length} anim(s)…`);
    const results = await Promise.allSettled(files.map((f) => loadAnyModel(f)));
    let added = 0;
    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      if (r.status !== 'fulfilled') {
        console.warn(`[ThreePilot] failed to load ${files[i]!.name}:`, r.reason);
        continue;
      }
      for (const clip of r.value.animations) {
        const baseName = files[i]!.name.replace(/\.(fbx|glb|gltf)$/i, '');
        if (clip.name === 'mixamo.com' || !clip.name) clip.name = baseName;
        this.clips.push(clip);
        added++;
      }
    }
    if (added > 0 && !this.mixer) {
      this.mixer = new THREE.AnimationMixer(this.currentRoot);
    }
    this.populateAnimSelect();
    this.refreshStats();
    this.setStatus(
      added > 0
        ? `+${added} anim(s) · total ${this.clips.length}`
        : 'nenhuma animação extraída',
    );
  }

  playProceduralAnim(specName: string): void {
    if (!this.currentRoot) {
      this.setStatus('carregue um modelo base primeiro');
      return;
    }
    const spec = PROCEDURAL_ANIMS.find((s) => s.name === specName);
    if (!spec) {
      console.warn(`[ThreePilot] procedural spec not found: ${specName}`);
      return;
    }
    let skeleton: THREE.Skeleton | null = null;
    this.currentRoot.traverse((obj) => {
      const sm = obj as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton) skeleton = sm.skeleton;
    });
    if (!skeleton) {
      this.setStatus('modelo sem skeleton — proc anim requer rig');
      return;
    }
    const clip = buildProceduralClip(spec, skeleton, this.bindQuaternions);
    if (!clip) {
      this.setStatus('falha ao gerar clipe procedural — bones não casaram');
      return;
    }
    if (!this.mixer) this.mixer = new THREE.AnimationMixer(this.currentRoot);
    if (this.currentAction) this.currentAction.fadeOut(0.15);
    const action = this.mixer.clipAction(clip);
    action.setLoop(spec.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.reset().fadeIn(0.15).play();
    action.timeScale = this.playbackSpeed;
    action.paused = !this.isPlaying;
    this.currentAction = action;
    this.setStatus(`playing · ${spec.name}`);
  }

  private replaceModel(loaded: LoadedModel) {
    if (this.currentRoot) {
      this.scene.remove(this.currentRoot);
      this.currentRoot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose();
        }
      });
      this.currentRoot = null;
      this.mixer = null;
      this.currentAction = null;
      this.originalMaterials.clear();
      this.bindQuaternions.clear();
      this.bindPositions.clear();
      this.bindScales.clear();
    }

    const root = loaded.root;
    // Some exporters (Mixamo FBX→GLB) keep colons in node names like "mixamorig:Spine1".
    // Three.js animation tracks treat ":" as a property separator, which breaks Quaternion/Vector
    // track parsing. Strip the colon so track names like "mixamorigSpine1.quaternion" parse cleanly.
    root.traverse((obj) => {
      if (obj.name && obj.name.indexOf(':') >= 0) {
        obj.name = obj.name.replace(/:/g, '');
      }
    });
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        this.originalMaterials.set(m, m.material);
      }
    });

    this.fitToFrame(root);
    this.scene.add(root);
    this.currentRoot = root;

    root.traverse((obj) => {
      const bone = obj as THREE.Bone;
      if (bone.isBone) {
        this.bindQuaternions.set(bone, bone.quaternion.clone());
        this.bindPositions.set(bone, bone.position.clone());
        this.bindScales.set(bone, bone.scale.clone());
      }
    });

    this.mirrorRightArmToLeft();
    root.traverse((obj) => {
      const bone = obj as THREE.Bone;
      if (bone.isBone && /^mixamorigLeft(Shoulder|Arm|ForeArm|Hand)$/.test(bone.name)) {
        this.bindQuaternions.set(bone, bone.quaternion.clone());
        this.bindPositions.set(bone, bone.position.clone());
        this.bindScales.set(bone, bone.scale.clone());
      }
    });

    this.populateBoneLabDropdown();
    this.populateBulkBoneDropdown();
    this.renderBoneDiagram();

    this.clips = [...loaded.animations];
    this.populateAnimSelect();
    if (this.clips.length > 0) {
      this.mixer = new THREE.AnimationMixer(root);
      this.playClip(0);
    }

    if (this.toonEnabled) this.applyToon(true);

    this.refreshStats();
  }

  private fitToFrame(root: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z);
    if (maxAxis > 0) {
      const targetHeight = 1.7;
      const scale = targetHeight / size.y || 1;
      root.scale.setScalar(scale);
      box.setFromObject(root);
      box.getSize(size);
      box.getCenter(center);
      root.position.x -= center.x;
      root.position.z -= center.z;
      root.position.y -= box.min.y;
    }
    void maxAxis;
  }

  private populateAnimSelect() {
  }

  private playClip(index: number) {
    if (!this.mixer) return;
    const clip = this.clips[index];
    if (!clip) return;
    if (this.currentAction) {
      this.currentAction.fadeOut(0.18);
    }
    const action = this.mixer.clipAction(clip);
    action.reset().fadeIn(0.18).play();
    action.timeScale = this.playbackSpeed;
    action.paused = !this.isPlaying;
    this.currentAction = action;
  }

  private applyToon(on: boolean) {
    this.toonEnabled = on;

    if (!this.currentRoot) return;

    if (on) {
      const grad = createToonGradient([
        this.shaderConfig.toonBand0,
        this.shaderConfig.toonBand1,
        this.shaderConfig.toonBand2,
      ]);
      this.currentRoot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh) return;
        const orig = this.originalMaterials.get(m);
        if (!orig) return;
        if (Array.isArray(orig)) {
          m.material = orig.map((src) => makeToon(src, grad));
        } else {
          m.material = makeToon(orig, grad);
        }
      });
    } else {
      this.currentRoot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh) return;
        const orig = this.originalMaterials.get(m);
        if (orig) m.material = orig;
      });
    }
  }

  private spawnPlaceholder() {
    const placeholder = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 1.0, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.6 }),
    );
    body.position.y = 0.85;
    body.castShadow = true;
    placeholder.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.5 }),
    );
    head.position.y = 1.55;
    head.castShadow = true;
    placeholder.add(head);
    placeholder.userData.placeholder = true;
    this.currentRoot = placeholder;
    placeholder.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) this.originalMaterials.set(m, m.material);
    });
    this.scene.add(placeholder);
    this.refreshStats();
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(() => this.handleResize());
      this.resizeObs.observe(this.element);
    }

    const closeBtn = this.element.querySelector('[data-close]') as HTMLElement;
    closeBtn.addEventListener('click', () => this.hide());


    const vp = this.element.querySelector(`.${styles.viewport}`) as HTMLElement;
    vp.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzoneEl.dataset.active = 'true';
    });
    vp.addEventListener('dragleave', (e) => {
      if (e.target === vp) this.dropzoneEl.dataset.active = 'false';
    });
    vp.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzoneEl.dataset.active = 'false';
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      let base = files.find((f) => /idle|breath|base|naia\.fbx|naia\.glb/i.test(f.name));
      if (!base) base = [...files].sort((a, b) => b.size - a.size)[0]!;
      const extras = files.filter((f) => f !== base);
      this.loadModel(base, extras);
    });

    this.playToggle.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      this.playToggle.dataset.active = String(this.isPlaying);
      this.playToggle.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play';
      if (this.currentAction) this.currentAction.paused = !this.isPlaying;
    });

    const procBtns = Array.from(
      this.element.querySelectorAll<HTMLElement>('[data-procanim]'),
    );
    for (const btn of procBtns) {
      btn.addEventListener('click', () => {
        for (const b of procBtns) b.dataset.active = 'false';
        btn.dataset.active = 'true';
        this.playProceduralAnim(btn.dataset.procanim!);
      });
    }

    const boneSelect = this.element.querySelector<HTMLSelectElement>('[data-bonelab-bone]')!;
    const xInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-x]')!;
    const yInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-y]')!;
    const zInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-z]')!;
    const xSlider = this.element.querySelector<HTMLInputElement>('[data-bonelab-x-slider]')!;
    const ySlider = this.element.querySelector<HTMLInputElement>('[data-bonelab-y-slider]')!;
    const zSlider = this.element.querySelector<HTMLInputElement>('[data-bonelab-z-slider]')!;
    const pxInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-px]')!;
    const pyInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-py]')!;
    const pzInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-pz]')!;
    const sxInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-sx]')!;
    const syInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-sy]')!;
    const szInput = this.element.querySelector<HTMLInputElement>('[data-bonelab-sz]')!;
    const animTimeInput = this.element.querySelector<HTMLInputElement>('[data-anim-time]')!;
    const applyTransformLive = () => {
      const ex = Number(xInput.value) || 0;
      const ey = Number(yInput.value) || 0;
      const ez = Number(zInput.value) || 0;
      const px = Number(pxInput.value) || 0;
      const py = Number(pyInput.value) || 0;
      const pz = Number(pzInput.value) || 0;
      const sx = pickScale(sxInput.value);
      const sy = pickScale(syInput.value);
      const sz = pickScale(szInput.value);
      const hasPos = Math.abs(px) > 0.0001 || Math.abs(py) > 0.0001 || Math.abs(pz) > 0.0001;
      const hasScl = Math.abs(sx - 1) > 0.005 || Math.abs(sy - 1) > 0.005 || Math.abs(sz - 1) > 0.005;
      this.applyBoneTransform(
        boneSelect.value,
        [ex, ey, ez],
        hasPos ? [px, py, pz] : undefined,
        hasScl ? [sx, sy, sz] : undefined,
        false,
      );
    };
    const bindAxis = (numIn: HTMLInputElement, slider: HTMLInputElement) => {
      numIn.addEventListener('input', () => {
        const v = Number(numIn.value);
        if (Number.isFinite(v)) slider.value = String(v);
        applyTransformLive();
      });
      slider.addEventListener('input', () => {
        numIn.value = slider.value;
        applyTransformLive();
      });
    };
    bindAxis(xInput, xSlider);
    bindAxis(yInput, ySlider);
    bindAxis(zInput, zSlider);
    for (const inp of [pxInput, pyInput, pzInput, sxInput, syInput, szInput]) {
      inp.addEventListener('input', () => applyTransformLive());
    }

    boneSelect.addEventListener('change', () => {
      this.refreshBoneEditorInputs();
      this.renderBoneDiagram();
    });
    animTimeInput.addEventListener('change', () => {
      if (this.activeKfIdx < 0) return;
      const v = Number(animTimeInput.value);
      if (!Number.isFinite(v) || v < 0) return;
      const activeKf = this.capturedPoses[this.activeKfIdx];
      if (!activeKf) return;
      activeKf.time = Math.round(v * 1000) / 1000;
      this.capturedPoses.sort((a, b) => a.time - b.time);
      this.activeKfIdx = this.capturedPoses.indexOf(activeKf);
      this.renderPosesList();
      this.queueAutoSave();
    });

    const addKeyframeBtn = this.element.querySelector<HTMLElement>('[data-anim-add-keyframe]')!;
    addKeyframeBtn.addEventListener('click', () => this.addNewKeyframe());

    const resetBtn = this.element.querySelector<HTMLElement>('[data-bonelab-reset]')!;
    resetBtn.addEventListener('click', () => this.resetToBindPose());

    const modelSelectEl = this.element.querySelector<HTMLSelectElement>('[data-model-select]');
    modelSelectEl?.addEventListener('change', () => {
      this.attachPropGizmo('');
      const propTarget = this.element.querySelector<HTMLSelectElement>('[data-prop-target]');
      if (propTarget) propTarget.value = '';
      const url = modelSelectEl.value;
      void this.loadModel(url, []).then(() => {
        if (isNaiaModelUrl(url)) this.playProceduralAnim('proc-idle-breath');
      });
    });

    const animSelect = this.element.querySelector<HTMLSelectElement>('[data-anim-select]')!;
    const animNewBtn = this.element.querySelector<HTMLElement>('[data-anim-new]')!;
    const animRenameBtn = this.element.querySelector<HTMLElement>('[data-anim-rename]')!;
    const animDeleteBtn = this.element.querySelector<HTMLElement>('[data-anim-delete]')!;
    const animDurInput = this.element.querySelector<HTMLInputElement>('[data-anim-duration]')!;
    const animLoopChk = this.element.querySelector<HTMLInputElement>('[data-anim-loop]')!;
    const animSpeedInput = this.element.querySelector<HTMLInputElement>('[data-anim-speed]')!;
    const animSpeedLabel = this.element.querySelector<HTMLElement>('[data-anim-speed-label]')!;
    const animPlayBtn = this.element.querySelector<HTMLElement>('[data-anim-play]')!;
    const animStopBtn = this.element.querySelector<HTMLElement>('[data-anim-stop]')!;
    const animSaveBtn = this.element.querySelector<HTMLElement>('[data-anim-save]')!;

    animSelect.addEventListener('change', () => this.loadAnim(animSelect.value));
    animNewBtn.addEventListener('click', () => this.handleNewAnim());
    animRenameBtn.addEventListener('click', () => this.handleRenameAnim());
    animDeleteBtn.addEventListener('click', () => this.handleDeleteAnim());

    animDurInput.addEventListener('input', () => {
      const v = Number(animDurInput.value);
      if (Number.isFinite(v) && v > 0) {
        this.currentDuration = v;
        this.queueAutoSave();
      }
    });
    animLoopChk.addEventListener('change', () => {
      this.currentLoop = animLoopChk.checked;
      this.queueAutoSave();
    });
    animSpeedInput.addEventListener('input', () => {
      const v = Number(animSpeedInput.value);
      if (Number.isFinite(v) && v > 0) {
        this.playbackSpeed = v;
        animSpeedLabel.textContent = `${v.toFixed(2)}x`;
        if (this.currentAction) this.currentAction.timeScale = v;
      }
    });
    animPlayBtn.addEventListener('click', () => this.playCapturedTimeline());
    animStopBtn.addEventListener('click', () => this.stopTimelinePlayback());
    animSaveBtn.addEventListener('click', () => void this.saveCurrentAnim());

    const distributeBtn = this.element.querySelector<HTMLElement>('[data-timeline-distribute]');
    distributeBtn?.addEventListener('click', () => this.distributeKeyframesEvenly());

    const bulkBoneSel = this.element.querySelector<HTMLSelectElement>('[data-bulk-bone]');
    const bulkRxIn = this.element.querySelector<HTMLInputElement>('[data-bulk-rx]');
    const bulkRyIn = this.element.querySelector<HTMLInputElement>('[data-bulk-ry]');
    const bulkRzIn = this.element.querySelector<HTMLInputElement>('[data-bulk-rz]');
    const bulkPxIn = this.element.querySelector<HTMLInputElement>('[data-bulk-px]');
    const bulkPyIn = this.element.querySelector<HTMLInputElement>('[data-bulk-py]');
    const bulkPzIn = this.element.querySelector<HTMLInputElement>('[data-bulk-pz]');
    const bulkSclIn = this.element.querySelector<HTMLInputElement>('[data-bulk-scl]');
    const bulkFilter = () => bulkBoneSel?.value || null;
    this.element.querySelector('[data-bulk-rot-apply]')?.addEventListener('click', () => {
      const dx = Number(bulkRxIn?.value) || 0;
      const dy = Number(bulkRyIn?.value) || 0;
      const dz = Number(bulkRzIn?.value) || 0;
      this.applyBulkRotation(bulkFilter(), [dx, dy, dz]);
    });
    this.element.querySelector('[data-bulk-pos-apply]')?.addEventListener('click', () => {
      const dx = Number(bulkPxIn?.value) || 0;
      const dy = Number(bulkPyIn?.value) || 0;
      const dz = Number(bulkPzIn?.value) || 0;
      this.applyBulkPosition(bulkFilter(), [dx, dy, dz]);
    });
    this.element.querySelector('[data-bulk-scl-apply]')?.addEventListener('click', () => {
      const mult = Number(bulkSclIn?.value);
      if (!Number.isFinite(mult) || mult <= 0) return;
      this.applyBulkScale(bulkFilter(), mult);
    });
    this.element.querySelector('[data-bulk-mirror]')?.addEventListener('click', () => {
      this.applyBulkMirrorAll();
    });

    this.wireShaderDevPanel();

    const poseCopyBtn = this.element.querySelector<HTMLElement>('[data-pose-copy]')!;
    const posePasteBtn = this.element.querySelector<HTMLElement>('[data-pose-paste]')!;
    const poseFlipBtn = this.element.querySelector<HTMLElement>('[data-pose-flip]')!;
    const poseSymBtn = this.element.querySelector<HTMLElement>('[data-pose-sym]')!;
    poseCopyBtn.addEventListener('click', () => this.copyCurrentPose());
    posePasteBtn.addEventListener('click', () => this.pastePose());
    poseFlipBtn.addEventListener('click', () => this.mirrorCurrentPose());
    poseSymBtn.addEventListener('click', () => {
      this.symMode = !this.symMode;
      poseSymBtn.dataset.active = String(this.symMode);
      this.setStatus(`modo simétrico: ${this.symMode ? 'ON' : 'OFF'}`);
    });

    const markerAddBtn = this.element.querySelector<HTMLElement>('[data-marker-add]')!;
    markerAddBtn.addEventListener('click', () => this.addMarkerAtCurrentTime());

    const hitboxAddBtn = this.element.querySelector<HTMLElement>('[data-hitbox-add]')!;
    const hitboxKindSel = this.element.querySelector<HTMLSelectElement>('[data-hitbox-kind]')!;
    hitboxAddBtn.addEventListener('click', () =>
      this.addHitboxAtCurrentTime(boneSelect.value || 'mixamorigRightHand', hitboxKindSel.value as HitboxKind),
    );

    document.addEventListener('keydown', (e) => {
      if (!this.isVisible()) return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        this.copyCurrentPose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        this.pastePose();
      }
    });

    const importFileInput = this.element.querySelector<HTMLInputElement>('[data-anim-import-file]')!;
    importFileInput.addEventListener('change', () => {
      const file = importFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        this.importPosesFromJSON(text);
        this.queueAutoSave();
      };
      reader.onerror = () => {
        this.setStatus('erro lendo arquivo');
        console.error('[ThreePilot] file read error:', reader.error);
      };
      reader.readAsText(file);
      importFileInput.value = '';
    });

    this.populateAnimList();

    const propTargetSel = this.element.querySelector<HTMLSelectElement>('[data-prop-target]')!;
    const propModeBtns = Array.from(
      this.element.querySelectorAll<HTMLElement>('[data-prop-mode]'),
    );
    const propPxInput = this.element.querySelector<HTMLInputElement>('[data-prop-px]')!;
    const propPyInput = this.element.querySelector<HTMLInputElement>('[data-prop-py]')!;
    const propPzInput = this.element.querySelector<HTMLInputElement>('[data-prop-pz]')!;
    const propRxInput = this.element.querySelector<HTMLInputElement>('[data-prop-rx]')!;
    const propRyInput = this.element.querySelector<HTMLInputElement>('[data-prop-ry]')!;
    const propRzInput = this.element.querySelector<HTMLInputElement>('[data-prop-rz]')!;
    const propScaleInput = this.element.querySelector<HTMLInputElement>('[data-prop-scale]')!;
    const propSaveBtn = this.element.querySelector<HTMLElement>('[data-prop-save]')!;
    const propResetBtn = this.element.querySelector<HTMLElement>('[data-prop-reset]')!;

    propTargetSel.addEventListener('change', () => {
      this.attachPropGizmo(propTargetSel.value);
    });

    for (const btn of propModeBtns) {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.propMode as 'translate' | 'rotate' | 'scale';
        if (this.propGizmo) this.propGizmo.setMode(mode);
        for (const b of propModeBtns) b.dataset.active = 'false';
        btn.dataset.active = 'true';
      });
    }

    const writePropFromInputs = () => {
      const obj = this.attachedProp;
      if (!obj) return;
      const px = parseFloat(propPxInput.value);
      const py = parseFloat(propPyInput.value);
      const pz = parseFloat(propPzInput.value);
      const rx = parseFloat(propRxInput.value);
      const ry = parseFloat(propRyInput.value);
      const rz = parseFloat(propRzInput.value);
      const sc = parseFloat(propScaleInput.value);
      if (!Number.isNaN(px)) obj.position.x = px;
      if (!Number.isNaN(py)) obj.position.y = py;
      if (!Number.isNaN(pz)) obj.position.z = pz;
      if (!Number.isNaN(rx)) obj.rotation.x = THREE.MathUtils.degToRad(rx);
      if (!Number.isNaN(ry)) obj.rotation.y = THREE.MathUtils.degToRad(ry);
      if (!Number.isNaN(rz)) obj.rotation.z = THREE.MathUtils.degToRad(rz);
      if (!Number.isNaN(sc) && sc > 0) {
        obj.scale.setScalar(sc);
        this.lastUniformScale = sc;
      }
    };
    for (const inp of [propPxInput, propPyInput, propPzInput,
                       propRxInput, propRyInput, propRzInput,
                       propScaleInput]) {
      inp.addEventListener('input', writePropFromInputs);
    }

    propSaveBtn.addEventListener('click', () => this.saveCurrentPropOffsets());
    propResetBtn.addEventListener('click', () => this.resetCurrentProp());
  }

  private attachPropGizmo(name: string): void {
    if (!this.propGizmo) return;
    if (!name) {
      this.propGizmo.detach();
      this.attachedProp = null;
      return;
    }
    const obj = this.currentRoot?.getObjectByName(name);
    if (!obj) {
      this.setStatus(`prop não encontrada: ${name}`);
      return;
    }
    this.attachedProp = obj;
    this.propGizmo.attach(obj);
    this.lastUniformScale = obj.scale.x;
    this.refreshPropInputs();
  }

  private enforceUniformScale(): void {
    const obj = this.attachedProp;
    if (!obj || !this.propGizmo || this.propGizmo.getMode() !== 'scale') return;
    const sx = obj.scale.x, sy = obj.scale.y, sz = obj.scale.z;
    const dx = Math.abs(sx - this.lastUniformScale);
    const dy = Math.abs(sy - this.lastUniformScale);
    const dz = Math.abs(sz - this.lastUniformScale);
    let next = sx;
    if (dy > dx && dy >= dz) next = sy;
    else if (dz > dx && dz >= dy) next = sz;
    obj.scale.setScalar(next);
    this.lastUniformScale = next;
  }

  private refreshPropInputs(): void {
    const obj = this.attachedProp;
    if (!obj) return;
    const get = (sel: string) => this.element.querySelector<HTMLInputElement>(sel);
    const px = get('[data-prop-px]'); if (px) px.value = obj.position.x.toFixed(4);
    const py = get('[data-prop-py]'); if (py) py.value = obj.position.y.toFixed(4);
    const pz = get('[data-prop-pz]'); if (pz) pz.value = obj.position.z.toFixed(4);
    const rx = get('[data-prop-rx]'); if (rx) rx.value = THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(2);
    const ry = get('[data-prop-ry]'); if (ry) ry.value = THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(2);
    const rz = get('[data-prop-rz]'); if (rz) rz.value = THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(2);
    const sc = get('[data-prop-scale]'); if (sc) sc.value = obj.scale.x.toFixed(4);
  }

  private async saveCurrentPropOffsets(): Promise<void> {
    if (!this.currentRoot) {
      this.setStatus('carregue Naia primeiro');
      return;
    }
    const bow = this.currentRoot.getObjectByName(NAIA_BOW_NAME);
    const glasses = this.currentRoot.getObjectByName(NAIA_GLASSES_NAME);
    const bowstring = this.currentRoot.getObjectByName(NAIA_BOWSTRING_NAME);
    const bowstringMid = this.currentRoot.getObjectByName(NAIA_BOWSTRING_MID_NAME);

    const rigKey = getNaiaRigKey(this.currentModelLabel);
    const existing = savedPropOffsetsRaw as {
      rigs?: Record<string, unknown>;
      bow?: unknown;
      glasses?: unknown;
      bowstring?: unknown;
      bowstringMid?: unknown;
    };
    // Migrate v1 root-level → rigs.tripo; preserve other rig's section unchanged.
    const rigsOut: Record<string, unknown> = { ...(existing.rigs ?? {}) };
    if (!existing.rigs && (existing.bow || existing.glasses || existing.bowstring)) {
      rigsOut['tripo'] = {
        bow: existing.bow ?? null,
        glasses: existing.glasses ?? null,
        bowstring: existing.bowstring ?? null,
        bowstringMid: existing.bowstringMid ?? null,
      };
    }
    rigsOut[rigKey] = {
      bow: bow ? propTransformToJson(bow) : null,
      glasses: glasses ? propTransformToJson(glasses) : null,
      bowstring: bowstring ? propTransformToJson(bowstring) : null,
      bowstringMid: bowstringMid ? propTransformToJson(bowstringMid) : null,
    };
    const offsets = {
      $schema: 'naia-props-offsets/v2',
      _note: `Generated by /editor.html (Props panel). Active rig: ${rigKey}.`,
      rigs: rigsOut,
    };
    const json = JSON.stringify(offsets, null, 2);

    try {
      const res = await fetch('/__dev/save-naia-props', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
      });
      if (res.ok) {
        this.setStatus('offsets salvos — Vite recarrega automaticamente');
        return;
      }
      console.warn('[ThreePilot] dev save returned', res.status, await res.text());
    } catch (err) {
      console.warn('[ThreePilot] dev save unavailable, falling back to download:', err);
    }

    try {
      const blob = new Blob([json + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'naia-props-offsets.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[ThreePilot] download failed:', err);
    }
    try {
      await navigator.clipboard.writeText(json);
      this.setStatus('save in-place falhou — JSON baixado + clipboard');
    } catch {
      console.log('[ThreePilot] offsets JSON:\n' + json);
      this.setStatus('save in-place falhou — JSON no console');
    }
  }

  private resetCurrentProp(): void {
    const obj = this.attachedProp;
    if (!obj) return;
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.setScalar(1);
    this.lastUniformScale = 1;
    this.refreshPropInputs();
  }

  /** Refresh the bone editor input row (rot/pos/scl) for the currently selected bone. */
  private refreshBoneEditorInputs(): void {
    const boneSelect = this.element.querySelector<HTMLSelectElement>('[data-bonelab-bone]');
    if (!boneSelect) return;
    const boneName = boneSelect.value;
    const bone = this.findBoneByName(boneName);
    const bindQ = bone ? this.bindQuaternions.get(bone) : null;
    const bindP = bone ? this.bindPositions.get(bone) : null;
    const bindS = bone ? this.bindScales.get(bone) : null;
    let ex = 0, ey = 0, ez = 0;
    let px = 0, py = 0, pz = 0;
    let sx = 1, sy = 1, sz = 1;
    if (bone && bindQ) {
      const delta = bindQ.clone().invert().multiply(bone.quaternion);
      const eu = new THREE.Euler().setFromQuaternion(delta, 'XYZ');
      ex = Math.round(THREE.MathUtils.radToDeg(eu.x) * 10) / 10;
      ey = Math.round(THREE.MathUtils.radToDeg(eu.y) * 10) / 10;
      ez = Math.round(THREE.MathUtils.radToDeg(eu.z) * 10) / 10;
    }
    if (bone && bindP) {
      px = Math.round((bone.position.x - bindP.x) * 10000) / 10000;
      py = Math.round((bone.position.y - bindP.y) * 10000) / 10000;
      pz = Math.round((bone.position.z - bindP.z) * 10000) / 10000;
    }
    if (bone && bindS && bindS.x && bindS.y && bindS.z) {
      sx = Math.round((bone.scale.x / bindS.x) * 1000) / 1000;
      sy = Math.round((bone.scale.y / bindS.y) * 1000) / 1000;
      sz = Math.round((bone.scale.z / bindS.z) * 1000) / 1000;
    }
    const setVal = (sel: string, v: string): void => {
      const el = this.element.querySelector<HTMLInputElement>(sel);
      if (el && document.activeElement !== el) el.value = v;
    };
    setVal('[data-bonelab-x]', String(ex));
    setVal('[data-bonelab-y]', String(ey));
    setVal('[data-bonelab-z]', String(ez));
    setVal('[data-bonelab-x-slider]', String(ex));
    setVal('[data-bonelab-y-slider]', String(ey));
    setVal('[data-bonelab-z-slider]', String(ez));
    setVal('[data-bonelab-px]', String(px));
    setVal('[data-bonelab-py]', String(py));
    setVal('[data-bonelab-pz]', String(pz));
    setVal('[data-bonelab-sx]', String(sx));
    setVal('[data-bonelab-sy]', String(sy));
    setVal('[data-bonelab-sz]', String(sz));
  }

  /** Apply rot (degrees) + optional pos delta + optional scale ratio to a bone. */
  applyBoneTransform(
    boneName: string,
    euler: [number, number, number],
    pos: [number, number, number] | undefined,
    scl: [number, number, number] | undefined,
    skipCapture: boolean,
  ): void {
    if (!this.currentRoot) return;
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    this.applyTransformToBoneByName(boneName, euler, pos, scl, false);
    if (this.symMode) {
      const partner = mirrorPartnerName(boneName);
      if (partner) {
        this.applyTransformToBoneByName(partner, euler, pos, scl, true);
      }
    }
    if (!skipCapture) this.captureCurrentState();
  }

  /** Back-compat shim — rotation-only call. */
  applyBoneRotation(
    boneName: string,
    eulerX: number,
    eulerY: number,
    eulerZ: number,
  ): void {
    this.applyBoneTransform(boneName, [eulerX, eulerY, eulerZ], undefined, undefined, false);
  }

  private applyTransformToBoneByName(
    boneName: string,
    euler: [number, number, number],
    pos: [number, number, number] | undefined,
    scl: [number, number, number] | undefined,
    mirror: boolean,
  ): void {
    const target = this.findBoneByName(boneName);
    if (!target) return;
    const bindQ = this.bindQuaternions.get(target);
    const deltaQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(euler[0]),
        THREE.MathUtils.degToRad(euler[1]),
        THREE.MathUtils.degToRad(euler[2]),
        'XYZ',
      ),
    );
    if (mirror) {
      deltaQ.set(deltaQ.x, -deltaQ.y, -deltaQ.z, deltaQ.w);
    }
    if (bindQ) target.quaternion.copy(bindQ).multiply(deltaQ);
    else target.quaternion.copy(deltaQ);
    if (pos) {
      const bindP = this.bindPositions.get(target);
      if (bindP) {
        const px = mirror ? -pos[0] : pos[0];
        target.position.set(bindP.x + px, bindP.y + pos[1], bindP.z + pos[2]);
      }
    }
    if (scl) {
      const bindS = this.bindScales.get(target);
      if (bindS) {
        target.scale.set(bindS.x * scl[0], bindS.y * scl[1], bindS.z * scl[2]);
      }
    }
  }


  private handleResize = () => {
    if (!this.isVisible()) return;
    const vp = this.element.querySelector(`.${styles.viewport}`) as HTMLElement;
    const w = vp.clientWidth;
    const h = vp.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderTimeline();
  };

  private tick = () => {
    if (!this.isVisible()) return;
    this.rafId = requestAnimationFrame(this.tick);
    const dt = this.clock.getDelta();

    if (this.mixer && this.isPlaying) {
      if (this.stepFps > 0) {
        this.stepAccumulator += dt * this.playbackSpeed;
        const stepDur = 1 / this.stepFps;
        while (this.stepAccumulator >= stepDur) {
          this.mixer.update(stepDur);
          this.stepAccumulator -= stepDur;
        }
      } else {
        this.mixer.update(dt);
      }
    }

    this.controls.update();

    this.updateHitboxRendering();

    if (this.outlineEnabled) {
      this.outlineEffect.render(this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private setStatus(text: string) {
    this.statusEl.textContent = text;
  }

  private refreshStats() {
    let tris = 0;
    let bones = 0;
    const mats = new Set<THREE.Material>();
    if (this.currentRoot) {
      this.currentRoot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.isMesh && m.geometry) {
          const idx = m.geometry.index;
          const count = idx ? idx.count : (m.geometry.attributes.position?.count ?? 0);
          tris += Math.floor(count / 3);
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mats.add(mm));
          else if (mat) mats.add(mat);
        }
        if ((obj as THREE.Bone).isBone) bones++;
      });
    }
    this.statTris.textContent = tris > 0 ? formatNumber(tris) : '—';
    this.statBones.textContent = bones > 0 ? String(bones) : '—';
    this.statMaterials.textContent = mats.size > 0 ? String(mats.size) : '—';
    this.statClips.textContent = this.clips.length > 0 ? String(this.clips.length) : '—';
  }

  private wireShaderDevPanel(): void {
    const q = <T extends HTMLElement>(sel: string) => this.element.querySelector<T>(sel);

    const setVal = (sel: string, v: string | boolean): void => {
      const el = q<HTMLInputElement>(sel);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = String(v);
    };
    const refresh = (): void => {
      const c = this.shaderConfig;
      setVal('[data-shdr-toon]', c.toonEnabled);
      setVal('[data-shdr-outline]', c.outlineEnabled);
      setVal('[data-shdr-expo]', c.toneExposure.toFixed(2));
      setVal('[data-shdr-expo-slider]', String(c.toneExposure));
      setVal('[data-shdr-key]', c.keyIntensity.toFixed(2));
      setVal('[data-shdr-key-slider]', String(c.keyIntensity));
      setVal('[data-shdr-rim]', c.rimIntensity.toFixed(2));
      setVal('[data-shdr-rim-slider]', String(c.rimIntensity));
      setVal('[data-shdr-hemi]', c.hemiIntensity.toFixed(2));
      setVal('[data-shdr-hemi-slider]', String(c.hemiIntensity));
      setVal('[data-shdr-fill]', c.fillIntensity.toFixed(2));
      setVal('[data-shdr-fill-slider]', String(c.fillIntensity));
      setVal('[data-shdr-kx]', c.keyDirX.toFixed(1));
      setVal('[data-shdr-ky]', c.keyDirY.toFixed(1));
      setVal('[data-shdr-kz]', c.keyDirZ.toFixed(1));
      setVal('[data-shdr-thick]', c.outlineThickness.toFixed(4));
      setVal('[data-shdr-thick-slider]', String(c.outlineThickness));
      setVal('[data-shdr-alpha]', c.outlineAlpha.toFixed(2));
      setVal('[data-shdr-band0]', String(c.toonBand0));
      setVal('[data-shdr-band1]', String(c.toonBand1));
      setVal('[data-shdr-band2]', String(c.toonBand2));
      setVal('[data-shdr-key-color]', c.keyColor);
      setVal('[data-shdr-rim-color]', c.rimColor);
      setVal('[data-shdr-hemi-sky]', c.hemiSkyColor);
      setVal('[data-shdr-hemi-gr]', c.hemiGroundColor);
      setVal('[data-shdr-fill-color]', c.fillColor);
      setVal('[data-shdr-outline-color]', c.outlineColor);
      setVal('[data-shdr-bg-solid]', c.bgMode === 'solid');
      setVal('[data-shdr-bg-color]', c.bgColor);
      setVal('[data-shdr-grid]', c.showGrid);
      setVal('[data-shdr-ground]', c.showGround);
      setVal('[data-shdr-fov]', String(c.fov));
      setVal('[data-shdr-fov-slider]', String(c.fov));
    };
    refresh();

    const commit = (): void => {
      this.applyShaderConfig();
      saveShaderConfig(this.shaderConfig);
    };

    const bindNum = (sel: string, key: keyof ShaderConfig, slider?: string): void => {
      const inp = q<HTMLInputElement>(sel);
      const sl = slider ? q<HTMLInputElement>(slider) : null;
      const handler = (val: string): void => {
        const v = Number(val);
        if (!Number.isFinite(v)) return;
        (this.shaderConfig[key] as number) = v;
        if (sl && sl.value !== val) sl.value = val;
        if (inp && inp.value !== val) inp.value = val;
        commit();
      };
      inp?.addEventListener('input', () => handler(inp.value));
      sl?.addEventListener('input', () => handler(sl.value));
    };
    const bindBool = (sel: string, key: keyof ShaderConfig): void => {
      const inp = q<HTMLInputElement>(sel);
      inp?.addEventListener('change', () => {
        (this.shaderConfig[key] as boolean) = inp.checked;
        commit();
      });
    };
    const bindColor = (sel: string, key: keyof ShaderConfig): void => {
      const inp = q<HTMLInputElement>(sel);
      inp?.addEventListener('input', () => {
        (this.shaderConfig[key] as string) = inp.value;
        commit();
      });
    };

    bindBool('[data-shdr-toon]', 'toonEnabled');
    bindBool('[data-shdr-outline]', 'outlineEnabled');
    bindBool('[data-shdr-grid]', 'showGrid');
    bindBool('[data-shdr-ground]', 'showGround');
    bindNum('[data-shdr-expo]', 'toneExposure', '[data-shdr-expo-slider]');
    bindNum('[data-shdr-key]', 'keyIntensity', '[data-shdr-key-slider]');
    bindNum('[data-shdr-rim]', 'rimIntensity', '[data-shdr-rim-slider]');
    bindNum('[data-shdr-hemi]', 'hemiIntensity', '[data-shdr-hemi-slider]');
    bindNum('[data-shdr-fill]', 'fillIntensity', '[data-shdr-fill-slider]');
    bindNum('[data-shdr-kx]', 'keyDirX');
    bindNum('[data-shdr-ky]', 'keyDirY');
    bindNum('[data-shdr-kz]', 'keyDirZ');
    bindNum('[data-shdr-thick]', 'outlineThickness', '[data-shdr-thick-slider]');
    bindNum('[data-shdr-alpha]', 'outlineAlpha');
    bindNum('[data-shdr-band0]', 'toonBand0');
    bindNum('[data-shdr-band1]', 'toonBand1');
    bindNum('[data-shdr-band2]', 'toonBand2');
    bindNum('[data-shdr-fov]', 'fov', '[data-shdr-fov-slider]');
    bindColor('[data-shdr-key-color]', 'keyColor');
    bindColor('[data-shdr-rim-color]', 'rimColor');
    bindColor('[data-shdr-hemi-sky]', 'hemiSkyColor');
    bindColor('[data-shdr-hemi-gr]', 'hemiGroundColor');
    bindColor('[data-shdr-fill-color]', 'fillColor');
    bindColor('[data-shdr-outline-color]', 'outlineColor');
    bindColor('[data-shdr-bg-color]', 'bgColor');

    q<HTMLInputElement>('[data-shdr-bg-solid]')?.addEventListener('change', (e) => {
      const on = (e.target as HTMLInputElement).checked;
      this.shaderConfig.bgMode = on ? 'solid' : 'transparent';
      commit();
    });

    q<HTMLButtonElement>('[data-shdr-reset]')?.addEventListener('click', () => {
      this.shaderConfig = { ...DEFAULT_SHADER_CONFIG };
      refresh();
      commit();
      this.setStatus('shader reset to defaults');
    });

    const matUrl = q<HTMLInputElement>('[data-shdr-mat-url]');
    q<HTMLButtonElement>('[data-shdr-mat-pull]')?.addEventListener('click', () => {
      const url = matUrl?.value.trim() || '/models/naia.glb';
      this.setStatus(`pulling materials from ${url}…`);
      void this.pullMaterialsFrom(url).then(() => {
        this.setStatus(`materials pulled from ${url}`);
      });
    });

    q<HTMLButtonElement>('[data-shdr-preset-copy]')?.addEventListener('click', () => {
      const json = JSON.stringify(this.shaderConfig, null, 2);
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(json).then(
          () => this.setStatus(`shader preset copiado · ${json.length} chars`),
          () => {
            console.log('[ThreePilot] shader preset:\n', json);
            this.setStatus('clipboard bloqueado — JSON no console');
          },
        );
      } else {
        console.log('[ThreePilot] shader preset:\n', json);
        this.setStatus('JSON logado no console');
      }
    });

    q<HTMLButtonElement>('[data-shdr-preset-paste]')?.addEventListener('click', () => {
      const raw = window.prompt('cola o JSON do preset:');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<ShaderConfig>;
        this.shaderConfig = { ...DEFAULT_SHADER_CONFIG, ...parsed };
        refresh();
        commit();
        this.setStatus('preset aplicado');
      } catch {
        this.setStatus('JSON inválido');
      }
    });
  }

  /** Apply current shaderConfig to scene lights, renderer, outline + regenerate toon ramp. */
  private applyShaderConfig(): void {
    const c = this.shaderConfig;
    this.renderer.toneMappingExposure = c.toneExposure;
    this.dirLight.intensity = c.keyIntensity;
    this.dirLight.position.set(c.keyDirX, c.keyDirY, c.keyDirZ);
    this.dirLight.color.set(c.keyColor);
    this.rimLight.intensity = c.rimIntensity;
    this.rimLight.color.set(c.rimColor);
    this.hemiLight.intensity = c.hemiIntensity;
    this.hemiLight.color.set(c.hemiSkyColor);
    this.hemiLight.groundColor.set(c.hemiGroundColor);
    if (this.fillLight) {
      this.fillLight.intensity = c.fillIntensity;
      this.fillLight.color.set(c.fillColor);
    }
    this.outlineEnabled = c.outlineEnabled;
    const outlineAny = this.outlineEffect as unknown as {
      defaultThickness?: number;
      defaultAlpha?: number;
      defaultColor?: number[];
    };
    outlineAny.defaultThickness = c.outlineThickness;
    outlineAny.defaultAlpha = c.outlineAlpha;
    outlineAny.defaultColor = new THREE.Color(c.outlineColor).toArray();
    this.toonEnabled = c.toonEnabled;
    if (this.currentRoot) this.applyToon(c.toonEnabled);

    if (this.camera.fov !== c.fov) {
      this.camera.fov = c.fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.grid) this.grid.visible = c.showGrid;
    if (this.ground) this.ground.visible = c.showGround;
    if (c.bgMode === 'solid') {
      this.scene.background = new THREE.Color(c.bgColor);
    } else {
      this.scene.background = null;
    }
  }

  /** Generalized version of upgradeTexturesFromTripo — pull materials from any GLB and apply to current mesh. */
  async pullMaterialsFrom(url: string): Promise<void> {
    await this.upgradeTexturesFromTripo(url);
  }

  private getAnimDuration(): number {
    if (this.capturedPoses.length === 0) return Math.max(this.currentDuration, 0.5);
    const maxT = Math.max(...this.capturedPoses.map((p) => p.time));
    return Math.max(maxT, this.currentDuration, 0.5);
  }

  renderTimeline(): void {
    const svg = this.element.querySelector<SVGSVGElement>('[data-timeline-svg]');
    if (!svg) return;
    const dur = this.getAnimDuration();
    const W = svg.clientWidth || 360;
    const H = 60;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    const PAD = 14;
    const usable = W - PAD * 2;
    const trackY = 26;
    const xAt = (t: number): number => PAD + (t / dur) * usable;
    const tAt = (x: number): number => Math.max(0, Math.min(dur, ((x - PAD) / usable) * dur));

    let html = '';
    // Track line
    html += `<line x1="${PAD}" y1="${trackY}" x2="${W - PAD}" y2="${trackY}" stroke="rgba(46,139,87,0.4)" stroke-width="1.5"/>`;
    // Tick marks every 0.5s
    for (let s = 0; s <= dur + 0.001; s += 0.5) {
      const x = xAt(s);
      const isMain = Math.abs(s - Math.round(s)) < 0.01;
      html += `<line x1="${x}" y1="${trackY - 3}" x2="${x}" y2="${trackY + 3}" stroke="rgba(184,194,187,${isMain ? 0.5 : 0.2})" stroke-width="${isMain ? 1 : 0.5}"/>`;
      if (isMain) {
        html += `<text x="${x}" y="${trackY + 16}" font-size="9" fill="rgba(184,194,187,0.55)" text-anchor="middle" font-family="var(--font-mono)">${s.toFixed(0)}s</text>`;
      }
    }
    // Easing segments between consecutive keyframes
    for (let i = 0; i < this.capturedPoses.length - 1; i++) {
      const a = this.capturedPoses[i]!;
      const b = this.capturedPoses[i + 1]!;
      const ax = xAt(a.time);
      const bx = xAt(b.time);
      const midX = (ax + bx) / 2;
      const ease = a.ease ?? 'linear';
      const icon = easeIcon(ease, midX, trackY - 12);
      html += `<g class="timelineEase" data-ease-idx="${i}" style="cursor:pointer;">`;
      html += `<rect x="${midX - 9}" y="${trackY - 21}" width="18" height="14" rx="3" fill="rgba(15,28,24,0.85)" stroke="rgba(46,139,87,0.35)"/>`;
      html += icon;
      html += `<title>${ease} · click pra ciclar</title>`;
      html += `</g>`;
    }
    // Insert-between zones (transparent rects)
    for (let i = 0; i <= this.capturedPoses.length; i++) {
      const x0 = i === 0 ? PAD : xAt(this.capturedPoses[i - 1]!.time) + 6;
      const x1 = i === this.capturedPoses.length ? W - PAD : xAt(this.capturedPoses[i]!.time) - 6;
      if (x1 - x0 < 4) continue;
      html += `<rect class="timelineInsert" data-insert-after="${i - 1}" x="${x0}" y="${trackY - 10}" width="${x1 - x0}" height="20" fill="transparent" style="cursor:copy;"/>`;
    }
    // Keyframe diamonds
    for (let i = 0; i < this.capturedPoses.length; i++) {
      const p = this.capturedPoses[i]!;
      const x = xAt(p.time);
      const active = i === this.activeKfIdx;
      const fill = active ? '#d4a574' : '#6abf95';
      const stroke = active ? '#fff1d6' : '#1f3a30';
      html += `<g class="timelineKf" data-kf-idx="${i}" style="cursor:grab;">`;
      html += `<polygon points="${x},${trackY - 7} ${x + 6},${trackY} ${x},${trackY + 7} ${x - 6},${trackY}" fill="${fill}" stroke="${stroke}" stroke-width="${active ? 1.5 : 1}"/>`;
      html += `<title>kf #${i} · t=${p.time.toFixed(2)}s</title>`;
      html += `</g>`;
    }
    svg.innerHTML = html;

    // Wire events
    for (const g of svg.querySelectorAll<SVGGElement>('.timelineKf')) {
      const idx = Number(g.dataset.kfIdx);
      let dragging = false;
      let dragMoved = false;
      g.addEventListener('mousedown', (e) => {
        e.preventDefault();
        dragging = true;
        dragMoved = false;
        const startX = e.clientX;
        const onMove = (ev: MouseEvent) => {
          if (!dragging) return;
          if (Math.abs(ev.clientX - startX) > 2) dragMoved = true;
          const rect = svg.getBoundingClientRect();
          const t = Math.round(tAt(ev.clientX - rect.left) * 1000) / 1000;
          const kf = this.capturedPoses[idx];
          if (!kf) return;
          kf.time = t;
          this.renderTimeline();
        };
        const onUp = () => {
          dragging = false;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          if (dragMoved) {
            const kf = this.capturedPoses[idx];
            this.capturedPoses.sort((a, b) => a.time - b.time);
            this.activeKfIdx = kf ? this.capturedPoses.indexOf(kf) : this.activeKfIdx;
            this.renderPosesList();
            this.renderTimeline();
            this.queueAutoSave();
          } else {
            this.makeKeyframeActive(idx);
          }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    }
    for (const r of svg.querySelectorAll<SVGRectElement>('.timelineInsert')) {
      r.addEventListener('click', (e) => {
        const rect = svg.getBoundingClientRect();
        const t = tAt(e.clientX - rect.left);
        this.insertKeyframeAt(Math.round(t * 1000) / 1000);
      });
    }
    for (const g of svg.querySelectorAll<SVGGElement>('.timelineEase')) {
      g.addEventListener('click', () => {
        const idx = Number(g.dataset.easeIdx);
        const kf = this.capturedPoses[idx];
        if (!kf) return;
        const order: Easing[] = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'hold'];
        const cur = kf.ease ?? 'linear';
        const nextIdx = (order.indexOf(cur) + 1) % order.length;
        const next = order[nextIdx]!;
        if (next === 'linear') delete kf.ease;
        else kf.ease = next;
        this.renderTimeline();
        this.queueAutoSave();
        this.setStatus(`easing kf#${idx} → ${next}`);
      });
    }
  }

  /** Insert a keyframe at time t with values interpolated from neighbors. */
  insertKeyframeAt(t: number): void {
    if (!this.currentAnimName) {
      this.setStatus('crie uma animação primeiro');
      return;
    }
    if (this.capturedPoses.some((p) => Math.abs(p.time - t) < 0.001)) {
      this.setStatus(`já existe keyframe em t=${t.toFixed(3)}s`);
      return;
    }
    // Find neighbors
    let prev: EditorPose | null = null;
    let next: EditorPose | null = null;
    for (const p of this.capturedPoses) {
      if (p.time < t) prev = p;
      else if (p.time > t && !next) next = p;
    }
    let bones: EditorBonePose[] = [];
    if (prev && next) {
      const u = (t - prev.time) / (next.time - prev.time);
      const allNames = new Set<string>();
      for (const b of prev.bones) allNames.add(b.bone);
      for (const b of next.bones) allNames.add(b.bone);
      for (const name of allNames) {
        const a = prev.bones.find((b) => b.bone === name);
        const b = next.bones.find((bb) => bb.bone === name);
        const ax = a?.euler ?? [0, 0, 0];
        const bx = b?.euler ?? [0, 0, 0];
        const entry: EditorBonePose = {
          bone: name,
          euler: [
            Math.round((ax[0] + (bx[0] - ax[0]) * u) * 10) / 10,
            Math.round((ax[1] + (bx[1] - ax[1]) * u) * 10) / 10,
            Math.round((ax[2] + (bx[2] - ax[2]) * u) * 10) / 10,
          ],
        };
        const ap = a?.pos;
        const bp = b?.pos;
        if (ap || bp) {
          const aa = ap ?? [0, 0, 0];
          const bb2 = bp ?? [0, 0, 0];
          entry.pos = [
            Math.round((aa[0] + (bb2[0] - aa[0]) * u) * 10000) / 10000,
            Math.round((aa[1] + (bb2[1] - aa[1]) * u) * 10000) / 10000,
            Math.round((aa[2] + (bb2[2] - aa[2]) * u) * 10000) / 10000,
          ];
        }
        const as_ = a?.scl;
        const bs = b?.scl;
        if (as_ || bs) {
          const aa = as_ ?? [1, 1, 1];
          const bb2 = bs ?? [1, 1, 1];
          entry.scl = [
            Math.round((aa[0] + (bb2[0] - aa[0]) * u) * 1000) / 1000,
            Math.round((aa[1] + (bb2[1] - aa[1]) * u) * 1000) / 1000,
            Math.round((aa[2] + (bb2[2] - aa[2]) * u) * 1000) / 1000,
          ];
        }
        bones.push(entry);
      }
    } else if (prev || next) {
      const src = (prev ?? next)!;
      bones = src.bones.map((b) => {
        const out: EditorBonePose = { bone: b.bone, euler: [b.euler[0], b.euler[1], b.euler[2]] };
        if (b.pos) out.pos = [b.pos[0], b.pos[1], b.pos[2]];
        if (b.scl) out.scl = [b.scl[0], b.scl[1], b.scl[2]];
        return out;
      });
    }
    const newKf: EditorPose = { time: t, bones };
    this.capturedPoses.push(newKf);
    this.capturedPoses.sort((a, b) => a.time - b.time);
    this.activeKfIdx = this.capturedPoses.indexOf(newKf);
    this.applyKeyframeToModel(this.activeKfIdx);
    this.renderPosesList();
    this.renderTimeline();
    this.queueAutoSave();
    this.setStatus(`keyframe inserido @ t=${t.toFixed(2)}s (interpolado)`);
  }

  distributeKeyframesEvenly(): void {
    if (this.capturedPoses.length < 2) {
      this.setStatus('precisa ≥ 2 keyframes pra distribuir');
      return;
    }
    const dur = this.currentDuration > 0 ? this.currentDuration : this.getAnimDuration();
    const n = this.capturedPoses.length;
    const activeKf = this.capturedPoses[this.activeKfIdx];
    for (let i = 0; i < n; i++) {
      this.capturedPoses[i]!.time = Math.round(((i / (n - 1)) * dur) * 1000) / 1000;
    }
    this.capturedPoses.sort((a, b) => a.time - b.time);
    if (activeKf) this.activeKfIdx = this.capturedPoses.indexOf(activeKf);
    this.renderPosesList();
    this.renderTimeline();
    this.queueAutoSave();
    this.setStatus(`distribuído ${n} keyframes em ${dur.toFixed(2)}s`);
  }

  applyBulkRotation(boneFilter: string | null, delta: [number, number, number]): void {
    if (this.capturedPoses.length === 0) return;
    if (delta[0] === 0 && delta[1] === 0 && delta[2] === 0) return;
    let touched = 0;
    for (const pose of this.capturedPoses) {
      for (const b of pose.bones) {
        if (boneFilter && b.bone !== boneFilter) continue;
        b.euler = [
          Math.round((b.euler[0] + delta[0]) * 10) / 10,
          Math.round((b.euler[1] + delta[1]) * 10) / 10,
          Math.round((b.euler[2] + delta[2]) * 10) / 10,
        ];
        touched++;
      }
    }
    this.refreshActiveAndPersist(`+rot aplicado em ${touched} bones`);
  }

  applyBulkPosition(boneFilter: string | null, delta: [number, number, number]): void {
    if (this.capturedPoses.length === 0) return;
    if (delta[0] === 0 && delta[1] === 0 && delta[2] === 0) return;
    let touched = 0;
    for (const pose of this.capturedPoses) {
      for (const b of pose.bones) {
        if (boneFilter && b.bone !== boneFilter) continue;
        const cur = b.pos ?? [0, 0, 0];
        b.pos = [
          Math.round((cur[0] + delta[0]) * 10000) / 10000,
          Math.round((cur[1] + delta[1]) * 10000) / 10000,
          Math.round((cur[2] + delta[2]) * 10000) / 10000,
        ];
        touched++;
      }
    }
    this.refreshActiveAndPersist(`+pos aplicado em ${touched} bones`);
  }

  applyBulkScale(boneFilter: string | null, mult: number): void {
    if (this.capturedPoses.length === 0) return;
    if (Math.abs(mult - 1) < 0.001) return;
    let touched = 0;
    for (const pose of this.capturedPoses) {
      for (const b of pose.bones) {
        if (boneFilter && b.bone !== boneFilter) continue;
        const cur = b.scl ?? [1, 1, 1];
        b.scl = [
          Math.round(cur[0] * mult * 1000) / 1000,
          Math.round(cur[1] * mult * 1000) / 1000,
          Math.round(cur[2] * mult * 1000) / 1000,
        ];
        touched++;
      }
    }
    this.refreshActiveAndPersist(`×scl ${mult} aplicado em ${touched} bones`);
  }

  applyBulkMirrorAll(): void {
    if (this.capturedPoses.length === 0) return;
    for (const pose of this.capturedPoses) {
      const newBones: EditorBonePose[] = [];
      const seen = new Set<string>();
      for (const b of pose.bones) {
        const partner = mirrorPartnerName(b.bone) ?? b.bone;
        if (seen.has(partner)) continue;
        seen.add(partner);
        const entry: EditorBonePose = {
          bone: partner,
          euler: [b.euler[0], -b.euler[1], -b.euler[2]],
        };
        if (b.pos) entry.pos = [-b.pos[0], b.pos[1], b.pos[2]];
        if (b.scl) entry.scl = [b.scl[0], b.scl[1], b.scl[2]];
        newBones.push(entry);
      }
      pose.bones = newBones;
    }
    this.refreshActiveAndPersist('mirror aplicado em todos os keyframes');
  }

  private refreshActiveAndPersist(msg: string): void {
    if (this.activeKfIdx >= 0) this.applyKeyframeToModel(this.activeKfIdx);
    this.renderPosesList();
    this.renderTimeline();
    this.queueAutoSave();
    this.setStatus(msg);
  }

  private populateBulkBoneDropdown(): void {
    const sel = this.element.querySelector<HTMLSelectElement>('[data-bulk-bone]');
    if (!sel) return;
    const cur = sel.value;
    const bones = Array.from(this.bindQuaternions.keys()).map((b) => b.name).sort();
    sel.innerHTML = `<option value="">— todos os bones —</option>` + bones
      .map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n.replace(/^mixamorig/, ''))}</option>`)
      .join('');
    if (cur && bones.includes(cur)) sel.value = cur;
  }

  renderBoneDiagram(): void {
    const svg = this.element.querySelector<SVGSVGElement>('[data-bone-diagram]');
    if (!svg) return;
    const boneSelect = this.element.querySelector<HTMLSelectElement>('[data-bonelab-bone]');
    const activeBoneName = boneSelect?.value ?? '';
    const allBones = Array.from(this.bindQuaternions.keys());
    if (allBones.length === 0) {
      svg.innerHTML = '';
      return;
    }

    // Build adjacency by walking UP the scene graph until we hit a Bone that's in our set.
    // Some FBX→GLB converters insert helper Object3D nodes between joints; we have to skip
    // those instead of treating every bone as a root.
    const bySet = new Set<THREE.Bone>(allBones);
    const childrenOf = new Map<string, string[]>();
    const parentOf = new Map<string, string | null>();
    for (const b of allBones) {
      childrenOf.set(b.name, []);
      parentOf.set(b.name, null);
    }
    const findNearestBoneAncestor = (b: THREE.Bone): THREE.Bone | null => {
      let p: THREE.Object3D | null = b.parent;
      while (p) {
        if ((p as THREE.Bone).isBone && bySet.has(p as THREE.Bone)) {
          return p as THREE.Bone;
        }
        p = p.parent;
      }
      return null;
    };
    for (const b of allBones) {
      const p = findNearestBoneAncestor(b);
      if (p) {
        parentOf.set(b.name, p.name);
        childrenOf.get(p.name)?.push(b.name);
      }
    }
    const roots = allBones.filter((b) => parentOf.get(b.name) === null).map((b) => b.name);

    // Reingold-Tilford-ish layout: compute leaf widths bottom-up, then assign x top-down
    const widthOf = new Map<string, number>();
    const computeWidth = (name: string): number => {
      const ch = childrenOf.get(name) ?? [];
      if (ch.length === 0) {
        widthOf.set(name, 1);
        return 1;
      }
      let w = 0;
      for (const c of ch) w += computeWidth(c);
      const final = Math.max(1, w);
      widthOf.set(name, final);
      return final;
    };
    let totalWidth = 0;
    for (const r of roots) totalWidth += computeWidth(r);
    const depthOf = new Map<string, number>();
    const computeDepth = (name: string, d: number): number => {
      depthOf.set(name, d);
      let max = d;
      for (const c of childrenOf.get(name) ?? []) {
        max = Math.max(max, computeDepth(c, d + 1));
      }
      return max;
    };
    let maxDepth = 0;
    for (const r of roots) maxDepth = Math.max(maxDepth, computeDepth(r, 0));

    const DX = 56;
    const DY = 36;
    const MARGIN = 22;
    const W = MARGIN * 2 + totalWidth * DX;
    const H = MARGIN * 2 + (maxDepth + 1) * DY;

    const positions = new Map<string, { x: number; y: number }>();
    let cursor = 0;
    const place = (name: string): void => {
      const w = widthOf.get(name) ?? 1;
      const ch = childrenOf.get(name) ?? [];
      if (ch.length === 0) {
        positions.set(name, {
          x: MARGIN + (cursor + 0.5) * DX,
          y: MARGIN + (depthOf.get(name) ?? 0) * DY,
        });
        cursor += 1;
        return;
      }
      const startCursor = cursor;
      for (const c of ch) place(c);
      const myX = MARGIN + ((startCursor + cursor) / 2) * DX;
      positions.set(name, {
        x: myX,
        y: MARGIN + (depthOf.get(name) ?? 0) * DY,
      });
      // Ensure cursor advances to at least startCursor + w (when subtree has fewer leaves than w would suggest, defensive)
      if (cursor - startCursor < w) cursor = startCursor + w;
    };
    for (const r of roots) place(r);

    const isLikelyTwist = (n: string): boolean => /twist/i.test(n);

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));

    let html = `
      <defs>
        <linearGradient id="diagBgG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(46,139,87,0.08)"/>
          <stop offset="100%" stop-color="rgba(46,139,87,0)"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#diagBgG)" rx="6"/>
    `;

    // Edges first (under nodes)
    for (const [name, pos] of positions) {
      const parent = parentOf.get(name);
      if (!parent) continue;
      const pPos = positions.get(parent);
      if (!pPos) continue;
      const isActive = name === activeBoneName || parent === activeBoneName;
      const stroke = isActive ? 'rgba(212,165,116,0.75)' : 'rgba(46,139,87,0.32)';
      const sw = isActive ? 1.4 : 1;
      html += `<line x1="${pPos.x}" y1="${pPos.y}" x2="${pos.x}" y2="${pos.y}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }

    // Nodes
    for (const b of allBones) {
      const pos = positions.get(b.name);
      if (!pos) continue;
      const isActive = b.name === activeBoneName;
      const twist = isLikelyTwist(b.name);
      const r = isActive ? 9 : twist ? 4 : 6;
      const fill = isActive ? '#d4a574' : twist ? 'rgba(46,139,87,0.35)' : 'rgba(106,191,149,0.65)';
      const stroke = isActive ? '#fff1d6' : 'rgba(31,58,48,0.85)';
      const shortName = b.name
        .replace(/^mixamorig/i, '')
        .replace(/Twist0?1$/i, 'Tw1')
        .replace(/Twist0?2$/i, 'Tw2');
      const labelFill = isActive ? '#fff1d6' : twist ? 'rgba(184,194,187,0.7)' : 'rgba(232,237,233,0.95)';
      const labelFontSize = isActive ? 10 : twist ? 8 : 9;
      const labelFontWeight = isActive ? 600 : 400;
      html += `<g class="boneNode" data-bone-name="${escapeHtml(b.name)}" style="cursor:pointer;">`;
      html += `<circle cx="${pos.x}" cy="${pos.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${isActive ? 1.6 : 1}"/>`;
      html += `<title>${escapeHtml(b.name)}</title>`;
      // Halo stroke behind text so it stays legible over edge lines / other nodes.
      html += `<text class="boneNodeLabel" x="${pos.x}" y="${pos.y - r - 3}" font-size="${labelFontSize}" stroke="rgba(8,12,10,0.85)" stroke-width="2.4" paint-order="stroke" fill="${labelFill}" font-weight="${labelFontWeight}" text-anchor="middle">${escapeHtml(shortName)}</text>`;
      html += `</g>`;
    }

    svg.innerHTML = html;

    for (const g of svg.querySelectorAll<SVGGElement>('.boneNode')) {
      g.addEventListener('click', () => {
        const name = g.dataset.boneName;
        if (!name || !boneSelect) return;
        boneSelect.value = name;
        this.refreshBoneEditorInputs();
        this.renderBoneDiagram();
        this.setStatus(`selecionado: ${name}`);
      });
    }
  }
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const HITBOX_DEFAULTS: Record<HitboxKind, {
  offset: [number, number, number];
  size: [number, number, number];
  duration: number;
  damage: number;
}> = {
  light: { offset: [0, 0, 0.08], size: [0.18, 0.18, 0.22], duration: 0.08, damage: 6 },
  heavy: { offset: [0, 0, 0.12], size: [0.28, 0.24, 0.32], duration: 0.12, damage: 14 },
  special: { offset: [0, 0, 0.18], size: [0.4, 0.32, 0.5], duration: 0.18, damage: 24 },
};

const HITBOX_COLOR: Record<HitboxKind, number> = {
  light: 0xff8a55,
  heavy: 0xff3a3a,
  special: 0xa855f7,
};

function sizeKey(s: [number, number, number]): string {
  return `${s[0].toFixed(3)}|${s[1].toFixed(3)}|${s[2].toFixed(3)}`;
}

function meshSizeMismatch(mesh: THREE.Mesh, size: [number, number, number]): boolean {
  const ud = mesh.userData as { sizeKey?: string };
  return ud.sizeKey !== sizeKey(size);
}

/** Auto-derive arrow visibility: arrow is nocked when string is pulled past threshold. */
function midPullIsDrawn(mid: { x: number; y: number; z: number }): boolean {
  const d2 = mid.x * mid.x + mid.y * mid.y + mid.z * mid.z;
  return d2 > 0.0004;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pickScale(s: string): number {
  const v = Number(s);
  if (!Number.isFinite(v) || v <= 0) return 1;
  return v;
}

function easeIcon(ease: Easing, cx: number, cy: number): string {
  const w = 14;
  const h = 8;
  const x0 = cx - w / 2;
  const y0 = cy;
  const x1 = cx + w / 2;
  const y1 = cy - h;
  const color = '#6ed99e';
  let path = '';
  switch (ease) {
    case 'linear':
      path = `M${x0},${y0} L${x1},${y1}`;
      break;
    case 'ease-in':
      path = `M${x0},${y0} C${cx},${y0} ${cx + 3},${y1} ${x1},${y1}`;
      break;
    case 'ease-out':
      path = `M${x0},${y0} C${cx - 3},${y0} ${cx},${y1} ${x1},${y1}`;
      break;
    case 'ease-in-out':
      path = `M${x0},${y0} C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
      break;
    case 'hold':
      path = `M${x0},${y0} L${cx + 2},${y0} L${cx + 2},${y1} L${x1},${y1}`;
      break;
  }
  return `<path d="${path}" stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round" pointer-events="none"/>`;
}

function mirrorPartnerName(n: string): string | null {
  // Mixamo with optional separator: mixamorigLeft, mixamorig_Left, mixamorig:Left.
  // Captures the prefix (with optional separator) so we preserve it when swapping.
  const mixamoLR = /^(mixamorig[_:]?)(Left|Right)(.*)$/;
  const m = mixamoLR.exec(n);
  if (m) {
    const swap = m[2] === 'Left' ? 'Right' : 'Left';
    return `${m[1]}${swap}${m[3]}`;
  }
  // Bespoke prefixes
  if (/^L_/.test(n)) return n.replace(/^L_/, 'R_');
  if (/^R_/.test(n)) return n.replace(/^R_/, 'L_');
  if (/^Left/.test(n)) return n.replace(/^Left/, 'Right');
  if (/^Right/.test(n)) return n.replace(/^Right/, 'Left');
  // Trailing suffixes
  if (/_L$/.test(n)) return n.replace(/_L$/, '_R');
  if (/_R$/.test(n)) return n.replace(/_R$/, '_L');
  return null;
}
