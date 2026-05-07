import type { MobSpec } from './mobs.js';
import {
  SLIM,
  RACOON,
  INSECTIVOROUS,
  ARCHER,
  BRUTE,
  WISP,
  BOG_FROG,
  MIRE_WRAITH,
  DROWNED_KING,
} from './mobs.js';

export type MobType =
  | 'slim'
  | 'racoon'
  | 'insectivorous'
  | 'archer'
  | 'brute'
  | 'wisp'
  | 'bog-frog'
  | 'mire-wraith'
  | 'drowned-king';

export const MOB_SPECS: Record<MobType, MobSpec> = {
  slim: SLIM,
  racoon: RACOON,
  insectivorous: INSECTIVOROUS,
  archer: ARCHER,
  brute: BRUTE,
  wisp: WISP,
  'bog-frog': BOG_FROG,
  'mire-wraith': MIRE_WRAITH,
  'drowned-king': DROWNED_KING,
};

export interface MobSpawn {
  readonly type: MobType;
  readonly x: number;
  readonly y?: number;
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
      { type: 'racoon', x: 720 },
      { type: 'slim', x: 660, y: 308 },
      { type: 'racoon', x: 1080 },
    ],
    platforms: [
      { x: 240, y: 400, w: 180, h: 12 },
      { x: 580, y: 340, w: 220, h: 12 },
      { x: 880, y: 400, w: 180, h: 12 },
    ],
  },
  {
    id: 'forest-1-2',
    name: 'Floresta dos Elfos — 2',
    width: 1360,
    spawns: [
      { type: 'slim', x: 280 },
      { type: 'slim', x: 800 },
      { type: 'archer', x: 660, y: 284 },
      { type: 'archer', x: 1020 },
      { type: 'racoon', x: 1200 },
      { type: 'wisp', x: 880 },
    ],
    platforms: [
      { x: 200, y: 400, w: 200, h: 12 },
      { x: 580, y: 340, w: 220, h: 12 },
      { x: 940, y: 400, w: 200, h: 12 },
    ],
  },
  {
    id: 'forest-1-3',
    name: 'Floresta Profunda',
    width: 1440,
    spawns: [
      { type: 'racoon', x: 320 },
      { type: 'brute', x: 620 },
      { type: 'archer', x: 880 },
      { type: 'brute', x: 1140 },
      { type: 'archer', x: 1240, y: 244 },
      { type: 'wisp', x: 540 },
      { type: 'wisp', x: 1280 },
    ],
    platforms: [
      { x: 220, y: 400, w: 180, h: 12 },
      { x: 480, y: 340, w: 200, h: 12 },
      { x: 820, y: 360, w: 200, h: 12 },
      { x: 1180, y: 300, w: 200, h: 12 },
    ],
  },
  {
    id: 'forest-1-4',
    name: 'Floresta dos Elfos — Mid Boss',
    width: 1280,
    spawns: [
      { type: 'racoon', x: 360 },
      { type: 'racoon', x: 620 },
      { type: 'insectivorous', x: 1000 },
    ],
    platforms: [
      { x: 240, y: 400, w: 200, h: 12 },
      { x: 540, y: 340, w: 240, h: 12 },
      { x: 900, y: 400, w: 220, h: 12 },
    ],
  },
  {
    id: 'swamp-1-1',
    name: 'Pântano dos Esquecidos',
    width: 1400,
    spawns: [
      { type: 'mire-wraith', x: 280 },
      { type: 'bog-frog', x: 540 },
      { type: 'wisp', x: 700 },
      { type: 'mire-wraith', x: 980 },
      { type: 'bog-frog', x: 1240 },
    ],
    platforms: [
      { x: 220, y: 400, w: 200, h: 12 },
      { x: 580, y: 340, w: 220, h: 12 },
      { x: 940, y: 380, w: 200, h: 12 },
    ],
  },
  {
    id: 'swamp-1-2',
    name: 'Antro do Rei Afogado',
    width: 1320,
    spawns: [
      { type: 'mire-wraith', x: 360 },
      { type: 'bog-frog', x: 640 },
      { type: 'drowned-king', x: 1040 },
    ],
    platforms: [
      { x: 240, y: 400, w: 200, h: 12 },
      { x: 540, y: 340, w: 240, h: 12 },
      { x: 900, y: 400, w: 220, h: 12 },
    ],
  },
];
