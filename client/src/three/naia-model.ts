import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import savedOffsetsRaw from './naia-props-offsets.json';

export interface NaiaTransformOptions {
  headScale?: number;
}

const DEFAULT_HEAD_SCALE = 1.3;

const BOW_URL = '/models/naia-bow.glb';
const GLASSES_URL = '/models/naia-glasses.glb';

export type NaiaRigKey = 'tripo' | 'mixamo';

export function getNaiaRigKey(url: string): NaiaRigKey {
  return /mixamo/i.test(url) ? 'mixamo' : 'tripo';
}

interface RawOffset {
  position: number[];
  rotation: number[];
  scale: number;
}
interface RigSection {
  bow?: RawOffset | null;
  glasses?: RawOffset | null;
  bowstring?: RawOffset | null;
  bowstringMid?: { position: number[] } | null;
}
interface OffsetsFile {
  $schema?: string;
  rigs?: Record<NaiaRigKey, RigSection>;
  // v1 legacy keys at root
  bow?: RawOffset | null;
  glasses?: RawOffset | null;
  bowstring?: RawOffset | null;
  bowstringMid?: { position: number[] } | null;
}

const savedOffsets = savedOffsetsRaw as OffsetsFile;

function getRigSection(rig: NaiaRigKey): RigSection {
  if (savedOffsets.rigs?.[rig]) return savedOffsets.rigs[rig];
  // v1 fallback: root-level keys are Tripo offsets.
  if (rig === 'tripo') {
    return {
      bow: savedOffsets.bow ?? null,
      glasses: savedOffsets.glasses ?? null,
      bowstring: savedOffsets.bowstring ?? null,
      bowstringMid: savedOffsets.bowstringMid ?? null,
    };
  }
  return {};
}

function offsetFromJson(j: RawOffset | null | undefined) {
  if (!j) return { position: new THREE.Vector3(), rotationEuler: new THREE.Euler(), scale: 1 };
  return {
    position: new THREE.Vector3(j.position[0] ?? 0, j.position[1] ?? 0, j.position[2] ?? 0),
    rotationEuler: new THREE.Euler(j.rotation[0] ?? 0, j.rotation[1] ?? 0, j.rotation[2] ?? 0),
    scale: j.scale ?? 1,
  };
}

const BOWSTRING = {
  color: 0xf2ead4,
  radius: 0.0035,
  segments: 6,
};

export function isNaiaModelUrl(url: string): boolean {
  return /\/naia(\.|-)/i.test(url) && /\.(glb|gltf|fbx)(\?|$)/i.test(url);
}

export function applyNaiaTransforms(
  root: THREE.Object3D,
  opts: NaiaTransformOptions = {},
): void {
  const headScale = opts.headScale ?? DEFAULT_HEAD_SCALE;

  if (headScale !== 1) {
    root.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone && /^head$/i.test(b.name)) {
        b.scale.setScalar(headScale);
      }
    });
  }
}

export async function attachNaiaProps(
  root: THREE.Object3D,
  modelUrl: string = '/models/naia.glb',
): Promise<void> {
  const rigKey = getNaiaRigKey(modelUrl);
  const section = getRigSection(rigKey);
  const bowOffset = offsetFromJson(section.bow);
  const glassesOffset = offsetFromJson(section.glasses);

  const loader = new GLTFLoader();
  const [bowResult, glassesResult] = await Promise.allSettled([
    loader.loadAsync(BOW_URL),
    loader.loadAsync(GLASSES_URL),
  ]);

  // Match both Tripo (R_Hand) and Mixamo (mixamorigRightHand) naming.
  const handBone =
    findBone(root, /^r[._-]?hand$/i) ?? findBone(root, /righthand$/i);
  const headBone = findBone(root, /head$/i);

  if (bowResult.status === 'fulfilled') {
    if (handBone) {
      bowResult.value.scene.name = NAIA_BOW_NAME;
      attachToBone(handBone, bowResult.value.scene, bowOffset);
      addBowstring(bowResult.value.scene, rigKey);
    } else {
      console.warn('[naia-model] R_Hand bone not found — skipping bow attach');
    }
  } else {
    console.warn('[naia-model] failed to load bow:', bowResult.reason);
  }

  if (glassesResult.status === 'fulfilled') {
    if (headBone) {
      glassesResult.value.scene.name = NAIA_GLASSES_NAME;
      attachToBone(headBone, glassesResult.value.scene, glassesOffset);
    } else {
      console.warn('[naia-model] Head bone not found — skipping glasses attach');
    }
  } else {
    console.warn('[naia-model] failed to load glasses:', glassesResult.reason);
  }
}

export const NAIA_BOW_NAME = 'naia-bow';
export const NAIA_GLASSES_NAME = 'naia-glasses';
export const NAIA_BOWSTRING_NAME = 'naia-bowstring';
export const NAIA_BOWSTRING_MID_NAME = 'naia-bowstring-mid';
export const NAIA_BOW_ARROW_NAME = 'naia-bow-arrow';

interface BowstringRigUserData {
  rig: BowstringRig;
}

export function getBowstringRig(root: THREE.Object3D): BowstringRig | null {
  const group = root.getObjectByName(NAIA_BOWSTRING_NAME);
  if (!group) return null;
  const ud = group.userData as Partial<BowstringRigUserData>;
  return ud.rig ?? null;
}

export function propTransformToJson(obj: THREE.Object3D): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
} {
  return {
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
    scale: obj.scale.x,
  };
}

function findBone(root: THREE.Object3D, name: RegExp): THREE.Bone | null {
  let found: THREE.Bone | null = null;
  root.traverse((o) => {
    const b = o as THREE.Bone;
    if (!found && b.isBone && name.test(b.name)) found = b;
  });
  return found;
}

function attachToBone(
  bone: THREE.Bone,
  prop: THREE.Object3D,
  offset: { position: THREE.Vector3; rotationEuler: THREE.Euler; scale: number },
): void {
  prop.position.copy(offset.position);
  prop.rotation.copy(offset.rotationEuler);
  prop.scale.setScalar(offset.scale);
  bone.add(prop);
}

function computeLocalBbox(root: THREE.Object3D): THREE.Box3 {
  const result = new THREE.Box3();
  result.makeEmpty();
  const tempBox = new THREE.Box3();
  const tempMat = new THREE.Matrix4();
  const matStack: THREE.Matrix4[] = [];

  root.traverse((node) => {
    if (node === root) return;
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    tempBox.copy(mesh.geometry.boundingBox);

    matStack.length = 0;
    let curr: THREE.Object3D | null = mesh;
    while (curr && curr !== root) {
      matStack.unshift(curr.matrix);
      curr = curr.parent;
    }
    tempMat.identity();
    for (const m of matStack) tempMat.multiply(m);
    tempBox.applyMatrix4(tempMat);
    result.union(tempBox);
  });

  return result;
}

class BowstringRig {
  readonly group: THREE.Group;
  readonly midHandle: THREE.Object3D;
  readonly arrow: THREE.Object3D;
  private readonly topAnchor: THREE.Vector3;
  private readonly botAnchor: THREE.Vector3;
  private readonly upperSeg: THREE.Mesh;
  private readonly lowerSeg: THREE.Mesh;

  constructor(top: THREE.Vector3, mid: THREE.Vector3, bot: THREE.Vector3) {
    this.group = new THREE.Group();
    this.group.name = NAIA_BOWSTRING_NAME;
    (this.group.userData as BowstringRigUserData).rig = this;
    this.topAnchor = top.clone();
    this.botAnchor = bot.clone();

    this.midHandle = new THREE.Object3D();
    this.midHandle.name = NAIA_BOWSTRING_MID_NAME;
    this.midHandle.position.copy(mid);
    this.group.add(this.midHandle);

    const mat = new THREE.MeshBasicMaterial({ color: BOWSTRING.color });
    const cylGeom = (): THREE.CylinderGeometry =>
      new THREE.CylinderGeometry(
        BOWSTRING.radius,
        BOWSTRING.radius,
        1,
        BOWSTRING.segments,
      );
    this.upperSeg = new THREE.Mesh(cylGeom(), mat);
    this.lowerSeg = new THREE.Mesh(cylGeom(), mat);
    this.group.add(this.upperSeg, this.lowerSeg);

    this.arrow = buildArrowMesh();
    this.arrow.visible = false;
    this.midHandle.add(this.arrow);

    this.group.onBeforeRender = () => this.refreshSegments();
    this.refreshSegments();
  }

  setArrowVisible(v: boolean): void {
    this.arrow.visible = v;
  }

  setMidPullLocal(p: { x: number; y: number; z: number }): void {
    this.midHandle.position.set(p.x, p.y, p.z);
    this.refreshSegments();
  }

  getMidPullLocal(): THREE.Vector3 {
    return this.midHandle.position.clone();
  }

  private refreshSegments(): void {
    placeSegment(this.upperSeg, this.topAnchor, this.midHandle.position);
    placeSegment(this.lowerSeg, this.midHandle.position, this.botAnchor);
  }
}

const ARROW_SHAFT_COLOR = 0xa0866b;
const ARROW_TIP_COLOR = 0x3a3a3a;
const ARROW_FLETCH_COLOR = 0xc24a4a;
const ARROW_LENGTH = 0.22;
const ARROW_RADIUS = 0.0028;

function buildArrowMesh(): THREE.Group {
  const grp = new THREE.Group();
  grp.name = NAIA_BOW_ARROW_NAME;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(ARROW_RADIUS, ARROW_RADIUS, ARROW_LENGTH, 6),
    new THREE.MeshBasicMaterial({ color: ARROW_SHAFT_COLOR }),
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = ARROW_LENGTH / 2;
  grp.add(shaft);
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.005, 0.015, 6),
    new THREE.MeshBasicMaterial({ color: ARROW_TIP_COLOR }),
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = ARROW_LENGTH + 0.0075;
  grp.add(tip);
  const fletchMat = new THREE.MeshBasicMaterial({ color: ARROW_FLETCH_COLOR, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const fletch = new THREE.Mesh(new THREE.PlaneGeometry(0.018, 0.012), fletchMat);
    fletch.position.z = 0.012;
    fletch.rotation.z = (i * Math.PI * 2) / 3;
    grp.add(fletch);
  }
  return grp;
}

const _segMid = new THREE.Vector3();
const _segDir = new THREE.Vector3();
const _segUp = new THREE.Vector3(0, 1, 0);
function placeSegment(seg: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3): void {
  _segMid.copy(start).lerp(end, 0.5);
  _segDir.copy(end).sub(start);
  const len = _segDir.length();
  seg.position.copy(_segMid);
  if (len > 1e-6) {
    _segDir.divideScalar(len);
    seg.quaternion.setFromUnitVectors(_segUp, _segDir);
    seg.scale.set(1, len, 1);
  }
}

function addBowstring(bowScene: THREE.Object3D, rigKey: NaiaRigKey): void {
  const box = computeLocalBbox(bowScene);
  if (box.isEmpty()) return;
  const min = box.min;
  const max = box.max;
  const height = max.y - min.y;
  if (height <= 0) return;

  const cx = (min.x + max.x) / 2;
  const cy = (min.y + max.y) / 2;
  const cz = max.z + 0.005;
  const halfH = height / 2;

  const top = new THREE.Vector3(0, halfH, 0);
  const bot = new THREE.Vector3(0, -halfH, 0);
  const mid = new THREE.Vector3(0, 0, 0);

  const rig = new BowstringRig(top, mid, bot);
  rig.group.position.set(cx, cy, cz);
  bowScene.add(rig.group);

  const section = getRigSection(rigKey);
  if (section.bowstring) {
    rig.group.position.set(
      section.bowstring.position[0] ?? cx,
      section.bowstring.position[1] ?? cy,
      section.bowstring.position[2] ?? cz,
    );
    rig.group.rotation.set(
      section.bowstring.rotation[0] ?? 0,
      section.bowstring.rotation[1] ?? 0,
      section.bowstring.rotation[2] ?? 0,
    );
    rig.group.scale.setScalar(section.bowstring.scale ?? 1);
  }
  if (section.bowstringMid) {
    rig.setMidPullLocal({
      x: section.bowstringMid.position[0] ?? 0,
      y: section.bowstringMid.position[1] ?? 0,
      z: section.bowstringMid.position[2] ?? 0,
    });
  }
}
