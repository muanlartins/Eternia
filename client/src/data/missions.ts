export interface MissionSpec {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly bossName: string;
  readonly stageIds: readonly string[];
  readonly available: boolean;
}

export const MISSIONS: readonly MissionSpec[] = [
  {
    id: 'forest',
    name: 'Floresta dos Elfos',
    subtitle: '4 stages',
    description: 'Bioma inicial — slims, racoons, archers, brutes. Boss: Insectivorous.',
    bossName: 'Insectivorous',
    stageIds: ['forest-1-1', 'forest-1-2', 'forest-1-3', 'forest-1-4'],
    available: true,
  },
  {
    id: 'swamp',
    name: 'Pântano dos Esquecidos',
    subtitle: '2 stages',
    description: 'Bioma sombrio — frogs, wraiths, wisps. Boss: Drowned King.',
    bossName: 'Drowned King',
    stageIds: ['swamp-1-1', 'swamp-1-2'],
    available: true,
  },
];

export function findMission(id: string): MissionSpec | null {
  return MISSIONS.find((m) => m.id === id) ?? null;
}
