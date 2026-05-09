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
  isNaiaModelUrl,
  NAIA_BOW_NAME,
  NAIA_BOWSTRING_NAME,
  NAIA_GLASSES_NAME,
  propTransformToJson,
} from './naia-model.js';
import {
  buildProceduralClip,
  PROCEDURAL_ANIMS,
} from './procedural-anims.js';
import styles from './ThreePilot.module.css';

interface LoadedModel {
  root: THREE.Object3D;
  animations: THREE.AnimationClip[];
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
  private mixer: THREE.AnimationMixer | null = null;
  private clips: THREE.AnimationClip[] = [];
  private currentAction: THREE.AnimationAction | null = null;
  private isPlaying = true;
  private playbackSpeed = 1;

  private toonEnabled = true;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private bindQuaternions = new Map<THREE.Bone, THREE.Quaternion>();

  private capturedPoses: {
    time: number;
    bones: { bone: string; euler: [number, number, number] }[];
  }[] = [];

  private stepFps = 0;
  private stepAccumulator = 0;

  private outlineEffect: OutlineEffect;
  private outlineEnabled = true;

  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;

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
            <option value="/models/naia.glb">Naia</option>
            <option value="/models/forest-sprite.glb">Forest Sprite</option>
            <option value="/models/bramble-breast.glb">Bramble Beast</option>
          </select>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-play data-active="true" style="flex: 1;">⏸ Pause</button>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Animações</span>
          <label class="${styles.fileBtn}">
            Carregar JSON salvo
            <input type="file" accept=".json,application/json" data-anim-import-file>
          </label>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-anim-play style="flex: 1;">▶ Play timeline</button>
            <button class="${styles.controlBtn}" data-anim-export style="flex: 1;">Export JSON</button>
            <button class="${styles.controlBtn}" data-anim-clear style="flex: 1;">Clear all</button>
          </div>
          <div class="${styles.posesList}" data-anim-poses-list>
            <div class="${styles.empty}">nenhuma pose capturada</div>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Bone Editor — set rotation + capture</span>
          <select class="${styles.select}" data-bonelab-bone></select>
          <div class="${styles.controls}" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="${styles.statLabel}" style="white-space: nowrap;">euler:</span>
            <input class="${styles.range}" type="number" step="1" data-bonelab-x style="flex: 1 1 0; min-width: 0;" placeholder="X">
            <input class="${styles.range}" type="number" step="1" data-bonelab-y style="flex: 1 1 0; min-width: 0;" placeholder="Y">
            <input class="${styles.range}" type="number" step="1" data-bonelab-z style="flex: 1 1 0; min-width: 0;" placeholder="Z">
            <span class="${styles.statLabel}" style="white-space: nowrap;">°</span>
          </div>
          <div class="${styles.controls}" style="display: flex; align-items: center; gap: var(--space-2);">
            <span class="${styles.statLabel}" style="white-space: nowrap;">t =</span>
            <input class="${styles.range}" type="number" min="0" max="20" step="0.05" data-anim-time style="flex: 1; min-width: 60px;" placeholder="0">
            <span class="${styles.statLabel}" style="white-space: nowrap;">s</span>
            <button class="${styles.controlBtn}" data-bonelab-apply style="flex: 0 0 auto;">Apply + save</button>
          </div>
          <div class="${styles.controls}">
            <button class="${styles.controlBtn}" data-anim-capture style="flex: 1;">Capture all → t</button>
            <button class="${styles.controlBtn}" data-bonelab-reset style="flex: 1;">Bind T-pose</button>
          </div>
        </div>

        <div class="${styles.section}">
          <span class="${styles.sectionLabel}">Props — calibrar bow + glasses</span>
          <select class="${styles.select}" data-prop-target>
            <option value="">— escolha uma prop —</option>
            <option value="naia-bow">Arco (+ corda)</option>
            <option value="naia-bowstring">└─ Corda (só)</option>
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

    const fillLight = new THREE.DirectionalLight(0xd4a574, 0.2);
    fillLight.position.set(0, 1, 5);
    this.scene.add(fillLight);

    this.renderer.toneMappingExposure = 0.9;

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
    });
    this.propGizmo.addEventListener('change', () => {
      this.enforceUniformScale();
      this.refreshPropInputs();
    });
    const gizmoHelper = (this.propGizmo as unknown as { getHelper?: () => THREE.Object3D }).getHelper?.();
    this.scene.add(gizmoHelper ?? (this.propGizmo as unknown as THREE.Object3D));

    this.spawnPlaceholder();
    this.bindEvents();

    void this.loadModel('/models/naia.glb', [])
      .then(() => {
        this.playProceduralAnim('proc-idle-breath');
        this.markProcAnimButtonActive('proc-idle-breath');
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

  capturePoseAt(time: number): void {
    if (!this.currentRoot) {
      this.setStatus('carregue um modelo primeiro');
      return;
    }
    const changed: { bone: string; euler: [number, number, number] }[] = [];
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
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(dz) > 0.5) {
        changed.push({
          bone: bone.name,
          euler: [
            Math.round(dx * 10) / 10,
            Math.round(dy * 10) / 10,
            Math.round(dz * 10) / 10,
          ],
        });
      }
    }
    this.capturedPoses = this.capturedPoses.filter((p) => p.time !== time);
    this.capturedPoses.push({ time, bones: changed });
    this.capturedPoses.sort((a, b) => a.time - b.time);
    this.renderPosesList();
    this.setStatus(`pose capturada em t=${time.toFixed(2)}s · ${changed.length} bones`);
  }

  private renderPosesList(): void {
    const el = this.element.querySelector<HTMLElement>('[data-anim-poses-list]');
    if (!el) return;
    if (this.capturedPoses.length === 0) {
      el.innerHTML = `<div class="${styles.empty}">nenhuma pose capturada</div>`;
      return;
    }
    el.innerHTML = this.capturedPoses
      .map((p) => {
        const bones = p.bones
          .map(
            (b) => `
              <div class="${styles.poseBoneRow}">
                <span class="${styles.poseBoneName}">${b.bone.replace(/^mixamorig/, '')}</span>
                <span class="${styles.poseBoneEuler}">[${b.euler[0].toFixed(1)}, ${b.euler[1].toFixed(1)}, ${b.euler[2].toFixed(1)}]</span>
              </div>`,
          )
          .join('');
        return `
          <div class="${styles.poseRow}" data-pose-time="${p.time}">
            <div class="${styles.poseRowHead}">
              <span class="${styles.poseTime}">t=${p.time.toFixed(2)}s</span>
              <span class="${styles.poseCount}">${p.bones.length} bones</span>
              <button class="${styles.poseRowBtn}" data-pose-preview="${p.time}" title="preview pose">▶</button>
              <button class="${styles.poseRowBtn}" data-pose-edit="${p.time}" title="load pose into editor">✎</button>
              <button class="${styles.poseRowBtn} ${styles.poseRowBtnDel}" data-pose-delete="${p.time}" title="delete pose">×</button>
            </div>
            ${
              p.bones.length > 0
                ? `<div class="${styles.poseBones}">${bones}</div>`
                : ''
            }
          </div>`;
      })
      .join('');
    for (const btn of el.querySelectorAll<HTMLElement>('[data-pose-preview]')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.previewPoseAtTime(Number(btn.dataset.posePreview));
      });
    }
    for (const btn of el.querySelectorAll<HTMLElement>('[data-pose-edit]')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadPoseIntoEditor(Number(btn.dataset.poseEdit));
      });
    }
    for (const btn of el.querySelectorAll<HTMLElement>('[data-pose-delete]')) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePoseAtTime(Number(btn.dataset.poseDelete));
      });
    }
  }

  previewPoseAtTime(time: number): void {
    const pose = this.capturedPoses.find((p) => p.time === time);
    if (!pose || !this.currentRoot) return;
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    for (const [bone, q] of this.bindQuaternions) bone.quaternion.copy(q);
    for (const br of pose.bones) {
      const target = this.findBoneByName(br.bone);
      if (!target) continue;
      const bindQ = this.bindQuaternions.get(target);
      const deltaQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(br.euler[0]),
          THREE.MathUtils.degToRad(br.euler[1]),
          THREE.MathUtils.degToRad(br.euler[2]),
          'XYZ',
        ),
      );
      if (bindQ) target.quaternion.copy(bindQ).multiply(deltaQ);
      else target.quaternion.copy(deltaQ);
    }
    this.setStatus(`preview pose t=${time.toFixed(2)}s · ${pose.bones.length} bones`);
  }

  loadPoseIntoEditor(time: number): void {
    this.previewPoseAtTime(time);
    const timeInput = this.element.querySelector<HTMLInputElement>('[data-anim-time]');
    if (timeInput) timeInput.value = time.toFixed(2);
    const rows = this.element.querySelectorAll<HTMLElement>('[data-pose-time]');
    for (const r of rows) {
      r.dataset.selected = r.dataset.poseTime === String(time) ? 'true' : 'false';
    }
    this.setStatus(
      `editando pose t=${time.toFixed(2)}s · ajusta bones e re-Capture pra salvar`,
    );
  }

  deletePoseAtTime(time: number): void {
    const before = this.capturedPoses.length;
    this.capturedPoses = this.capturedPoses.filter((p) => p.time !== time);
    if (this.capturedPoses.length < before) {
      this.renderPosesList();
      this.setStatus(`pose t=${time.toFixed(2)}s deletada`);
    }
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
      poses?: { time: number; bones: { bone: string; euler: [number, number, number] }[] }[];
    };
    if (!spec.poses || !Array.isArray(spec.poses)) {
      this.setStatus('JSON sem campo "poses"');
      return;
    }
    this.capturedPoses = spec.poses
      .filter(
        (p) => typeof p.time === 'number' && Array.isArray(p.bones),
      )
      .map((p) => ({
        time: p.time,
        bones: p.bones.map((b) => ({
          bone: String(b.bone),
          euler: [
            Number(b.euler?.[0] ?? 0),
            Number(b.euler?.[1] ?? 0),
            Number(b.euler?.[2] ?? 0),
          ] as [number, number, number],
        })),
      }))
      .sort((a, b) => a.time - b.time);
    this.renderPosesList();
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
    const expandedPoses = this.capturedPoses.map((pose) => ({
      time: pose.time,
      bones: Array.from(allBoneNames).map((name) => {
        const found = pose.bones.find((b) => b.bone === name);
        return {
          bone: name,
          euler: (found?.euler ?? [0, 0, 0]) as [number, number, number],
        };
      }),
    }));

    const spec = {
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
    this.setStatus('bind T-pose');
  }

  show() {
    this.element.dataset.visible = 'true';
    this.handleResize();
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
      if (isNaiaModelUrl(baseLabel)) {
        applyNaiaTransforms(baseLoaded.root);
        void attachNaiaProps(baseLoaded.root);
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
    }

    const root = loaded.root;
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
      if (bone.isBone) this.bindQuaternions.set(bone, bone.quaternion.clone());
    });

    this.mirrorRightArmToLeft();
    root.traverse((obj) => {
      const bone = obj as THREE.Bone;
      if (bone.isBone && /^mixamorigLeft(Shoulder|Arm|ForeArm|Hand)$/.test(bone.name)) {
        this.bindQuaternions.set(bone, bone.quaternion.clone());
      }
    });

    this.populateBoneLabDropdown();

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
      const grad = createToonGradient();
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
    const animTimeInput = this.element.querySelector<HTMLInputElement>('[data-anim-time]')!;
    const applyBtn = this.element.querySelector<HTMLElement>('[data-bonelab-apply]')!;
    const applyFromInputs = () => {
      const x = Number(xInput.value) || 0;
      const y = Number(yInput.value) || 0;
      const z = Number(zInput.value) || 0;
      const t = Number(animTimeInput.value) || 0;
      this.applyBoneAndCapture(boneSelect.value, x, y, z, t);
    };
    applyBtn.addEventListener('click', applyFromInputs);

    for (const inp of [xInput, yInput, zInput]) {
      inp.addEventListener('input', applyFromInputs);
    }

    boneSelect.addEventListener('change', () => {
      this.populateEditorInputsFromPose(
        boneSelect.value,
        Number(animTimeInput.value) || 0,
        xInput,
        yInput,
        zInput,
      );
    });
    animTimeInput.addEventListener('change', () => {
      this.populateEditorInputsFromPose(
        boneSelect.value,
        Number(animTimeInput.value) || 0,
        xInput,
        yInput,
        zInput,
      );
    });

    const captureBtn = this.element.querySelector<HTMLElement>('[data-anim-capture]')!;
    captureBtn.addEventListener('click', () => {
      const t = Number(animTimeInput.value) || 0;
      this.capturePoseAt(t);
      animTimeInput.value = (t + 0.15).toFixed(2);
    });

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

    const animPlayBtn = this.element.querySelector<HTMLElement>('[data-anim-play]')!;
    animPlayBtn.addEventListener('click', () => this.playCapturedTimeline());
    const animExportBtn = this.element.querySelector<HTMLElement>('[data-anim-export]')!;
    animExportBtn.addEventListener('click', () => this.exportCapturedAsJSON());
    const animClearBtn = this.element.querySelector<HTMLElement>('[data-anim-clear]')!;
    animClearBtn.addEventListener('click', () => this.clearCapturedPoses());

    const importFileInput = this.element.querySelector<HTMLInputElement>('[data-anim-import-file]')!;
    importFileInput.addEventListener('change', () => {
      const file = importFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        this.importPosesFromJSON(text);
      };
      reader.onerror = () => {
        this.setStatus('erro lendo arquivo');
        console.error('[ThreePilot] file read error:', reader.error);
      };
      reader.readAsText(file);
      importFileInput.value = '';
    });

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
    const offsets = {
      $schema: 'naia-props-offsets/v1',
      _note: 'Generated by /editor.html (Props panel)',
      bow: bow ? propTransformToJson(bow) : null,
      glasses: glasses ? propTransformToJson(glasses) : null,
      bowstring: bowstring ? propTransformToJson(bowstring) : null,
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

  private populateEditorInputsFromPose(
    boneName: string,
    time: number,
    xInput: HTMLInputElement,
    yInput: HTMLInputElement,
    zInput: HTMLInputElement,
  ): void {
    const pose = this.capturedPoses.find((p) => p.time === time);
    const found = pose?.bones.find((b) => b.bone === boneName);
    if (found) {
      xInput.value = String(found.euler[0]);
      yInput.value = String(found.euler[1]);
      zInput.value = String(found.euler[2]);
    } else {
      xInput.value = '0';
      yInput.value = '0';
      zInput.value = '0';
    }
  }

  applyBoneAndCapture(
    boneName: string,
    eulerX: number,
    eulerY: number,
    eulerZ: number,
    time: number,
  ): void {
    if (!this.currentRoot) {
      this.setStatus('carregue um modelo primeiro');
      return;
    }
    if (this.mixer && this.currentAction) {
      this.mixer.stopAllAction();
      this.currentAction = null;
    }
    const target = this.findBoneByName(boneName);
    if (!target) {
      this.setStatus(`bone não encontrado: ${boneName}`);
      return;
    }
    const bindQ = this.bindQuaternions.get(target);
    const deltaQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(eulerX),
        THREE.MathUtils.degToRad(eulerY),
        THREE.MathUtils.degToRad(eulerZ),
        'XYZ',
      ),
    );
    if (bindQ) target.quaternion.copy(bindQ).multiply(deltaQ);
    else target.quaternion.copy(deltaQ);

    let pose = this.capturedPoses.find((p) => p.time === time);
    if (!pose) {
      pose = { time, bones: [] };
      this.capturedPoses.push(pose);
      this.capturedPoses.sort((a, b) => a.time - b.time);
    }
    const existing = pose.bones.findIndex((b) => b.bone === boneName);
    const isRest = Math.abs(eulerX) < 0.01 && Math.abs(eulerY) < 0.01 && Math.abs(eulerZ) < 0.01;
    if (isRest) {
      if (existing >= 0) pose.bones.splice(existing, 1);
    } else if (existing >= 0) {
      pose.bones[existing] = {
        bone: boneName,
        euler: [eulerX, eulerY, eulerZ],
      };
    } else {
      pose.bones.push({
        bone: boneName,
        euler: [eulerX, eulerY, eulerZ],
      });
    }

    this.renderPosesList();
    this.setStatus(
      `${boneName.replace(/^mixamorig/, '')} → [${eulerX}, ${eulerY}, ${eulerZ}] @ t=${time.toFixed(2)}s`,
    );
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
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
