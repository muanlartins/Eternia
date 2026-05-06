import { Container, Graphics } from 'pixi.js';
import type { MobSpec } from '../data/mobs.js';
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

  private readonly originalX: number;
  private readonly originalY: number;
  private deadTimerMs = 0;
  private hitFlashMs = 0;
  private attackCooldownMs = 0;
  private currentAttackId = 0;
  private receivedAttackIds = new Set<number>();
  private hurtDurationMs = 0;
  private parriedBuff = false;

  readonly view = new Container();
  private body: Graphics;
  private hpBar: Graphics;

  constructor(
    private readonly spec: MobSpec,
    x: number,
    y: number,
  ) {
    this.originalX = x;
    this.originalY = y;
    this.x = x;
    this.y = y;
    this.hp = spec.maxHp;
    this.body = new Graphics();
    this.hpBar = new Graphics();
    this.view.addChild(this.body);
    this.view.addChild(this.hpBar);
    this.view.x = x;
    this.view.y = y;
    this.redraw();
  }

  hurtbox(): AABB {
    return { x: this.x, y: this.y, w: this.spec.width, h: this.spec.height };
  }

  receiveHit(attackId: number, damage: number, knockbackVx: number): { applied: number; bonus: boolean } | null {
    if (!this.alive) return null;
    if (this.receivedAttackIds.has(attackId)) return null;
    this.receivedAttackIds.add(attackId);
    const bonus = this.parriedBuff;
    const applied = bonus ? Math.round(damage * this.spec.parriedDamageMultiplier) : damage;
    this.hp = Math.max(0, this.hp - applied);
    this.vx += knockbackVx;
    this.hitFlashMs = bonus ? 160 : 90;

    if (this.hp === 0) {
      this.alive = false;
      this.deadTimerMs = this.spec.respawnMs;
      this.setState(MobState.Dead);
    } else {
      this.hurtDurationMs = this.spec.hurtStunMs;
      this.setState(MobState.Hurt);
    }
    return { applied, bonus };
  }

  parried(knockbackVx: number) {
    if (!this.alive) return;
    this.vx += knockbackVx;
    this.hitFlashMs = 200;
    this.hurtDurationMs = this.spec.parriedStunMs;
    this.parriedBuff = true;
    this.setState(MobState.Hurt);
  }

  getActiveHit(): ActiveHit | null {
    if (this.state !== MobState.Active) return null;
    const hb = this.spec.attack.hitbox;
    const localX = this.spec.width / 2 + this.facing * hb.cx - hb.w / 2;
    return {
      bbox: { x: this.x + localX, y: this.y + hb.y, w: hb.w, h: hb.h },
      damage: this.spec.attack.damage,
      knockback: this.spec.attack.knockback,
      attackId: this.currentAttackId,
      facing: this.facing,
    };
  }

  update(dtMs: number, playerCenterX: number) {
    const dt = dtMs / 1000;
    this.stateTimeMs += dtMs;
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - dtMs);
    this.hitFlashMs = Math.max(0, this.hitFlashMs - dtMs);

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
        if (this.stateTimeMs >= this.spec.attack.telegraphMs) {
          this.setState(MobState.Active);
        }
        break;
      case MobState.Active:
        if (this.stateTimeMs >= this.spec.attack.activeMs) {
          this.setState(MobState.Recover);
        }
        break;
      case MobState.Recover:
        if (this.stateTimeMs >= this.spec.attack.recoveryMs) {
          this.attackCooldownMs = this.spec.attackCooldownMs;
          this.setState(MobState.Idle);
        }
        break;
      case MobState.Hurt:
        if (this.stateTimeMs >= this.hurtDurationMs) {
          this.setState(MobState.Idle);
        }
        break;
      case MobState.Dead:
        this.deadTimerMs -= dtMs;
        if (this.deadTimerMs <= 0) {
          this.respawn();
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
      }
    }
  }

  private redraw() {
    this.body.clear();
    this.hpBar.clear();

    if (!this.alive) {
      this.body
        .rect(0, 0, this.spec.width, this.spec.height)
        .fill({ color: MOB_COLOR.dead, alpha: 0.35 });
      return;
    }

    const baseColor = MOB_COLOR[this.state];
    const color = this.hitFlashMs > 0 ? 0xff8866 : baseColor;
    const strokeColor = this.parriedBuff ? 0xffd700 : 0xffffff;
    const strokeWidth = this.parriedBuff ? 2 : 1;
    this.body
      .rect(0, 0, this.spec.width, this.spec.height)
      .fill({ color, alpha: 0.95 })
      .stroke({ color: strokeColor, width: strokeWidth, alpha: 0.95 });

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
