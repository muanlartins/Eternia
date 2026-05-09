import { Container, Graphics } from 'pixi.js';
import type { AABB } from './types.js';

export type ProjectileOwner = 'player' | 'mob';
export type ProjectileVisual = 'rect' | 'arrow';

export interface ProjectileOptions {
  vy?: number;
  gravity?: number;
  owner?: ProjectileOwner;
  visual?: ProjectileVisual;
  pierce?: number;
  isGhost?: boolean;
}

export class Projectile {
  private static nextAttackId = -1;
  readonly view = new Container();
  private body: Graphics;
  alive = true;
  private timeAliveMs = 0;
  vy: number;
  readonly gravity: number;
  readonly owner: ProjectileOwner;
  readonly visual: ProjectileVisual;
  readonly attackId: number;
  readonly pierce: number;
  readonly isGhost: boolean;
  private hitMobIds = new Set<string>();

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public readonly damage: number,
    public readonly knockback: number,
    public readonly width: number,
    public readonly height: number,
    public lifetimeMs: number,
    public readonly facing: -1 | 1,
    public readonly onParried?: () => void,
    options?: ProjectileOptions,
  ) {
    this.vy = options?.vy ?? 0;
    this.gravity = options?.gravity ?? 0;
    this.owner = options?.owner ?? 'mob';
    this.visual = options?.visual ?? 'rect';
    this.pierce = options?.pierce ?? 1;
    this.isGhost = options?.isGhost ?? false;
    this.attackId = Projectile.nextAttackId--;
    this.body = new Graphics();
    this.view.addChild(this.body);
    this.view.x = x;
    this.view.y = y;
    this.redraw();
  }

  hurtbox(): AABB {
    if (this.visual === 'arrow') {
      return {
        x: this.x - this.width / 2,
        y: this.y - this.height / 2 - 2,
        w: this.width,
        h: this.height + 4,
      };
    }
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  hasHit(mobId: string): boolean {
    return this.hitMobIds.has(mobId);
  }

  markHit(mobId: string) {
    this.hitMobIds.add(mobId);
  }

  hitCount(): number {
    return this.hitMobIds.size;
  }

  update(dtMs: number) {
    if (!this.alive) return;
    const dt = dtMs / 1000;
    if (this.gravity > 0) {
      this.vy += this.gravity * dt;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetimeMs -= dtMs;
    this.timeAliveMs += dtMs;
    if (this.lifetimeMs <= 0) this.alive = false;
    this.view.x = this.x;
    this.view.y = this.y;
    this.redraw();
  }

  destroy() {
    this.alive = false;
    if (this.view.parent) this.view.parent.removeChild(this.view);
    this.view.destroy({ children: true });
  }

  private redraw() {
    this.body.clear();
    if (this.visual === 'arrow') {
      const angle = Math.atan2(this.vy, this.vx);
      this.body.rotation = angle;
      const len = this.width;
      const thick = this.height;
      this.body
        .rect(-len / 2, -thick / 2, len, thick)
        .fill({ color: 0x6b4226, alpha: 0.95 });
      this.body
        .moveTo(len / 2, 0)
        .lineTo(len / 2 - 4, -thick - 1)
        .lineTo(len / 2 + 3, 0)
        .lineTo(len / 2 - 4, thick + 1)
        .closePath()
        .fill({ color: 0x9e9e9e, alpha: 0.95 });
      this.body
        .moveTo(-len / 2, -thick / 2 - 1)
        .lineTo(-len / 2 - 4, -thick / 2 - 3)
        .lineTo(-len / 2 + 2, 0)
        .lineTo(-len / 2 - 4, thick / 2 + 3)
        .lineTo(-len / 2, thick / 2 + 1)
        .closePath()
        .fill({ color: 0xe0d4b8, alpha: 0.95 });
      return;
    }
    const pulse = 0.85 + 0.15 * Math.sin(this.timeAliveMs / 40);
    this.body
      .rect(0, 0, this.width, this.height)
      .fill({ color: 0xffaa44, alpha: 0.95 * pulse })
      .stroke({ color: 0x884422, width: 1, alpha: 0.95 });
    const tipX = this.facing === 1 ? this.width - 3 : 0;
    this.body
      .rect(tipX, -1, 3, this.height + 2)
      .fill({ color: 0xffe066, alpha: 0.95 });
  }
}
