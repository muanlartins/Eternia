import { Container, Graphics, Text } from 'pixi.js';

const POPUP_LIFETIME_MS = 700;
const POPUP_RISE_PX_PER_S = 70;
const POPUP_POP_MS = 90;
const SPARK_LIFETIME_MS = 140;
const SPARK_MAX_RADIUS = 18;

interface PopupItem {
  text: Text;
  ageMs: number;
  baseScale: number;
}

interface SparkItem {
  gfx: Graphics;
  ageMs: number;
}

interface PopupOpts {
  parryBuff?: boolean;
}

function popupStyle(value: number, parryBuff: boolean): { color: number; fontSize: number; stroke: number } {
  if (parryBuff) return { color: 0xffd700, fontSize: 22, stroke: 0x553300 };
  if (value >= 60) return { color: 0xff5544, fontSize: 24, stroke: 0x000000 };
  if (value >= 30) return { color: 0xffaa44, fontSize: 21, stroke: 0x000000 };
  if (value >= 12) return { color: 0xffe066, fontSize: 18, stroke: 0x000000 };
  return { color: 0xeeeeee, fontSize: 15, stroke: 0x000000 };
}

export class HitFx {
  readonly container = new Container();
  private popups: PopupItem[] = [];
  private sparks: SparkItem[] = [];

  popup(x: number, y: number, value: number, opts: PopupOpts = {}) {
    const parryBuff = opts.parryBuff ?? false;
    const { color, fontSize, stroke } = popupStyle(value, parryBuff);
    const baseScale = parryBuff ? 1.15 : 1.0;
    const jitterX = (Math.random() - 0.5) * 14;
    const jitterY = (Math.random() - 0.5) * 6;
    const text = new Text({
      text: parryBuff ? `${value}!` : String(value),
      style: {
        fontFamily: 'monospace',
        fontSize,
        fill: color,
        fontWeight: 'bold',
        stroke: { color: stroke, width: 3 },
      },
    });
    text.anchor.set(0.5, 0.5);
    text.x = x + jitterX;
    text.y = y + jitterY;
    text.scale.set(baseScale * 1.5);
    this.container.addChild(text);
    this.popups.push({ text, ageMs: 0, baseScale });
  }

  textPopup(
    x: number,
    y: number,
    label: string,
    opts: { color?: number; fontSize?: number; stroke?: number } = {},
  ) {
    const text = new Text({
      text: label,
      style: {
        fontFamily: 'monospace',
        fontSize: opts.fontSize ?? 26,
        fill: opts.color ?? 0xff4444,
        fontWeight: 'bold',
        stroke: { color: opts.stroke ?? 0x000000, width: 4 },
      },
    });
    text.anchor.set(0.5, 0.5);
    text.x = x;
    text.y = y;
    text.scale.set(1.5);
    this.container.addChild(text);
    this.popups.push({ text, ageMs: 0, baseScale: 1.0 });
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
      const popT = Math.min(1, p.ageMs / POPUP_POP_MS);
      const popScale = 1.5 - 0.5 * popT;
      p.text.scale.set(p.baseScale * popScale);
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
