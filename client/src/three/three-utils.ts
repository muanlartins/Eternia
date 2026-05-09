import * as THREE from 'three';

export function createToonGradient(): THREE.DataTexture {
  const data = new Uint8Array([
    60, 60, 60, 255,
    180, 180, 180, 255,
    240, 240, 240, 255,
  ]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function makeToon(
  src: THREE.Material,
  gradientMap: THREE.DataTexture,
): THREE.MeshToonMaterial {
  const std = src as THREE.MeshStandardMaterial;
  return new THREE.MeshToonMaterial({
    map: std.map ?? null,
    color: std.color ?? new THREE.Color(0xffffff),
    gradientMap,
    transparent: std.transparent ?? false,
    opacity: std.opacity ?? 1,
  });
}

export function applyToonToTree(
  root: THREE.Object3D,
  cache: Map<THREE.Mesh, THREE.Material | THREE.Material[]>,
  gradientMap: THREE.DataTexture,
) {
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    if (!cache.has(m)) cache.set(m, m.material);
    const orig = cache.get(m)!;
    if (Array.isArray(orig)) m.material = orig.map((s) => makeToon(s, gradientMap));
    else m.material = makeToon(orig, gradientMap);
  });
}
