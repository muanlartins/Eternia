import type { PlayerModifiers } from './buffs.js';

export interface RunModifier {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly apply: (m: PlayerModifiers) => void;
}

export const MODIFIERS: readonly RunModifier[] = [
  {
    id: 'glass-cannon',
    name: 'Glass Cannon',
    description: '+30% combo dmg, -25 max HP',
    apply: (m) => {
      m.comboDamageMul *= 1.3;
      m.maxHpAdd -= 25;
    },
  },
  {
    id: 'tank',
    name: 'Tank',
    description: '+50 max HP, -15% combo dmg',
    apply: (m) => {
      m.maxHpAdd += 50;
      m.comboDamageMul *= 0.85;
    },
  },
  {
    id: 'caster',
    name: 'Caster',
    description: 'MP regen ×2.5, -10 max HP',
    apply: (m) => {
      m.mpRegenMul *= 2.5;
      m.maxHpAdd -= 10;
    },
  },
  {
    id: 'quick-step',
    name: 'Quick Step',
    description: 'Dodge regen ×1.7',
    apply: (m) => {
      m.dodgeRegenMul *= 1.7;
    },
  },
  {
    id: 'vampiric-hunter',
    name: 'Vampiric Hunter',
    description: 'Combo lifesteal +18%, -15 max HP',
    apply: (m) => {
      m.comboLifestealPct += 0.18;
      m.maxHpAdd -= 15;
    },
  },
  {
    id: 'stoic',
    name: 'Stoic',
    description: 'HP regen +1.5/s, -10% combo dmg',
    apply: (m) => {
      m.hpRegenPerSec += 1.5;
      m.comboDamageMul *= 0.9;
    },
  },
];

export function pickRandomModifiers(count: number): readonly RunModifier[] {
  const shuffled = [...MODIFIERS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, count);
}
