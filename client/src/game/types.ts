// Shared game-side types. Player state machine + helpers.

export const PlayerState = {
  Idle: 'idle',
  Walk: 'walk',
  Run: 'run',
  JumpRise: 'jump_rise', // first jump rising — has air drift, can air dash
  Fall: 'fall', // falling from first jump — same powers
  DoubleJump: 'double_jump', // second jump — horizontal LOCKED, no dash
  Dash: 'dash', // ground dash
  AirDash: 'air_dash', // air dash (one per first-jump cycle)
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
  [PlayerState.AirDash]: 0xfb923c,
  [PlayerState.Land]: 0xffffff,
};
