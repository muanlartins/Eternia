export interface CharacterSpec {
  readonly id: string;
  readonly name: string;
  readonly className: string;
  readonly description: string;
  readonly available: boolean;
}

export const CHARACTERS: readonly CharacterSpec[] = [
  {
    id: 'naia',
    name: 'Naia',
    className: 'Elven Archer',
    description:
      'Arqueira élfica de cabelo verde-esmeralda. Calma, observadora, letal de longe.',
    available: true,
  },
  {
    id: 'astrid',
    name: 'Astrid',
    className: 'Knight (planned)',
    description: 'Em breve — espadachim crimson, parry + dodge, kit melee.',
    available: false,
  },
  {
    id: 'slot3',
    name: '?',
    className: 'Mage (planned)',
    description: 'Em breve — caster místico, alta dmg burst, frágil.',
    available: false,
  },
  {
    id: 'slot4',
    name: '?',
    className: 'Spell Knight (planned)',
    description: 'Em breve — espada + magia híbrida.',
    available: false,
  },
];
