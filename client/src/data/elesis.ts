export const ELESIS = {
  width: 32,
  height: 64,

  walkSpeed: 280,
  runSpeed: 360,
  airAcceleration: 1800,
  groundFriction: 4000,

  walkToRunHoldMs: 180,
  doubleTapWindowMs: 250,

  jumpInitialVy: -680,
  doubleJumpInitialVy: -620,
  gravity: 2200,
  fallGravityMultiplier: 1.4,
  shortHopMultiplier: 0.7,
  maxFallSpeed: 1400,

  dashSpeed: 700,
  dashDurationMs: 200,
  dashCooldownMs: 350,

  airDashSpeed: 500,
  airDashDurationMs: 200,

  coyoteTimeMs: 90,
  jumpBufferMs: 90,

  landDurationMs: 60,
} as const;

export type ElesisSpec = typeof ELESIS;
