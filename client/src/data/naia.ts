import { ASTRID } from './astrid.js';

export const NAIA = {
  kind: 'archer' as const,

  width: 32,
  height: 64,

  walkSpeed: 270,
  runSpeed: 360,
  airAcceleration: 1800,
  groundFriction: 4000,

  walkToRunHoldMs: 180,
  doubleTapWindowMs: 250,

  maxJumps: 1,
  jumpInitialVy: -735,
  doubleJumpInitialVy: -660,
  gravity: 2200,
  fallGravityMultiplier: 1.4,
  shortHopMultiplier: 1,
  maxFallSpeed: 1400,

  dashSpeed: 700,
  dashDurationMs: 200,
  dashCooldownMs: 350,

  airDashSpeed: 630,
  airDashDurationMs: 200,
  airDashDropVy: 520,
  airDashMinHeight: 20,
  airDashBufferMs: 200,
  hasAirDash: true,

  coyoteTimeMs: 90,
  jumpBufferMs: 90,
  skillBufferMs: 400,
  chargeMinHoldMs: 250,
  counterHurtMs: 0,

  landDurationMs: 60,

  comboZ: [
    {
      duration: 260,
      active: [80, 100],
      nextWindow: [110, 260],
      damage: 12,
      knockback: 80,
      vxPush: 0,
      hitbox: { cx: 28, y: 26, w: 12, h: 4 },
    },
    {
      duration: 280,
      active: [90, 110],
      nextWindow: [120, 280],
      damage: 16,
      knockback: 90,
      vxPush: 0,
      hitbox: { cx: 28, y: 26, w: 12, h: 4 },
    },
    {
      duration: 340,
      active: [100, 120],
      nextWindow: null,
      damage: 24,
      knockback: 110,
      vxPush: 0,
      hitbox: { cx: 28, y: 26, w: 12, h: 4 },
    },
  ],

  maxMp: 100,
  mpRegenPerSec: 6,
  mpPerHit: 4,

  dashAtk: {
    duration: 380,
    vxInitial: 700,
    active: [60, 80],
    damage: 12,
    knockback: 120,
    hitbox: { cx: 32, y: 26, w: 12, h: 4 },
  },

  jumpAtk: {
    duration: 320,
    active: [60, 80],
    damage: 14,
    knockback: 100,
    hitbox: { cx: 28, y: 26, w: 12, h: 4 },
  },

  dodgeStandDurationMs: 400,
  dodgeRollSpeed: 500,
  dodgeRollDurationMs: 280,
  dodgeBarMax: 5,
  dodgeBarRegenPerSec: 0.4,
  dodgeStandCost: 1,
  dodgeRollCost: 1,

  maxHp: 100,
  hurtStunMs: 380,
  deathRespawnMs: 1500,

  parryDurationMs: 280,
  parryActiveStartMs: 0,
  parryActiveEndMs: 280,
  parryCooldownMs: 350,
  parryBuffDurationMs: 0,
  parryBuffDamageMul: 1,
  hasParry: false,

  stepBackHopVx: 280,
  stepBackHopVy: -340,
  stepBackHopDurationMs: 280,

  chargeTier1Ms: 475,
  chargeTier2Ms: 950,
  chargeTier3Ms: 1425,

  arrowSpeed: 700,
  arrowGravity: 700,
  arrowWidth: 20,
  arrowHeight: 3,
  arrowLifetimeMs: 1500,
  arrowSpawnDx: 18,
  arrowSpawnDy: -28,

  skills: {
    s1: {
      duration: 480,
      mpCost: 25,
      cooldownMs: 5000,
      hits: [
        {
          active: [140, 160],
          damage: 18,
          knockback: 120,
          hitbox: { cx: 28, y: 26, w: 12, h: 4 },
        },
      ],
    },
    s2: {
      duration: 750,
      mpCost: 50,
      cooldownMs: 10000,
      hits: [
        {
          active: [200, 220],
          damage: 28,
          knockback: 160,
          hitbox: { cx: 28, y: 26, w: 12, h: 4 },
        },
      ],
    },
    s3: {
      duration: 1000,
      mpCost: 75,
      cooldownMs: 16000,
      hits: [
        {
          active: [280, 300],
          damage: 50,
          knockback: 240,
          hitbox: { cx: 28, y: 26, w: 12, h: 4 },
        },
      ],
    },
  },
} as const;

export type NaiaSpec = typeof NAIA;

export type CharacterSpec = typeof ASTRID | NaiaSpec;
