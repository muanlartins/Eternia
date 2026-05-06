export const PlayerState = {
  Idle: 'idle',
  Walk: 'walk',
  Run: 'run',
  JumpRise: 'jump_rise',
  Fall: 'fall',
  DoubleJump: 'double_jump',
  Dash: 'dash',
  AirDash: 'air_dash',
  Land: 'land',
  Attack1: 'attack_1',
  Attack2: 'attack_2',
  Attack3: 'attack_3',
  Skill1: 'skill_1',
  Skill2: 'skill_2',
  Skill3: 'skill_3',
  DashAtk: 'dash_atk',
  JumpAtk: 'jump_atk',
  DodgeStand: 'dodge_stand',
  DodgeRoll: 'dodge_roll',
  Hurt: 'hurt',
  Dead: 'dead',
  Parry: 'parry',
  Charging: 'charging',
} as const;

export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

export type Vec2 = { x: number; y: number };

export type Facing = -1 | 1;

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ActiveHit {
  bbox: AABB;
  damage: number;
  knockback: number;
  attackId: number;
  facing: Facing;
  isCombo: boolean;
}

export const STATE_COLOR: Record<PlayerState, number> = {
  [PlayerState.Idle]: 0x4a8eff,
  [PlayerState.Walk]: 0x4ade80,
  [PlayerState.Run]: 0xfacc15,
  [PlayerState.JumpRise]: 0x22d3ee,
  [PlayerState.Fall]: 0xa78bfa,
  [PlayerState.DoubleJump]: 0xec4899,
  [PlayerState.Dash]: 0xef4444,
  [PlayerState.AirDash]: 0xfb923c,
  [PlayerState.Land]: 0xffffff,
  [PlayerState.Attack1]: 0xff8800,
  [PlayerState.Attack2]: 0xff5522,
  [PlayerState.Attack3]: 0xdd0044,
  [PlayerState.Skill1]: 0x4488ff,
  [PlayerState.Skill2]: 0x66bbff,
  [PlayerState.Skill3]: 0x88ddff,
  [PlayerState.DashAtk]: 0xff6633,
  [PlayerState.JumpAtk]: 0xffaa44,
  [PlayerState.DodgeStand]: 0x88eecc,
  [PlayerState.DodgeRoll]: 0x44bb88,
  [PlayerState.Hurt]: 0xff4488,
  [PlayerState.Dead]: 0x666666,
  [PlayerState.Parry]: 0xfff066,
  [PlayerState.Charging]: 0xfff8aa,
};
