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
  respawnMs: 3000,
} as const;

export type MobSpec = typeof SLIM;
