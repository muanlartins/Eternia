export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultySpec {
  readonly id: Difficulty;
  readonly label: string;
  readonly hpMul: number;
  readonly dmgMul: number;
  readonly lives: number;
  readonly description: string;
}

export const DIFFICULTIES: readonly DifficultySpec[] = [
  {
    id: 'easy',
    label: 'Easy',
    hpMul: 0.7,
    dmgMul: 0.7,
    lives: 4,
    description: 'Mob HP ×0.7, dmg ×0.7, 4 lives.',
  },
  {
    id: 'normal',
    label: 'Normal',
    hpMul: 1.0,
    dmgMul: 1.0,
    lives: 3,
    description: 'Standard challenge — 3 lives.',
  },
  {
    id: 'hard',
    label: 'Hard',
    hpMul: 1.4,
    dmgMul: 1.3,
    lives: 2,
    description: 'Mob HP ×1.4, dmg ×1.3, 2 lives.',
  },
];

const STORAGE_KEY = 'eternia.difficulty.v1';

export function loadDifficulty(): Difficulty {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') return raw;
  } catch {}
  return 'normal';
}

export function saveDifficulty(d: Difficulty) {
  try {
    localStorage.setItem(STORAGE_KEY, d);
  } catch {}
}

export function findDifficulty(id: Difficulty): DifficultySpec {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1]!;
}
