export interface CharacterSpec {
  readonly id: string;
  readonly name: string;
  readonly className: string;
  readonly description: string;
  readonly available: boolean;
}

export const CHARACTERS: readonly CharacterSpec[] = [
  {
    id: 'elesis',
    name: 'Elesis',
    className: 'Knight (1st class)',
    description:
      'Espadachim equilibrada — combo Z, 3 skills, parry janelado, dodge roll.',
    available: true,
  },
  {
    id: 'lire',
    name: 'Lire',
    className: 'Elven Archer (planned)',
    description: 'Em breve — atiradora à distância com ataques ricocheteantes.',
    available: false,
  },
  {
    id: 'arme',
    name: 'Arme',
    className: 'Hechicera (planned)',
    description: 'Em breve — bruxa close-range com teleporte.',
    available: false,
  },
  {
    id: 'ronan',
    name: 'Ronan',
    className: 'Spell Knight (planned)',
    description: 'Em breve — espada + magia híbrida.',
    available: false,
  },
];
