export type BuffRarity = 'common' | 'rare';

export interface PlayerModifiers {
  maxHpAdd: number;
  comboDamageMul: number;
  mpRegenMul: number;
  dodgeRegenMul: number;
  hpRegenPerSec: number;
  comboLifestealPct: number;
  parryBuffDurationMul: number;
}

export const DEFAULT_MODIFIERS: PlayerModifiers = {
  maxHpAdd: 0,
  comboDamageMul: 1,
  mpRegenMul: 1,
  dodgeRegenMul: 1,
  hpRegenPerSec: 0,
  comboLifestealPct: 0,
  parryBuffDurationMul: 1,
};

export interface BuffSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rarity: BuffRarity;
  readonly apply: (m: PlayerModifiers) => void;
}

export const BUFFS: readonly BuffSpec[] = [
  {
    id: 'forge-of-ardor',
    name: 'Forge of Ardor',
    description: '+20% combo Z damage',
    rarity: 'common',
    apply: (m) => {
      m.comboDamageMul *= 1.2;
    },
  },
  {
    id: 'iron-skin',
    name: 'Iron Skin',
    description: '+15 max HP (heals on pickup)',
    rarity: 'common',
    apply: (m) => {
      m.maxHpAdd += 15;
    },
  },
  {
    id: 'mana-surge',
    name: 'Mana Surge',
    description: 'MP regen 2x',
    rarity: 'common',
    apply: (m) => {
      m.mpRegenMul *= 2;
    },
  },
  {
    id: 'quick-step',
    name: 'Quick Step',
    description: 'Dodge regen 1.5x',
    rarity: 'common',
    apply: (m) => {
      m.dodgeRegenMul *= 1.5;
    },
  },
  {
    id: 'sharpened-edge',
    name: 'Sharpened Edge',
    description: '+15% combo Z damage',
    rarity: 'common',
    apply: (m) => {
      m.comboDamageMul *= 1.15;
    },
  },
  {
    id: 'tempered-body',
    name: 'Tempered Body',
    description: '+10 max HP (heals on pickup)',
    rarity: 'common',
    apply: (m) => {
      m.maxHpAdd += 10;
    },
  },
  {
    id: 'endurance-breath',
    name: 'Endurance Breath',
    description: 'HP regen 1/sec passive',
    rarity: 'common',
    apply: (m) => {
      m.hpRegenPerSec += 1;
    },
  },
  {
    id: 'vampiric-edge',
    name: 'Vampiric Edge',
    description: 'Combo Z hits heal 12% of damage',
    rarity: 'rare',
    apply: (m) => {
      m.comboLifestealPct += 0.12;
    },
  },
  {
    id: 'time-hold',
    name: 'Time Hold',
    description: 'Parry buff lasts 60% longer',
    rarity: 'rare',
    apply: (m) => {
      m.parryBuffDurationMul *= 1.6;
    },
  },
];

const RARE_PICK_CHANCE = 0.25;

export function pickRandomBuffs(pool: readonly BuffSpec[], count: number): readonly BuffSpec[] {
  const result: BuffSpec[] = [];
  const used = new Set<string>();

  while (result.length < count) {
    const wantRare = Math.random() < RARE_PICK_CHANCE;
    const targetRarity: BuffRarity = wantRare ? 'rare' : 'common';
    const candidates = pool.filter((b) => !used.has(b.id) && b.rarity === targetRarity);
    const fallback = pool.filter((b) => !used.has(b.id));
    const list = candidates.length > 0 ? candidates : fallback;
    if (list.length === 0) break;
    const pick = list[Math.floor(Math.random() * list.length)]!;
    used.add(pick.id);
    result.push(pick);
  }

  return result;
}
