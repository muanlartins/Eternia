export interface ProjectileSpec {
  readonly speed: number;
  readonly lifetimeMs: number;
  readonly hitboxW: number;
  readonly hitboxH: number;
  readonly originDx: number;
  readonly originDy: number;
}

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
  readonly moveDuringActiveVy?: number;
  readonly enterActiveJumpVy?: number;
  readonly projectile?: ProjectileSpec;
  readonly minRange?: number;
  readonly maxRange?: number;
}

export interface Phase2Spec {
  readonly hpThresholdPct: number;
  readonly attackCooldownMul: number;
  readonly telegraphMul: number;
  readonly damageMul: number;
  readonly walkSpeedMul: number;
  readonly comboBreakThresholdMul: number;
}

export interface MobSpec {
  readonly id: string;
  readonly displayName: string;
  readonly isBoss?: boolean;
  readonly bossName?: string;
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
  readonly phase2?: Phase2Spec;
  readonly hasGravity?: boolean;
  readonly hoverY?: number;
  readonly model3DUrl?: string;
  readonly baseRotationY3D?: number;
}

export const SLIM: MobSpec = {
  id: 'slim',
  displayName: 'Slims',
  width: 56,
  height: 44,
  maxHp: 100,
  walkSpeed: 110,
  aggroRange: 280,
  attackRange: 240,
  attacks: [
    {
      telegraphMs: 420,
      activeMs: 160,
      recoveryMs: 480,
      damage: 18,
      knockback: 280,
      hitbox: { cx: 28, y: -2, w: 44, h: 36 },
      weight: 2,
      maxRange: 70,
    },
    {
      telegraphMs: 600,
      activeMs: 80,
      recoveryMs: 520,
      damage: 14,
      knockback: 220,
      hitbox: { cx: 28, y: -10, w: 24, h: 24 },
      weight: 1,
      minRange: 80,
      maxRange: 240,
      projectile: {
        speed: 280,
        lifetimeMs: 1400,
        hitboxW: 14,
        hitboxH: 14,
        originDx: 24,
        originDy: 12,
      },
    },
  ],
  attackCooldownMs: 1100,
  knockbackFriction: 1500,
  hurtStunMs: 280,
  parriedStunMs: 900,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 3,
  respawnMs: 3000,
  model3DUrl: '/models/forest-sprite.glb',
};

export const RACOON: MobSpec = {
  id: 'racoon',
  displayName: 'Racoons',
  width: 76,
  height: 60,
  maxHp: 120,
  walkSpeed: 75,
  aggroRange: 320,
  attackRange: 180,
  attacks: [
    {
      telegraphMs: 540,
      activeMs: 200,
      recoveryMs: 620,
      damage: 16,
      knockback: 360,
      hitbox: { cx: 34, y: -4, w: 56, h: 50 },
      weight: 2,
      maxRange: 90,
    },
    {
      telegraphMs: 720,
      activeMs: 220,
      recoveryMs: 600,
      damage: 22,
      knockback: 480,
      hitbox: { cx: 50, y: -8, w: 70, h: 56 },
      weight: 1,
      minRange: 100,
      maxRange: 180,
      moveDuringActiveVx: 280,
    },
  ],
  attackCooldownMs: 1800,
  knockbackFriction: 1500,
  hurtStunMs: 320,
  parriedStunMs: 1100,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 4,
  respawnMs: 4000,
  model3DUrl: '/models/bramble-breast.glb',
  baseRotationY3D: Math.PI / 4,
};

export const ARCHER: MobSpec = {
  id: 'archer',
  displayName: 'Archers',
  width: 36,
  height: 56,
  maxHp: 90,
  walkSpeed: 70,
  aggroRange: 380,
  attackRange: 280,
  attacks: [
    {
      telegraphMs: 540,
      activeMs: 100,
      recoveryMs: 600,
      damage: 14,
      knockback: 280,
      hitbox: { cx: 0, y: 0, w: 0, h: 0 },
      weight: 1,
      projectile: {
        speed: 480,
        lifetimeMs: 1500,
        hitboxW: 18,
        hitboxH: 6,
        originDx: 22,
        originDy: 22,
      },
    },
  ],
  attackCooldownMs: 2000,
  knockbackFriction: 1500,
  hurtStunMs: 280,
  parriedStunMs: 1000,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 3,
  respawnMs: 4500,
};

export const BRUTE: MobSpec = {
  id: 'brute',
  displayName: 'Brutes',
  width: 56,
  height: 70,
  maxHp: 220,
  walkSpeed: 50,
  aggroRange: 280,
  attackRange: 92,
  attacks: [
    {
      telegraphMs: 720,
      activeMs: 240,
      recoveryMs: 740,
      damage: 26,
      knockback: 480,
      hitbox: { cx: 46, y: -6, w: 76, h: 70 },
      weight: 1,
    },
  ],
  attackCooldownMs: 2200,
  knockbackFriction: 1900,
  hurtStunMs: 220,
  parriedStunMs: 1100,
  parriedDamageMultiplier: 1.6,
  comboBreakThreshold: 8,
  respawnMs: 6000,
};

export const BOG_FROG: MobSpec = {
  id: 'bog-frog',
  displayName: 'Bog Frogs',
  width: 44,
  height: 32,
  maxHp: 110,
  walkSpeed: 60,
  aggroRange: 260,
  attackRange: 110,
  attacks: [
    {
      telegraphMs: 540,
      activeMs: 280,
      recoveryMs: 480,
      damage: 16,
      knockback: 320,
      hitbox: { cx: 32, y: -2, w: 60, h: 36 },
      weight: 1,
      moveDuringActiveVx: 280,
      enterActiveJumpVy: -380,
    },
  ],
  attackCooldownMs: 1700,
  knockbackFriction: 1500,
  hurtStunMs: 280,
  parriedStunMs: 1000,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 4,
  respawnMs: 4500,
};

export const MIRE_WRAITH: MobSpec = {
  id: 'mire-wraith',
  displayName: 'Mire Wraiths',
  width: 36,
  height: 50,
  maxHp: 75,
  walkSpeed: 140,
  aggroRange: 320,
  attackRange: 64,
  attacks: [
    {
      telegraphMs: 380,
      activeMs: 140,
      recoveryMs: 380,
      damage: 22,
      knockback: 300,
      hitbox: { cx: 30, y: -4, w: 52, h: 48 },
      weight: 1,
    },
  ],
  attackCooldownMs: 1300,
  knockbackFriction: 1400,
  hurtStunMs: 240,
  parriedStunMs: 950,
  parriedDamageMultiplier: 1.7,
  comboBreakThreshold: 3,
  respawnMs: 4000,
};

export const DROWNED_KING: MobSpec = {
  id: 'drowned-king',
  displayName: 'Bosses',
  isBoss: true,
  bossName: 'Drowned King',
  width: 90,
  height: 80,
  maxHp: 420,
  walkSpeed: 50,
  aggroRange: 460,
  attackRange: 240,
  attacks: [
    {
      telegraphMs: 460,
      activeMs: 200,
      recoveryMs: 580,
      damage: 18,
      knockback: 360,
      hitbox: { cx: 64, y: 4, w: 84, h: 72 },
      weight: 50,
    },
    {
      telegraphMs: 660,
      activeMs: 240,
      recoveryMs: 760,
      damage: 26,
      knockback: 480,
      hitbox: { cx: 0, y: 10, w: 220, h: 100 },
      weight: 25,
    },
    {
      telegraphMs: 580,
      activeMs: 400,
      recoveryMs: 680,
      damage: 24,
      knockback: 460,
      hitbox: { cx: 70, y: 0, w: 96, h: 76 },
      weight: 25,
      moveDuringActiveVx: 300,
    },
  ],
  attackCooldownMs: 1500,
  knockbackFriction: 1900,
  hurtStunMs: 220,
  parriedStunMs: 800,
  parriedDamageMultiplier: 1.6,
  comboBreakThreshold: 5,
  respawnMs: 8000,
  phase2: {
    hpThresholdPct: 0.5,
    attackCooldownMul: 0.5,
    telegraphMul: 0.7,
    damageMul: 1.25,
    walkSpeedMul: 1.5,
    comboBreakThresholdMul: 0.7,
  },
};

export const WISP: MobSpec = {
  id: 'wisp',
  displayName: 'Wisps',
  width: 32,
  height: 32,
  maxHp: 70,
  walkSpeed: 130,
  aggroRange: 360,
  attackRange: 90,
  hasGravity: false,
  hoverY: 380,
  attacks: [
    {
      telegraphMs: 480,
      activeMs: 220,
      recoveryMs: 520,
      damage: 14,
      knockback: 240,
      hitbox: { cx: 0, y: 18, w: 52, h: 60 },
      weight: 1,
      moveDuringActiveVx: 60,
      moveDuringActiveVy: 320,
    },
  ],
  attackCooldownMs: 1500,
  knockbackFriction: 1300,
  hurtStunMs: 220,
  parriedStunMs: 900,
  parriedDamageMultiplier: 1.6,
  comboBreakThreshold: 3,
  respawnMs: 4000,
};

export const INSECTIVOROUS: MobSpec = {
  id: 'insectivorous',
  displayName: 'Bosses',
  isBoss: true,
  bossName: 'Insectivorous',
  width: 80,
  height: 70,
  maxHp: 360,
  walkSpeed: 60,
  aggroRange: 420,
  attackRange: 220,
  attacks: [
    {
      telegraphMs: 440,
      activeMs: 180,
      recoveryMs: 540,
      damage: 16,
      knockback: 320,
      hitbox: { cx: 56, y: 4, w: 76, h: 60 },
      weight: 50,
    },
    {
      telegraphMs: 600,
      activeMs: 220,
      recoveryMs: 720,
      damage: 24,
      knockback: 460,
      hitbox: { cx: 0, y: 10, w: 200, h: 90 },
      weight: 25,
    },
    {
      telegraphMs: 540,
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
  phase2: {
    hpThresholdPct: 0.5,
    attackCooldownMul: 0.55,
    telegraphMul: 0.7,
    damageMul: 1.2,
    walkSpeedMul: 1.4,
    comboBreakThresholdMul: 0.7,
  },
};
