import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import savedOffsets from './naia-props-offsets.json';

export interface NaiaTransformOptions {
  headScale?: number;
}

const DEFAULT_HEAD_SCALE = 1.3;

const BOW_URL = '/models/naia-bow.glb';
const GLASSES_URL = '/models/naia-glasses.glb';

function offsetFromJson(j: { position: number[]; rotation: number[]; scale: number }) {
  return {
    position: new THREE.Vector3(j.position[0] ?? 0, j.position[1] ?? 0, j.position[2] ?? 0),
    rotationEuler: new THREE.Euler(j.rotation[0] ?? 0, j.rotation[1] ?? 0, j.rotation[2] ?? 0),
    scale: j.scale ?? 1,
  };
}
const BOW_OFFSET = offsetFromJson(savedOffsets.bow);
const GLASSES_OFFSET = offsetFromJson(savedOffsets.glasses);

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

export async function attachNaiaProps(root: THREE.Object3D): Promise<void> {
  const loader = new GLTFLoader();
  const [bowResult, glassesResult] = await Promise.allSettled([
    loader.loadAsync(BOW_URL),
    loader.loadAsync(GLASSES_URL),
  ]);

  const handBone = findBone(root, /^r[._-]?hand$/i);
  const headBone = findBone(root, /^head$/i);

  if (bowResult.status === 'fulfilled') {
    if (handBone) {
      bowResult.value.scene.name = NAIA_BOW_NAME;
      attachToBone(handBone, bowResult.value.scene, BOW_OFFSET);
      addBowstring(bowResult.value.scene);
    } else {
      console.warn('[naia-model] R_Hand bone not found — skipping bow attach');
    }
  } else {
    console.warn('[naia-model] failed to load bow:', bowResult.reason);
  }

  if (glassesResult.status === 'fulfilled') {
    if (headBone) {
      glassesResult.value.scene.name = NAIA_GLASSES_NAME;
      attachToBone(headBone, glassesResult.value.scene, GLASSES_OFFSET);
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

function addBowstring(bowScene: THREE.Object3D): void {
  const box = computeLocalBbox(bowScene);
  if (box.isEmpty()) return;
  const min = box.min;
  const max = box.max;
  const height = max.y - min.y;
  if (height <= 0) return;

  const geom = new THREE.CylinderGeometry(
    BOWSTRING.radius,
    BOWSTRING.radius,
    height,
    BOWSTRING.segments,
  );
  const mat = new THREE.MeshBasicMaterial({ color: BOWSTRING.color });
  const string = new THREE.Mesh(geom, mat);
  string.name = NAIA_BOWSTRING_NAME;

  string.position.set(
    (min.x + max.x) / 2,
    (min.y + max.y) / 2,
    max.z + 0.005,
  );
  bowScene.add(string);

  const savedBowstring = (savedOffsets as { bowstring?: {
    position: number[]; rotation: number[]; scale: number;
  } | null }).bowstring;
  if (savedBowstring) {
    string.position.set(
      savedBowstring.position[0] ?? 0,
      savedBowstring.position[1] ?? 0,
      savedBowstring.position[2] ?? 0,
    );
    string.rotation.set(
      savedBowstring.rotation[0] ?? 0,
      savedBowstring.rotation[1] ?? 0,
      savedBowstring.rotation[2] ?? 0,
    );
    string.scale.setScalar(savedBowstring.scale ?? 1);
  }
}
