import { Container, Graphics } from 'pixi.js';
import type { AABB } from './types.js';

export class Projectile {
  readonly view = new Container();
  private body: Graphics;
  alive = true;
  private timeAliveMs = 0;

  constructor(
    public x: number,
    public y: number,
    public readonly vx: number,
    public readonly damage: number,
    public readonly knockback: number,
    public readonly width: number,
    public readonly height: number,
    private lifetimeMs: number,
    public readonly facing: -1 | 1,
    public readonly onParried?: () => void,
  ) {
    this.body = new Graphics();
    this.view.addChild(this.body);
    this.view.x = x;
    this.view.y = y;
    this.redraw();
  }

  hurtbox(): AABB {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  update(dtMs: number) {
    if (!this.alive) return;
    const dt = dtMs / 1000;
    this.x += this.vx * dt;
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
