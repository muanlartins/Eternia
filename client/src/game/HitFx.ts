import { Container, Graphics, Text } from 'pixi.js';

const POPUP_LIFETIME_MS = 600;
const POPUP_RISE_PX_PER_S = 70;
const SPARK_LIFETIME_MS = 140;
const SPARK_MAX_RADIUS = 18;

interface PopupItem {
  text: Text;
  ageMs: number;
  startX: number;
  startY: number;
}

interface SparkItem {
  gfx: Graphics;
  ageMs: number;
}

export class HitFx {
  readonly container = new Container();
  private popups: PopupItem[] = [];
  private sparks: SparkItem[] = [];

  popup(x: number, y: number, value: number) {
    const text = new Text({
      text: String(value),
      style: {
        fontFamily: 'monospace',
        fontSize: 18,
        fill: 0xffe066,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    text.anchor.set(0.5, 0.5);
    text.x = x;
    text.y = y;
    this.container.addChild(text);
    this.popups.push({ text, ageMs: 0, startX: x, startY: y });
  }

  spark(x: number, y: number) {
    const gfx = new Graphics();
    gfx.x = x;
    gfx.y = y;
    this.container.addChild(gfx);
    this.sparks.push({ gfx, ageMs: 0 });
  }

  update(dtMs: number) {
    const dt = dtMs / 1000;

    this.popups = this.popups.filter((p) => {
      p.ageMs += dtMs;
      if (p.ageMs >= POPUP_LIFETIME_MS) {
        this.container.removeChild(p.text);
        p.text.destroy();
        return false;
      }
      const t = p.ageMs / POPUP_LIFETIME_MS;
      p.text.y -= POPUP_RISE_PX_PER_S * dt;
      p.text.alpha = 1 - t * t;
      return true;
    });

    this.sparks = this.sparks.filter((s) => {
      s.ageMs += dtMs;
      if (s.ageMs >= SPARK_LIFETIME_MS) {
        this.container.removeChild(s.gfx);
        s.gfx.destroy();
        return false;
      }
      const t = s.ageMs / SPARK_LIFETIME_MS;
      const r = 4 + (SPARK_MAX_RADIUS - 4) * t;
      const alpha = 1 - t;
      s.gfx.clear();
      s.gfx.circle(0, 0, r).fill({ color: 0xffee44, alpha: alpha * 0.7 });
      s.gfx.circle(0, 0, r * 0.55).fill({ color: 0xffffff, alpha: alpha });
      return true;
    });
  }
}
