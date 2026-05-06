import { Container, Graphics } from 'pixi.js';
import type { AttackVariant, MobSpec } from '../data/mobs.js';
import { Projectile } from './Projectile.js';
import type { AABB, ActiveHit } from './types.js';

export const MobState = {
  Idle: 'idle',
  Chase: 'chase',
  Telegraph: 'telegraph',
  Active: 'active',
  Recover: 'recover',
  Hurt: 'hurt',
  Dead: 'dead',
} as const;
export type MobState = (typeof MobState)[keyof typeof MobState];

const MOB_COLOR: Record<MobState, number> = {
  idle: 0x4a8e5a,
  chase: 0x66bb77,
  telegraph: 0xffaa22,
  active: 0xff4444,
  recover: 0x668866,
  hurt: 0xff7799,
  dead: 0x4b5563,
};

export class Mob {
  x: number;
  y: number;
  vx = 0;
  hp: number;
  alive = true;

  state: MobState = MobState.Idle;
  stateTimeMs = 0;
  facing: -1 | 1 = 1;
  koFlashMs = 0;
  private koFlashTotalMs = 220;
  koFadeMs = 0;
  private koFadeTotalMs = 0;

  private readonly originalX: number;
  private readonly originalY: number;
  private deadTimerMs = 0;
  private hitFlashMs = 0;
  private attackCooldownMs = 0;
  private currentAttackId = 0;
  private receivedAttackIds = new Set<number>();
  private hurtDurationMs = 0;
  private parriedBuff = false;
  private consecutiveHits = 0;
  private armorActive = false;
  private currentAttackIdx = 0;

  readonly view = new Container();
  private body: Graphics;
  private hpBar: Graphics;
  private facingMarker: Graphics;
  private previewMarker: Graphics;

  private readonly autoRespawn: boolean;
  private pendingProjectiles: Projectile[] = [];

  constructor(
    private readonly spec: MobSpec,
    x: number,
    y: number,
    options?: { autoRespawn?: boolean },
  ) {
    this.originalX = x;
    this.originalY = y;
    this.x = x;
    this.y = y;
    this.hp = spec.maxHp;
    this.autoRespawn = options?.autoRespawn ?? true;
    this.body = new Graphics();
    this.hpBar = new Graphics();
    this.facingMarker = new Graphics();
    this.previewMarker = new Graphics();
    this.view.addChild(this.body);
    this.view.addChild(this.facingMarker);
    this.view.addChild(this.previewMarker);
    this.view.addChild(this.hpBar);
    this.view.x = x;
    this.view.y = y;
    this.redraw();
  }

  isBoss(): boolean {
    return this.spec.maxHp >= 200;
  }

  getId(): string {
    return this.spec.id;
  }

  getDisplayName(): string {
    return this.spec.displayName;
  }

  isFading(): boolean {
    return !this.alive && this.koFlashMs <= 0 && this.koFadeMs > 0;
  }

  instakill() {
    if (!this.alive) return;
    this.hp = 0;
    this.alive = false;
    this.deadTimerMs = this.spec.respawnMs;
    this.koFlashMs = this.isBoss() ? 500 : 220;
    this.koFlashTotalMs = this.koFlashMs;
    this.koFadeMs = this.isBoss() ? 2500 : 0;
    this.koFadeTotalMs = this.koFadeMs;
    this.setState(MobState.Dead);
  }

  hurtbox(): AABB {
    return { x: this.x, y: this.y, w: this.spec.width, h: this.spec.height };
  }

  receiveHit(attackId: number, damage: number, knockbackVx: number): { applied: number } | null {
    if (!this.alive) return null;
    if (this.receivedAttackIds.has(attackId)) return null;
    this.receivedAttackIds.add(attackId);
    const applied = damage;
    this.hp = Math.max(0, this.hp - applied);
    this.vx += knockbackVx;
    this.hitFlashMs = 90;

    if (this.hp === 0) {
      this.alive = false;
      this.deadTimerMs = this.spec.respawnMs;
      this.koFlashMs = this.isBoss() ? 500 : 220;
      this.koFlashTotalMs = this.koFlashMs;
      this.koFadeMs = this.isBoss() ? 2500 : 0;
      this.koFadeTotalMs = this.koFadeMs;
      this.setState(MobState.Dead);
      return { applied };
    }

    const inAttackFlow =
      this.state === MobState.Telegraph ||
      this.state === MobState.Active ||
      this.state === MobState.Recover;

    if (inAttackFlow || this.armorActive) {
      return { applied };
    }

    this.consecutiveHits++;

    if (this.consecutiveHits >= this.spec.comboBreakThreshold) {
      this.consecutiveHits = 0;
      this.armorActive = true;
      this.currentAttackIdx = this.pickAttack();
      this.setState(MobState.Telegraph);
    } else {
      this.hurtDurationMs = this.spec.hurtStunMs;
      this.setState(MobState.Hurt);
    }
    return { applied };
  }

  parried(knockbackVx: number) {
    if (!this.alive) return;
    this.vx += knockbackVx;
    this.hitFlashMs = 200;
    this.hurtDurationMs = this.spec.parriedStunMs;
    this.parriedBuff = true;
    this.consecutiveHits = 0;
    this.armorActive = false;
    this.attackCooldownMs = Math.max(this.attackCooldownMs, this.spec.attackCooldownMs);
    this.setState(MobState.Hurt);
  }

  resetTransientBuffs() {
    if (!this.alive) return;
    this.consecutiveHits = 0;
    this.parriedBuff = false;
    this.armorActive = false;
    this.hitFlashMs = 0;
  }

  getActiveHit(): ActiveHit | null {
    if (this.state !== MobState.Active) return null;
    const atk = this.currentAttack();
    if (atk.projectile) return null;
    const hb = atk.hitbox;
    const localX = this.spec.width / 2 + this.facing * hb.cx - hb.w / 2;
    return {
      bbox: { x: this.x + localX, y: this.y + hb.y, w: hb.w, h: hb.h },
      damage: atk.damage,
      knockback: atk.knockback,
      attackId: this.currentAttackId,
      facing: this.facing,
      isCombo: false,
    };
  }

  flushPendingProjectiles(): Projectile[] {
    const out = this.pendingProjectiles;
    this.pendingProjectiles = [];
    return out;
  }

  private currentAttack(): AttackVariant {
    return this.spec.attacks[this.currentAttackIdx]!;
  }

  private pickAttack(): number {
    const total = this.spec.attacks.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < this.spec.attacks.length; i++) {
      r -= this.spec.attacks[i]!.weight;
      if (r <= 0) return i;
    }
    return 0;
  }

  update(dtMs: number, playerCenterX: number) {
    const dt = dtMs / 1000;
    this.stateTimeMs += dtMs;
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - dtMs);
    this.hitFlashMs = Math.max(0, this.hitFlashMs - dtMs);
    this.koFlashMs = Math.max(0, this.koFlashMs - dtMs);
    if (this.koFlashMs <= 0) {
      this.koFadeMs = Math.max(0, this.koFadeMs - dtMs);
    }

    if (this.vx !== 0) {
      const decel = this.spec.knockbackFriction * dt;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - decel);
      else this.vx = Math.min(0, this.vx + decel);
    }

    switch (this.state) {
      case MobState.Idle:
      case MobState.Chase:
        this.tickIdleOrChase(playerCenterX);
        break;
      case MobState.Telegraph:
        if (this.stateTimeMs >= this.currentAttack().telegraphMs) {
          this.setState(MobState.Active);
        }
        break;
      case MobState.Active: {
        const atk = this.currentAttack();
        if (atk.moveDuringActiveVx !== undefined) {
          this.vx = this.facing * atk.moveDuringActiveVx;
        }
        if (this.stateTimeMs >= atk.activeMs) {
          this.setState(MobState.Recover);
        }
        break;
      }
      case MobState.Recover:
        if (this.stateTimeMs >= this.currentAttack().recoveryMs) {
          this.attackCooldownMs = this.spec.attackCooldownMs;
          this.armorActive = false;
          this.setState(MobState.Idle);
        }
        break;
      case MobState.Hurt:
        if (this.stateTimeMs >= this.hurtDurationMs) {
          this.setState(MobState.Idle);
        }
        break;
      case MobState.Dead:
        if (this.autoRespawn) {
          this.deadTimerMs -= dtMs;
          if (this.deadTimerMs <= 0) {
            this.respawn();
          }
        }
        break;
    }

    this.x += this.vx * dt;
    this.view.x = this.x;
    this.view.y = this.y;
    this.redraw();
  }

  private tickIdleOrChase(playerCenterX: number) {
    const myCenterX = this.x + this.spec.width / 2;
    const dist = Math.abs(playerCenterX - myCenterX);
    const dir: -1 | 1 = playerCenterX >= myCenterX ? 1 : -1;

    if (dist <= this.spec.attackRange && this.attackCooldownMs <= 0) {
      this.facing = dir;
      this.vx = 0;
      this.currentAttackIdx = this.pickAttack();
      this.setState(MobState.Telegraph);
      return;
    }

    if (dist <= this.spec.aggroRange) {
      this.facing = dir;
      this.vx = dir * this.spec.walkSpeed;
      if (this.state !== MobState.Chase) this.setState(MobState.Chase);
    } else {
      this.vx = 0;
      if (this.state !== MobState.Idle) this.setState(MobState.Idle);
    }
  }

  private respawn() {
    this.alive = true;
    this.hp = this.spec.maxHp;
    this.x = this.originalX;
    this.y = this.originalY;
    this.vx = 0;
    this.attackCooldownMs = 0;
    this.receivedAttackIds.clear();
    this.parriedBuff = false;
    this.consecutiveHits = 0;
    this.armorActive = false;
    this.setState(MobState.Idle);
  }

  private setState(s: MobState) {
    if (this.state !== s) {
      if (this.state === MobState.Hurt && s !== MobState.Hurt) {
        this.parriedBuff = false;
      }
      this.state = s;
      this.stateTimeMs = 0;
      if (s === MobState.Active) {
        this.currentAttackId++;
        this.spawnProjectileIfNeeded();
      }
    }
  }

  private spawnProjectileIfNeeded() {
    const atk = this.currentAttack();
    const proj = atk.projectile;
    if (!proj) return;
    const dir = this.facing;
    const startX = this.x + this.spec.width / 2 + dir * proj.originDx - proj.hitboxW / 2;
    const startY = this.y + proj.originDy - proj.hitboxH / 2;
    this.pendingProjectiles.push(
      new Projectile(
        startX,
        startY,
        dir * proj.speed,
        atk.damage,
        atk.knockback,
        proj.hitboxW,
        proj.hitboxH,
        proj.lifetimeMs,
        dir,
        () => this.parried(-dir * 220),
      ),
    );
  }

  private redraw() {
    this.body.clear();
    this.hpBar.clear();
    this.facingMarker.clear();
    this.previewMarker.clear();

    if (!this.alive) {
      if (this.koFlashMs > 0 && this.koFlashTotalMs > 0) {
        const t = this.koFlashMs / this.koFlashTotalMs;
        this.body
          .rect(0, 0, this.spec.width, this.spec.height)
          .fill({ color: 0xffffff, alpha: 0.4 + 0.55 * t });
      } else if (this.koFadeMs > 0 && this.koFadeTotalMs > 0) {
        const t = this.koFadeMs / this.koFadeTotalMs;
        const drift = (1 - t) * 36;
        const alpha = 0.7 * t;
        this.body
          .rect(0, -drift, this.spec.width, this.spec.height)
          .fill({ color: 0xddddff, alpha })
          .stroke({ color: 0xffd700, width: 2, alpha: alpha * 0.8 });
      } else if (!this.isBoss()) {
        this.body
          .rect(0, 0, this.spec.width, this.spec.height)
          .fill({ color: MOB_COLOR.dead, alpha: 0.35 });
      }
      return;
    }

    const baseColor = MOB_COLOR[this.state];
    const color = this.hitFlashMs > 0 ? 0xff8866 : baseColor;
    const strokeColor = this.parriedBuff
      ? 0xffd700
      : this.armorActive
        ? 0xff3300
        : 0xffffff;
    const strokeWidth = this.parriedBuff || this.armorActive ? 3 : 1;
    this.body
      .rect(0, 0, this.spec.width, this.spec.height)
      .fill({ color, alpha: 0.95 })
      .stroke({ color: strokeColor, width: strokeWidth, alpha: 0.95 });

    const fx = this.spec.width / 2;
    const fy = this.spec.height * 0.35;
    const tipX = fx + this.facing * (this.spec.width * 0.55);
    this.facingMarker
      .moveTo(fx, fy)
      .lineTo(tipX, fy)
      .stroke({ color: 0xffffff, width: 2 });
    this.facingMarker
      .circle(tipX, fy, 3)
      .fill({ color: 0xffffff, alpha: 0.9 });

    if (this.state === MobState.Telegraph) {
      const atk = this.currentAttack();
      const hb = atk.hitbox;
      const localX = this.spec.width / 2 + this.facing * hb.cx - hb.w / 2;
      const t = Math.min(1, this.stateTimeMs / atk.telegraphMs);
      const pulse = 0.5 + 0.5 * Math.sin(this.stateTimeMs / 60);
      this.previewMarker
        .rect(localX, hb.y, hb.w, hb.h)
        .fill({ color: 0xff0033, alpha: 0.06 + 0.18 * t * pulse })
        .stroke({ color: 0xff3355, width: 2, alpha: 0.45 + 0.5 * t });
    }

    const barW = this.spec.width;
    const barH = 4;
    const hpPct = this.hp / this.spec.maxHp;
    this.hpBar
      .rect(0, -10, barW, barH)
      .fill({ color: 0x111827, alpha: 0.85 });
    this.hpBar
      .rect(0, -10, barW * hpPct, barH)
      .fill({ color: 0xee5566, alpha: 0.95 });
  }
}
