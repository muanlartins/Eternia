import * as THREE from 'three';

export interface BoneRotation {
  bone: string | RegExp;
  euler: [number, number, number];
  /** Local position delta from bind pose (0,0,0 means no offset). */
  pos?: [number, number, number];
  /** Local scale multiplier (1,1,1 means bind). */
  scl?: [number, number, number];
}

export type Easing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'hold';

export interface PoseExtras {
  arrowVisible?: boolean;
  bowMidPull?: [number, number, number];
}

export interface Pose {
  time: number;
  bones: BoneRotation[];
  extras?: PoseExtras;
  /** Easing from THIS keyframe to the NEXT. Default 'linear'. */
  ease?: Easing;
}

export interface AnimMarker {
  time: number;
  name: string;
}

export type HitboxKind = 'light' | 'heavy' | 'special';

export interface Hitbox {
  id: string;
  attach: string;
  offset: [number, number, number];
  size: [number, number, number];
  startTime: number;
  endTime: number;
  kind?: HitboxKind;
  damage?: number;
}

export interface ProceduralAnimSpec {
  name: string;
  duration: number;
  loop: boolean;
  poses: Pose[];
  markers?: AnimMarker[];
  hitboxes?: Hitbox[];
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

const EASE_FNS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out': (t) =>
    t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
  hold: () => 0,
};

const EASING_SUBDIVISIONS = 10;

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

  const bindPositions = new Map<THREE.Bone, THREE.Vector3>();
  for (const bone of allBones) {
    bindPositions.set(bone, bone.position.clone());
  }

  const tracks: THREE.KeyframeTrack[] = [];

  for (const bone of allBones) {
    const bindQ = bindQuaternions?.get(bone);
    const bindP = bindPositions.get(bone)!;
    let hasPos = false;
    let hasScl = false;

    interface Sample {
      t: number;
      q: THREE.Quaternion;
      p: [number, number, number];
      s: [number, number, number];
      easeOut: Easing;
    }
    const samples: Sample[] = [];
    for (const pose of spec.poses) {
      const br = pose.bones.find(
        (b) => findBone(skeleton, b.bone) === bone,
      );
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
      const posDelta = br?.pos ?? [0, 0, 0];
      if (br?.pos) hasPos = true;
      if (br?.scl) hasScl = true;
      const p: [number, number, number] = [
        bindP.x + posDelta[0],
        bindP.y + posDelta[1],
        bindP.z + posDelta[2],
      ];
      const s: [number, number, number] = br?.scl
        ? [br.scl[0], br.scl[1], br.scl[2]]
        : [1, 1, 1];
      samples.push({
        t: pose.time,
        q: finalQ,
        p,
        s,
        easeOut: pose.ease ?? 'linear',
      });
    }

    const qTimes: number[] = [];
    const qVals: number[] = [];
    const pTimes: number[] = [];
    const pVals: number[] = [];
    const sTimes: number[] = [];
    const sVals: number[] = [];

    const pushQ = (t: number, q: THREE.Quaternion) => {
      qTimes.push(t);
      qVals.push(q.x, q.y, q.z, q.w);
    };
    const pushP = (t: number, p: [number, number, number]) => {
      pTimes.push(t);
      pVals.push(p[0], p[1], p[2]);
    };
    const pushS = (t: number, s: [number, number, number]) => {
      sTimes.push(t);
      sVals.push(s[0], s[1], s[2]);
    };

    if (samples.length === 1) {
      const sv = samples[0]!;
      pushQ(sv.t, sv.q);
      if (hasPos) pushP(sv.t, sv.p);
      if (hasScl) pushS(sv.t, sv.s);
    } else {
      for (let i = 0; i < samples.length - 1; i++) {
        const a = samples[i]!;
        const b = samples[i + 1]!;
        if (a.easeOut === 'linear') {
          pushQ(a.t, a.q);
          if (hasPos) pushP(a.t, a.p);
          if (hasScl) pushS(a.t, a.s);
        } else if (a.easeOut === 'hold') {
          pushQ(a.t, a.q);
          if (hasPos) pushP(a.t, a.p);
          if (hasScl) pushS(a.t, a.s);
          const dt = b.t - a.t;
          if (dt > 0.0001) {
            const tHold = b.t - 0.001;
            pushQ(tHold, a.q);
            if (hasPos) pushP(tHold, a.p);
            if (hasScl) pushS(tHold, a.s);
          }
        } else {
          const ease = EASE_FNS[a.easeOut];
          const dt = b.t - a.t;
          const N = EASING_SUBDIVISIONS;
          for (let k = 0; k < N; k++) {
            const u = k / N;
            const eu = ease(u);
            const t = a.t + dt * u;
            const q = a.q.clone().slerp(b.q, eu);
            pushQ(t, q);
            if (hasPos) {
              pushP(t, [
                a.p[0] + (b.p[0] - a.p[0]) * eu,
                a.p[1] + (b.p[1] - a.p[1]) * eu,
                a.p[2] + (b.p[2] - a.p[2]) * eu,
              ]);
            }
            if (hasScl) {
              pushS(t, [
                a.s[0] + (b.s[0] - a.s[0]) * eu,
                a.s[1] + (b.s[1] - a.s[1]) * eu,
                a.s[2] + (b.s[2] - a.s[2]) * eu,
              ]);
            }
          }
        }
      }
      const last = samples[samples.length - 1]!;
      pushQ(last.t, last.q);
      if (hasPos) pushP(last.t, last.p);
      if (hasScl) pushS(last.t, last.s);
    }

    tracks.push(
      new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, qTimes, qVals),
    );
    if (hasPos) {
      tracks.push(
        new THREE.VectorKeyframeTrack(`${bone.name}.position`, pTimes, pVals),
      );
    }
    if (hasScl) {
      tracks.push(
        new THREE.VectorKeyframeTrack(`${bone.name}.scale`, sTimes, sVals),
      );
    }
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

// Default idle: spine + head sway only. Bone-axis conventions differ across rigs (Tripo Z
// dropped arms; Mixamo Z sweeps them horizontally), so trying to "lower arms" via the same
// euler triple on both would misfire. To get arms-down + breath, the user should capture an
// Idle.json in the editor — it'll be auto-picked up by `findNaiaAnim('Idle')` and override
// this fallback.
export const IDLE_NAIA: ProceduralAnimSpec = {
  name: 'proc-idle-naia',
  duration: 3.0,
  loop: true,
  poses: [
    {
      time: 0,
      bones: [
        { bone: /spine0?1$/i, euler: [-1.5, 0, 0] },
        { bone: /spine0?2$/i, euler: [-0.8, 0, 0] },
        { bone: /head$/i, euler: [-0.5, 0, 0] },
      ],
    },
    {
      time: 1.5,
      bones: [
        { bone: /spine0?1$/i, euler: [1.5, 0, 0] },
        { bone: /spine0?2$/i, euler: [0.8, 0, 0] },
        { bone: /head$/i, euler: [0.5, 0, 0] },
      ],
    },
    {
      time: 3.0,
      bones: [
        { bone: /spine0?1$/i, euler: [-1.5, 0, 0] },
        { bone: /spine0?2$/i, euler: [-0.8, 0, 0] },
        { bone: /head$/i, euler: [-0.5, 0, 0] },
      ],
    },
  ],
};

export const PROCEDURAL_ANIMS: readonly ProceduralAnimSpec[] = [
  IDLE_BREATH,
  IDLE_NAIA,
];
