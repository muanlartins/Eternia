import type { MobSpec } from './mobs.js';
import { SLIM, RACOON, INSECTIVOROUS, ARCHER, BRUTE } from './mobs.js';

export type MobType = 'slim' | 'racoon' | 'insectivorous' | 'archer' | 'brute';

export const MOB_SPECS: Record<MobType, MobSpec> = {
  slim: SLIM,
  racoon: RACOON,
  insectivorous: INSECTIVOROUS,
  archer: ARCHER,
  brute: BRUTE,
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
    name: 'Floresta dos Elfos — 2',
    spawns: [
      { type: 'slim', x: 320 },
      { type: 'archer', x: 600 },
      { type: 'slim', x: 820 },
      { type: 'archer', x: 1080 },
      { type: 'racoon', x: 1300 },
    ],
    platforms: [
      { x: 460, y: 360, w: 160, h: 12 },
      { x: 940, y: 360, w: 160, h: 12 },
    ],
  },
  {
    id: 'forest-1-3',
    name: 'Floresta Profunda',
    spawns: [
      { type: 'racoon', x: 360 },
      { type: 'brute', x: 680 },
      { type: 'archer', x: 920 },
      { type: 'brute', x: 1180 },
      { type: 'archer', x: 1420 },
    ],
    platforms: [
      { x: 540, y: 360, w: 180, h: 12 },
      { x: 1000, y: 360, w: 180, h: 12 },
    ],
  },
  {
    id: 'forest-1-4',
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
