import * as THREE from 'three';

export interface BoneRotation {
  bone: string | RegExp;
  euler: [number, number, number];
}

export interface Pose {
  time: number;
  bones: BoneRotation[];
}

export interface ProceduralAnimSpec {
  name: string;
  duration: number;
  loop: boolean;
  poses: Pose[];
}

export function findBone(
  skeleton: THREE.Skeleton,
  pattern: string | RegExp,
): THREE.Bone | null {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  for (const b of skeleton.bones) {
    if (re.test(b.name)) return b;
  }
  return null;
}

export function buildProceduralClip(
  spec: ProceduralAnimSpec,
  skeleton: THREE.Skeleton,
  bindQuaternions?: ReadonlyMap<THREE.Bone, THREE.Quaternion>,
): THREE.AnimationClip | null {
  const allBones = new Set<THREE.Bone>();
  for (const pose of spec.poses) {
    for (const br of pose.bones) {
      const bone = findBone(skeleton, br.bone);
      if (bone) allBones.add(bone);
    }
  }
  if (allBones.size === 0) return null;

  const tracks: THREE.KeyframeTrack[] = [];
  for (const bone of allBones) {
    const times: number[] = [];
    const quats: number[] = [];
    const bindQ = bindQuaternions?.get(bone);
    for (const pose of spec.poses) {
      const br = pose.bones.find((b) => findBone(skeleton, b.bone) === bone);
      const eulerDeg = br?.euler ?? [0, 0, 0];
      const deltaQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(eulerDeg[0]),
          THREE.MathUtils.degToRad(eulerDeg[1]),
          THREE.MathUtils.degToRad(eulerDeg[2]),
          'XYZ',
        ),
      );
      const finalQ = bindQ ? bindQ.clone().multiply(deltaQ) : deltaQ;
      times.push(pose.time);
      quats.push(finalQ.x, finalQ.y, finalQ.z, finalQ.w);
    }
    tracks.push(
      new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, quats),
    );
  }
  if (tracks.length === 0) return null;
  return new THREE.AnimationClip(spec.name, spec.duration, tracks);
}

export const IDLE_BREATH: ProceduralAnimSpec = {
  name: 'proc-idle-breath',
  duration: 3.0,
  loop: true,
  poses: [
    {
      time: 0,
      bones: [
        { bone: /spine1$/i, euler: [-1.5, 0, 0] },
        { bone: /spine2$/i, euler: [-0.8, 0, 0] },
        { bone: /head$/i, euler: [-0.5, 0, 0] },
      ],
    },
    {
      time: 1.5,
      bones: [
        { bone: /spine1$/i, euler: [1.5, 0, 0] },
        { bone: /spine2$/i, euler: [0.8, 0, 0] },
        { bone: /head$/i, euler: [0.5, 0, 0] },
      ],
    },
    {
      time: 3.0,
      bones: [
        { bone: /spine1$/i, euler: [-1.5, 0, 0] },
        { bone: /spine2$/i, euler: [-0.8, 0, 0] },
        { bone: /head$/i, euler: [-0.5, 0, 0] },
      ],
    },
  ],
};

export const IDLE_NAIA: ProceduralAnimSpec = {
  name: 'proc-idle-naia',
  duration: 3.0,
  loop: true,
  poses: [
    {
      time: 0,
      bones: [
        { bone: /spine01$/i, euler: [-1.5, 0, 0] },
        { bone: /spine02$/i, euler: [-0.8, 0, 0] },
        { bone: /head$/i, euler: [-0.5, 0, 0] },
        { bone: /l_upperarm$/i, euler: [0, 0, -75] },
        { bone: /l_forearm$/i, euler: [0, 0, -8] },
        { bone: /r_upperarm$/i, euler: [0, 0, 75] },
        { bone: /r_forearm$/i, euler: [0, 0, 8] },
      ],
    },
    {
      time: 1.5,
      bones: [
        { bone: /spine01$/i, euler: [1.5, 0, 0] },
        { bone: /spine02$/i, euler: [0.8, 0, 0] },
        { bone: /head$/i, euler: [0.5, 0, 0] },
        { bone: /l_upperarm$/i, euler: [0, 0, -75] },
        { bone: /l_forearm$/i, euler: [0, 0, -8] },
        { bone: /r_upperarm$/i, euler: [0, 0, 75] },
        { bone: /r_forearm$/i, euler: [0, 0, 8] },
      ],
    },
    {
      time: 3.0,
      bones: [
        { bone: /spine01$/i, euler: [-1.5, 0, 0] },
        { bone: /spine02$/i, euler: [-0.8, 0, 0] },
        { bone: /head$/i, euler: [-0.5, 0, 0] },
        { bone: /l_upperarm$/i, euler: [0, 0, -75] },
        { bone: /l_forearm$/i, euler: [0, 0, -8] },
        { bone: /r_upperarm$/i, euler: [0, 0, 75] },
        { bone: /r_forearm$/i, euler: [0, 0, 8] },
      ],
    },
  ],
};

export const PROCEDURAL_ANIMS: readonly ProceduralAnimSpec[] = [
  IDLE_BREATH,
  IDLE_NAIA,
];
