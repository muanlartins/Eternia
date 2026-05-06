export interface AttackVariant {
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
  readonly weight: number;
  readonly moveDuringActiveVx?: number;
}

export interface MobSpec {
  readonly width: number;
  readonly height: number;
  readonly maxHp: number;
  readonly walkSpeed: number;
  readonly aggroRange: number;
  readonly attackRange: number;
  readonly attacks: readonly AttackVariant[];
  readonly attackCooldownMs: number;
  readonly knockbackFriction: number;
  readonly hurtStunMs: number;
  readonly parriedStunMs: number;
  readonly parriedDamageMultiplier: number;
  readonly comboBreakThreshold: number;
  readonly respawnMs: number;
}

export const SLIM: MobSpec = {
  width: 36,
  height: 32,
  maxHp: 80,
  walkSpeed: 90,
  aggroRange: 220,
  attackRange: 54,
  attacks: [
    {
      telegraphMs: 380,
      activeMs: 160,
      recoveryMs: 480,
      damage: 12,
      knockback: 280,
      hitbox: { cx: 28, y: -2, w: 44, h: 36 },
      weight: 1,
    },
  ],
  attackCooldownMs: 1400,
  knockbackFriction: 1500,
  hurtStunMs: 280,
  parriedStunMs: 900,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 3,
  respawnMs: 3000,
};

export const RACOON: MobSpec = {
  width: 46,
  height: 52,
  maxHp: 130,
  walkSpeed: 75,
  aggroRange: 280,
  attackRange: 68,
  attacks: [
    {
      telegraphMs: 500,
      activeMs: 200,
      recoveryMs: 620,
      damage: 18,
      knockback: 360,
      hitbox: { cx: 34, y: -4, w: 56, h: 50 },
      weight: 1,
    },
  ],
  attackCooldownMs: 1800,
  knockbackFriction: 1500,
  hurtStunMs: 320,
  parriedStunMs: 1100,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 4,
  respawnMs: 4000,
};

export const INSECTIVOROUS: MobSpec = {
  width: 80,
  height: 70,
  maxHp: 360,
  walkSpeed: 60,
  aggroRange: 420,
  attackRange: 220,
  attacks: [
    {
      telegraphMs: 360,
      activeMs: 180,
      recoveryMs: 540,
      damage: 16,
      knockback: 320,
      hitbox: { cx: 56, y: 4, w: 76, h: 60 },
      weight: 50,
    },
    {
      telegraphMs: 540,
      activeMs: 220,
      recoveryMs: 720,
      damage: 24,
      knockback: 460,
      hitbox: { cx: 0, y: 10, w: 200, h: 90 },
      weight: 25,
    },
    {
      telegraphMs: 480,
      activeMs: 380,
      recoveryMs: 640,
      damage: 22,
      knockback: 440,
      hitbox: { cx: 64, y: 0, w: 90, h: 66 },
      weight: 25,
      moveDuringActiveVx: 280,
    },
  ],
  attackCooldownMs: 1600,
  knockbackFriction: 1800,
  hurtStunMs: 200,
  parriedStunMs: 800,
  parriedDamageMultiplier: 1.6,
  comboBreakThreshold: 6,
  respawnMs: 8000,
};
