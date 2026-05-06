export interface PlayerModifiers {
  maxHpAdd: number;
  comboDamageMul: number;
  mpRegenMul: number;
  dodgeRegenMul: number;
}

export const DEFAULT_MODIFIERS: PlayerModifiers = {
  maxHpAdd: 0,
  comboDamageMul: 1,
  mpRegenMul: 1,
  dodgeRegenMul: 1,
};

export interface BuffSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly apply: (m: PlayerModifiers) => void;
}

export const BUFFS: readonly BuffSpec[] = [
  {
    id: 'forge-of-ardor',
    name: 'Forge of Ardor',
    description: '+20% combo Z damage',
    apply: (m) => {
      m.comboDamageMul *= 1.2;
    },
  },
  {
    id: 'iron-skin',
    name: 'Iron Skin',
    description: '+15 max HP (heals on pickup)',
    apply: (m) => {
      m.maxHpAdd += 15;
    },
  },
  {
    id: 'mana-surge',
    name: 'Mana Surge',
    description: 'MP regen 2x',
    apply: (m) => {
      m.mpRegenMul *= 2;
    },
  },
  {
    id: 'quick-step',
    name: 'Quick Step',
    description: 'Dodge regen 1.5x',
    apply: (m) => {
      m.dodgeRegenMul *= 1.5;
    },
  },
  {
    id: 'sharpened-edge',
    name: 'Sharpened Edge',
    description: '+15% combo Z damage',
    apply: (m) => {
      m.comboDamageMul *= 1.15;
    },
  },
  {
    id: 'tempered-body',
    name: 'Tempered Body',
    description: '+10 max HP (heals on pickup)',
    apply: (m) => {
      m.maxHpAdd += 10;
    },
  },
];

export function pickRandomBuffs(pool: readonly BuffSpec[], count: number): readonly BuffSpec[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, count);
}
