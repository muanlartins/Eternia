export const ELESIS = {
  width: 32,
  height: 64,

  walkSpeed: 270,
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

  airDashSpeed: 630,
  airDashDurationMs: 200,
  airDashDropVy: 520,
  airDashMinHeight: 20,
  airDashBufferMs: 200,

  coyoteTimeMs: 90,
  jumpBufferMs: 90,

  landDurationMs: 60,

  comboZ: [
    { duration: 280, active: [80, 180], nextWindow: [120, 280], hitbox: { cx: 28, y: 18, w: 36, h: 28 } },
    { duration: 320, active: [100, 220], nextWindow: [160, 320], hitbox: { cx: 30, y: 14, w: 42, h: 34 } },
    { duration: 420, active: [140, 280], nextWindow: null, hitbox: { cx: 32, y: 8, w: 52, h: 44 } },
  ],
} as const;

export type ElesisSpec = typeof ELESIS;
