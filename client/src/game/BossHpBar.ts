import { Container, Graphics, Text } from 'pixi.js';

const BAR_W = 540;
const BAR_H = 18;
const PADDING_TOP = 64;

export class BossHpBar {
  readonly container = new Container();
  private bg: Graphics;
  private fill: Graphics;
  private name: Text;
  private hpText: Text;
  private phase2Tag: Text;

  constructor(gameW: number) {
    const x = (gameW - BAR_W) / 2;
    const y = PADDING_TOP;

    this.name = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 13,
        fill: 0xfff066,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.name.anchor.set(0.5, 1);
    this.name.x = gameW / 2;
    this.name.y = y - 4;
    this.container.addChild(this.name);

    this.bg = new Graphics();
    this.bg.x = x;
    this.bg.y = y;
    this.container.addChild(this.bg);

    this.fill = new Graphics();
    this.fill.x = x;
    this.fill.y = y;
    this.container.addChild(this.fill);

    this.hpText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xeeeeee,
        stroke: { color: 0x000000, width: 2 },
      },
    });
    this.hpText.anchor.set(0.5, 0.5);
    this.hpText.x = gameW / 2;
    this.hpText.y = y + BAR_H / 2;
    this.container.addChild(this.hpText);

    this.phase2Tag = new Text({
      text: 'PHASE 2',
      style: {
        fontFamily: 'monospace',
        fontSize: 11,
        fill: 0xff3344,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.phase2Tag.anchor.set(0, 0.5);
    this.phase2Tag.x = x + BAR_W + 10;
    this.phase2Tag.y = y + BAR_H / 2;
    this.phase2Tag.visible = false;
    this.container.addChild(this.phase2Tag);

    this.container.visible = false;
  }

  show(bossName: string) {
    this.name.text = bossName;
    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
    this.phase2Tag.visible = false;
  }

  update(hp: number, maxHp: number, phase: 1 | 2) {
    if (!this.container.visible) return;
    const pct = Math.max(0, Math.min(1, hp / maxHp));

    this.bg.clear();
    this.bg
      .roundRect(0, 0, BAR_W, BAR_H, 4)
      .fill({ color: 0x1a0a0a, alpha: 0.92 })
      .stroke({ color: 0xfff066, width: 2, alpha: 0.95 });

    this.fill.clear();
    if (pct > 0) {
      const t = (Date.now() % 1200) / 1200;
      const pulse = 0.85 + 0.15 * Math.sin(t * Math.PI * 2);
      const fillColor = phase === 2 ? 0xff2244 : 0xee5566;
      this.fill
        .roundRect(2, 2, (BAR_W - 4) * pct, BAR_H - 4, 3)
        .fill({ color: fillColor, alpha: 0.96 * (phase === 2 ? pulse : 1) });
    }

    this.hpText.text = `${Math.round(hp)} / ${maxHp}`;
    this.phase2Tag.visible = phase === 2;
  }
}
