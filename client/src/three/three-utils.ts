import * as THREE from 'three';

/** Build a toon ramp from N grayscale levels (each 0..255). Defaults to 3-band GC-style ramp. */
export function createToonGradient(levels: readonly number[] = [60, 180, 240]): THREE.DataTexture {
  const n = Math.max(2, levels.length);
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, Math.round(levels[i] ?? 0)));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
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
