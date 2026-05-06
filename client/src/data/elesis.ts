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
    { duration: 280, active: [80, 180], nextWindow: [120, 280], damage: 8, knockback: 180, vxPush: 90, hitbox: { cx: 28, y: 18, w: 36, h: 28 } },
    { duration: 320, active: [100, 220], nextWindow: [160, 320], damage: 12, knockback: 220, vxPush: 130, hitbox: { cx: 30, y: 14, w: 42, h: 34 } },
    { duration: 420, active: [140, 280], nextWindow: null, damage: 22, knockback: 420, vxPush: 240, hitbox: { cx: 32, y: 8, w: 52, h: 44 } },
  ],

  maxMp: 100,
  mpRegenPerSec: 6,
  mpPerHit: 4,

  dashAtk: {
    duration: 380,
    vxInitial: 700,
    active: [60, 220],
    damage: 18,
    knockback: 240,
    hitbox: { cx: 38, y: 14, w: 64, h: 36 },
  },

  jumpAtk: {
    duration: 320,
    active: [60, 220],
    damage: 14,
    knockback: 200,
    hitbox: { cx: 30, y: 22, w: 50, h: 50 },
  },

  dodgeStandDurationMs: 400,
  dodgeRollSpeed: 500,
  dodgeRollDurationMs: 280,
  dodgeBarMax: 5,
  dodgeBarRegenPerSec: 0.8,
  dodgeStandCost: 1,
  dodgeRollCost: 1,

  maxHp: 100,
  hurtStunMs: 380,
  deathRespawnMs: 1500,

  parryDurationMs: 360,
  parryActiveStartMs: 30,
  parryActiveEndMs: 180,
  parryCooldownMs: 600,

  skills: {
    s1: {
      duration: 480,
      mpCost: 25,
      hits: [
        { active: [140, 280], damage: 32, knockback: 280, hitbox: { cx: 36, y: 10, w: 60, h: 48 } },
      ],
    },
    s2: {
      duration: 750,
      mpCost: 50,
      hits: [
        { active: [140, 220], damage: 12, knockback: 130, hitbox: { cx: 30, y: 14, w: 46, h: 36 } },
        { active: [380, 460], damage: 16, knockback: 170, hitbox: { cx: 32, y: 12, w: 50, h: 40 } },
        { active: [580, 680], damage: 24, knockback: 340, hitbox: { cx: 36, y: 8, w: 58, h: 48 } },
      ],
    },
    s3: {
      duration: 1000,
      mpCost: 80,
      hits: [
        { active: [280, 600], damage: 60, knockback: 480, hitbox: { cx: 0, y: -10, w: 160, h: 100 } },
      ],
    },
  },
} as const;

export type ElesisSpec = typeof ELESIS;
