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

export interface StageSpec {
  readonly id: string;
  readonly name: string;
  readonly spawns: readonly MobSpawn[];
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
  },
];
