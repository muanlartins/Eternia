// Shared game-side types. Player state machine + helpers.

export const PlayerState = {
  Idle: 'idle',
  Walk: 'walk',
  Run: 'run',
  JumpRise: 'jump_rise',
  Fall: 'fall',
  DoubleJump: 'double_jump',
  Dash: 'dash',
  Land: 'land',
} as const;

export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

export type Vec2 = { x: number; y: number };

export type Facing = -1 | 1;

// Visual color per state — used during Phase 1 (no sprites yet).
export const STATE_COLOR: Record<PlayerState, number> = {
  [PlayerState.Idle]: 0x4a8eff,
  [PlayerState.Walk]: 0x4ade80,
  [PlayerState.Run]: 0xfacc15,
  [PlayerState.JumpRise]: 0x22d3ee,
  [PlayerState.Fall]: 0xa78bfa,
  [PlayerState.DoubleJump]: 0xec4899,
  [PlayerState.Dash]: 0xef4444,
  [PlayerState.Land]: 0xffffff,
};
