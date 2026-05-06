export const SLIM = {
  width: 36,
  height: 32,
  maxHp: 80,
  walkSpeed: 90,
  aggroRange: 220,
  attackRange: 54,
  attack: {
    telegraphMs: 380,
    activeMs: 160,
    recoveryMs: 480,
    damage: 12,
    knockback: 280,
    hitbox: { cx: 28, y: -2, w: 44, h: 36 },
  },
  attackCooldownMs: 1400,
  knockbackFriction: 1500,
  hurtStunMs: 280,
  parriedStunMs: 900,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 3,
  respawnMs: 3000,
} as const;

export const RACOON = {
  width: 46,
  height: 52,
  maxHp: 130,
  walkSpeed: 75,
  aggroRange: 280,
  attackRange: 68,
  attack: {
    telegraphMs: 500,
    activeMs: 200,
    recoveryMs: 620,
    damage: 18,
    knockback: 360,
    hitbox: { cx: 34, y: -4, w: 56, h: 50 },
  },
  attackCooldownMs: 1800,
  knockbackFriction: 1500,
  hurtStunMs: 320,
  parriedStunMs: 1100,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 4,
  respawnMs: 4000,
} as const;

export interface MobSpec {
  readonly width: number;
  readonly height: number;
  readonly maxHp: number;
  readonly walkSpeed: number;
  readonly aggroRange: number;
  readonly attackRange: number;
  readonly attack: {
    readonly telegraphMs: number;
    readonly activeMs: number;
    readonly recoveryMs: number;
    readonly damage: number;
    readonly knockback: number;
    readonly hitbox: {
      readonly cx: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
    };
  };
  readonly attackCooldownMs: number;
  readonly knockbackFriction: number;
  readonly hurtStunMs: number;
  readonly parriedStunMs: number;
  readonly parriedDamageMultiplier: number;
  readonly comboBreakThreshold: number;
  readonly respawnMs: number;
}
