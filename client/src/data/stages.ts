import type { MobSpec } from './mobs.js';
import { SLIM, RACOON, INSECTIVOROUS } from './mobs.js';

export type MobType = 'slim' | 'racoon' | 'insectivorous';

export const MOB_SPECS: Record<MobType, MobSpec> = {
  slim: SLIM,
  racoon: RACOON,
  insectivorous: INSECTIVOROUS,
};

export interface MobSpawn {
  readonly type: MobType;
  readonly x: number;
}

export interface PlatformSpec {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface StageSpec {
  readonly id: string;
  readonly name: string;
  readonly spawns: readonly MobSpawn[];
  readonly platforms?: readonly PlatformSpec[];
}

export const STAGES: readonly StageSpec[] = [
  {
    id: 'forest-1-1',
    name: 'Floresta dos Elfos — 1',
    spawns: [
      { type: 'slim', x: 320 },
      { type: 'slim', x: 540 },
      { type: 'racoon', x: 780 },
      { type: 'slim', x: 1000 },
      { type: 'racoon', x: 1240 },
    ],
  },
  {
    id: 'forest-1-2',
    name: 'Floresta dos Elfos — Boss',
    spawns: [
      { type: 'racoon', x: 380 },
      { type: 'racoon', x: 640 },
      { type: 'insectivorous', x: 1080 },
    ],
    platforms: [
      { x: 280, y: 380, w: 200, h: 12 },
      { x: 700, y: 300, w: 220, h: 12 },
      { x: 1140, y: 380, w: 200, h: 12 },
    ],
  },
];
