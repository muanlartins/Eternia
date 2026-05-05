import { Container, Graphics } from 'pixi.js';
import type { AABB } from './types.js';

const W = 40;
const H = 64;
const MAX_HP = 100;
const KNOCKBACK_FRICTION = 1500;
const RESPAWN_MS = 2000;
const HIT_FLASH_MS = 90;

export class TargetDummy {
  x: number;
  y: number;
  vx = 0;
  hp = MAX_HP;
  alive = true;

  private readonly originalX: number;
  private deadTimerMs = 0;
  private hitFlashMs = 0;
  private receivedAttackIds = new Set<number>();

  readonly view = new Container();
  private body: Graphics;
  private hpBar: Graphics;

  constructor(x: number, y: number) {
    this.originalX = x;
    this.x = x;
    this.y = y;
    this.body = new Graphics();
    this.hpBar = new Graphics();
    this.view.addChild(this.body);
    this.view.addChild(this.hpBar);
    this.view.x = x;
    this.view.y = y;
    this.redraw();
  }

  hurtbox(): AABB {
    return { x: this.x, y: this.y, w: W, h: H };
  }

  receiveHit(attackId: number, damage: number, knockbackVx: number): boolean {
    if (!this.alive) return false;
    if (this.receivedAttackIds.has(attackId)) return false;
    this.receivedAttackIds.add(attackId);
    this.hp = Math.max(0, this.hp - damage);
    this.vx += knockbackVx;
    this.hitFlashMs = HIT_FLASH_MS;
    if (this.hp === 0) {
      this.alive = false;
      this.deadTimerMs = RESPAWN_MS;
    }
    return true;
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;

    if (this.vx !== 0) {
      const decel = KNOCKBACK_FRICTION * dt;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - decel);
      else this.vx = Math.min(0, this.vx + decel);
    }
    this.x += this.vx * dt;

    if (this.hitFlashMs > 0) {
      this.hitFlashMs = Math.max(0, this.hitFlashMs - dtMs);
    }

    if (!this.alive) {
      this.deadTimerMs -= dtMs;
      if (this.deadTimerMs <= 0) {
        this.alive = true;
        this.hp = MAX_HP;
        this.x = this.originalX;
        this.vx = 0;
        this.receivedAttackIds.clear();
      }
    }

    this.view.x = this.x;
    this.view.y = this.y;
    this.redraw();
  }

  private redraw() {
    this.body.clear();
    this.hpBar.clear();

    if (!this.alive) {
      this.body
        .rect(0, 0, W, H)
        .fill({ color: 0x4b5563, alpha: 0.35 });
      return;
    }

    const color = this.hitFlashMs > 0 ? 0xff8866 : 0x8b4513;
    this.body
      .rect(0, 0, W, H)
      .fill({ color, alpha: 0.95 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.5 });

    const barW = W;
    const barH = 4;
    const hpPct = this.hp / MAX_HP;
    this.hpBar
      .rect(0, -10, barW, barH)
      .fill({ color: 0x111827, alpha: 0.85 });
    this.hpBar
      .rect(0, -10, barW * hpPct, barH)
      .fill({ color: 0x22cc66, alpha: 0.95 });
  }
}
