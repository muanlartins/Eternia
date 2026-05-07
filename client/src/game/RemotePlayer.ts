import { Container, Graphics, Text } from 'pixi.js';
import { ELESIS } from '../data/elesis.js';
import type { RemoteStatePayload } from './Network.js';

const LERP_RATE = 24; // higher = snappier follow of the latest received state
const GHOST_ALPHA = 0.55;
const EXTRAPOLATION_CAP_MS = 250; // stop dead-reckoning if no new state for >250ms

export class RemotePlayer {
  readonly view = new Container();
  private body: Graphics;
  private label: Text;
  private hpBg: Graphics;
  private hpFg: Graphics;

  private renderX = 0;
  private renderY = 0;
  private targetX = 0;
  private targetY = 0;
  private targetVx = 0;
  private targetVy = 0;
  private targetFacing: -1 | 1 = 1;
  private targetHp = 0;
  private targetMaxHp = 1;
  private hasFirstState = false;
  private msSinceState = 0;

  constructor(public readonly userId: number, public readonly username: string) {
    this.body = new Graphics();
    this.view.addChild(this.body);

    this.hpBg = new Graphics();
    this.view.addChild(this.hpBg);

    this.hpFg = new Graphics();
    this.view.addChild(this.hpFg);

    this.label = new Text({
      text: `@${username}`,
      style: {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xfff066,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.label.anchor.set(0.5, 1);
    this.label.x = ELESIS.width / 2;
    this.label.y = -22;
    this.view.addChild(this.label);

    this.redraw();
  }

  applyState(state: RemoteStatePayload) {
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetVx = state.vx;
    this.targetVy = state.vy;
    this.targetFacing = state.facing;
    this.targetHp = state.hp;
    this.targetMaxHp = state.maxHp || 1;
    this.msSinceState = 0;
    if (!this.hasFirstState) {
      this.renderX = state.x;
      this.renderY = state.y;
      this.hasFirstState = true;
    }
  }

  update(dtMs: number) {
    if (!this.hasFirstState) return;
    const dt = dtMs / 1000;
    this.msSinceState += dtMs;
    // Dead-reckon target forward using last known velocity, capped so a
    // disconnected ghost doesn't fly off the screen forever.
    if (this.msSinceState < EXTRAPOLATION_CAP_MS) {
      this.targetX += this.targetVx * dt;
      this.targetY += this.targetVy * dt;
    }
    const t = Math.min(1, LERP_RATE * dt);
    this.renderX += (this.targetX - this.renderX) * t;
    this.renderY += (this.targetY - this.renderY) * t;
    this.view.x = this.renderX;
    this.view.y = this.renderY;
    this.redraw();
  }

  destroy() {
    this.view.destroy({ children: true });
  }

  private redraw() {
    this.body.clear();
    this.body
      .rect(0, 0, ELESIS.width, ELESIS.height)
      .fill({ color: 0x88aaff, alpha: GHOST_ALPHA })
      .stroke({ color: 0xddddee, width: 2, alpha: 0.85 });

    // facing marker
    const fy = ELESIS.height * 0.4;
    const cx = ELESIS.width / 2;
    const tipX = cx + this.targetFacing * (ELESIS.width * 0.55);
    this.body
      .moveTo(cx, fy)
      .lineTo(tipX, fy)
      .stroke({ color: 0xffffff, width: 2, alpha: 0.85 });

    // tiny HP bar above the body
    const barW = ELESIS.width;
    const barH = 3;
    const pct = Math.max(0, Math.min(1, this.targetHp / this.targetMaxHp));
    this.hpBg.clear();
    this.hpBg
      .rect(0, -10, barW, barH)
      .fill({ color: 0x111827, alpha: 0.85 });
    this.hpFg.clear();
    if (pct > 0) {
      this.hpFg.rect(0, -10, barW * pct, barH).fill({ color: 0xff4455, alpha: 0.95 });
    }
  }
}
