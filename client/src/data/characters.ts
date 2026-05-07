export interface CharacterSpec {
  readonly id: string;
  readonly name: string;
  readonly className: string;
  readonly description: string;
  readonly available: boolean;
}

export const CHARACTERS: readonly CharacterSpec[] = [
  {
    id: 'astrid',
    name: 'Astrid',
    className: 'Knight (1ª classe)',
    description:
      'Espadachim crimson, espada asiática, confiante e impulsiva — combo Z, 3 skills, parry janelado, dodge roll.',
    available: true,
  },
  {
    id: 'naia',
    name: 'Naia',
    className: 'Elven Archer (planned)',
    description:
      'Em breve — arqueira élfica de cabelo verde-esmeralda, sábia e calma, atira de longe com arco curto.',
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
