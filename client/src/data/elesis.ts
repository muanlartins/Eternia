// Elesis 1st class — physics + character constants.
// Values are starting points based on GC S5 feel; will be tuned by playtest.
//
// Coordinate system: Pixi default (origin top-left, +y = down).
// All speeds in pixels/second. All durations in milliseconds.
//
// Reference: Stage/PlayerElesis.lua from the Quase1Otaku 2018 pack defines these
// same fields (fWalkSpeed, fRunSpeed, fJumpYSpeed, etc.) — we re-port the schema
// but pick our own values to fit a modernized "S5 feel" rather than 1:1 S1.

export const ELESIS = {
  // Visual
  width: 32,
  height: 64,

  // Movement (px/sec)
  walkSpeed: 220,
  runSpeed: 420,
  airAcceleration: 1800, // how fast air-drift adjusts horizontal velocity
  groundFriction: 4000, // decel when no input on ground

  // Walk -> Run transition
  // Run kicks in when direction held for this long, OR on double-tap.
  walkToRunHoldMs: 180,
  doubleTapWindowMs: 250,

  // Jumping (px/sec, px/sec^2)
  jumpInitialVy: -750,
  doubleJumpInitialVy: -650,
  gravity: 2200,
  fallGravityMultiplier: 1.4, // heavier gravity past apex for snappier feel
  shortHopMultiplier: 0.5, // if jump released before apex, cut velocity
  maxFallSpeed: 1400,

  // Dash (ground)
  dashSpeed: 700,
  dashDurationMs: 200,
  dashCooldownMs: 350,

  // Air dash (only during first-jump cycle, once per cycle, diagonal via up/down hold)
  airDashSpeed: 720,
  airDashDurationMs: 200,
  airDashUpVy: -420, // when ↑ held during air dash (diagonal-up)
  airDashDownVy: 520, // when ↓ held during air dash (diagonal-down)

  // Modernization (S5-style forgiveness)
  coyoteTimeMs: 90, // can still jump for this long after leaving ground
  jumpBufferMs: 90, // remember jump press for this long if pressed in air

  // Landing
  landDurationMs: 60, // brief lock to ground when landing (no immediate re-jump)
} as const;

export type ElesisSpec = typeof ELESIS;
