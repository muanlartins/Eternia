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
  readonly width: number;
  readonly spawns: readonly MobSpawn[];
  readonly platforms?: readonly PlatformSpec[];
}

export const STAGES: readonly StageSpec[] = [
  {
    id: 'forest-1-1',
    name: 'Floresta dos Elfos — 1',
    width: 1280,
    spawns: [
      { type: 'slim', x: 280 },
      { type: 'slim', x: 480 },
      { type: 'racoon', x: 700 },
      { type: 'slim', x: 920 },
      { type: 'racoon', x: 1120 },
    ],
    platforms: [
      { x: 240, y: 380, w: 180, h: 12 },
      { x: 580, y: 290, w: 220, h: 12 },
      { x: 880, y: 380, w: 180, h: 12 },
    ],
  },
  {
    id: 'forest-1-2',
    name: 'Floresta dos Elfos — 2',
    width: 1360,
    spawns: [
      { type: 'slim', x: 280 },
      { type: 'archer', x: 540 },
      { type: 'slim', x: 760 },
      { type: 'archer', x: 1000 },
      { type: 'racoon', x: 1180 },
    ],
    platforms: [
      { x: 200, y: 360, w: 200, h: 12 },
      { x: 560, y: 280, w: 220, h: 12 },
      { x: 920, y: 360, w: 200, h: 12 },
    ],
  },
  {
    id: 'forest-1-3',
    name: 'Floresta Profunda',
    width: 1440,
    spawns: [
      { type: 'racoon', x: 320 },
      { type: 'brute', x: 600 },
      { type: 'archer', x: 860 },
      { type: 'brute', x: 1100 },
      { type: 'archer', x: 1320 },
    ],
    platforms: [
      { x: 220, y: 380, w: 180, h: 12 },
      { x: 480, y: 290, w: 200, h: 12 },
      { x: 800, y: 350, w: 200, h: 12 },
      { x: 1140, y: 280, w: 200, h: 12 },
    ],
  },
  {
    id: 'forest-1-4',
    name: 'Floresta dos Elfos — Boss',
    width: 1280,
    spawns: [
      { type: 'racoon', x: 360 },
      { type: 'racoon', x: 620 },
      { type: 'insectivorous', x: 1020 },
    ],
    platforms: [
      { x: 240, y: 380, w: 200, h: 12 },
      { x: 540, y: 280, w: 240, h: 12 },
      { x: 900, y: 360, w: 220, h: 12 },
    ],
  },
];
