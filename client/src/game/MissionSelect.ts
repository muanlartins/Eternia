import { Container, Graphics, Text } from 'pixi.js';
import type { Input } from './Input.js';
import { MISSIONS, type MissionSpec } from '../data/missions.js';

const PANEL_W = 640;
const PANEL_H = 460;
const CARD_H = 96;
const CARD_GAP = 16;
const CARD_PAD_X = 32;

export class MissionSelect {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private cardsGfx: Graphics;
  private cardLabels: Array<{ name: Text; sub: Text; desc: Text }> = [];
  private hint: Text;
  private status: Text;

  private selectedIdx = 0;
  private onConfirm: ((mission: MissionSpec) => void) | null = null;
  private readonly panelX: number;
  private readonly panelY: number;

  constructor(gameW: number, gameH: number) {
    this.panelX = (gameW - PANEL_W) / 2;
    this.panelY = (gameH - PANEL_H) / 2;

    this.bg = new Graphics();
    this.bg.x = this.panelX;
    this.bg.y = this.panelY;
    this.container.addChild(this.bg);

    this.title = new Text({
      text: 'MISSION',
      style: {
        fontFamily: 'monospace',
        fontSize: 22,
        fill: 0xfff066,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 },
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.x = gameW / 2;
    this.title.y = this.panelY + 20;
    this.container.addChild(this.title);

    this.cardsGfx = new Graphics();
    this.cardsGfx.x = this.panelX;
    this.cardsGfx.y = this.panelY;
    this.container.addChild(this.cardsGfx);

    for (let i = 0; i < MISSIONS.length; i++) {
      const m = MISSIONS[i]!;
      const cardY = this.panelY + 70 + i * (CARD_H + CARD_GAP);
      const name = new Text({
        text: m.name,
        style: {
          fontFamily: 'monospace',
          fontSize: 18,
          fill: 0xfff066,
          fontWeight: 'bold',
        },
      });
      name.x = this.panelX + CARD_PAD_X + 16;
      name.y = cardY + 14;
      this.container.addChild(name);

      const sub = new Text({
        text: `${m.subtitle}  ·  Boss: ${m.bossName}`,
        style: { fontFamily: 'monospace', fontSize: 12, fill: 0xaaaadd },
      });
      sub.x = this.panelX + CARD_PAD_X + 16;
      sub.y = cardY + 38;
      this.container.addChild(sub);

      const desc = new Text({
        text: m.description,
        style: {
          fontFamily: 'monospace',
          fontSize: 12,
          fill: 0xddddee,
          wordWrap: true,
          wordWrapWidth: PANEL_W - CARD_PAD_X * 2 - 32,
        },
      });
      desc.x = this.panelX + CARD_PAD_X + 16;
      desc.y = cardY + 60;
      this.container.addChild(desc);

      this.cardLabels.push({ name, sub, desc });
    }

    this.status = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 12, fill: 0xaaaadd },
    });
    this.status.anchor.set(0.5, 0);
    this.status.x = gameW / 2;
    this.status.y = this.panelY + PANEL_H - 50;
    this.container.addChild(this.status);

    this.hint = new Text({
      text: '↑↓ select  ENTER start',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xaaaadd },
    });
    this.hint.anchor.set(0.5, 0);
    this.hint.x = gameW / 2;
    this.hint.y = this.panelY + PANEL_H - 26;
    this.container.addChild(this.hint);

    this.container.visible = false;
  }

  isOpen(): boolean {
    return this.container.visible;
  }

  show(opts: { onConfirm: (mission: MissionSpec) => void; statusText?: string }) {
    this.selectedIdx = MISSIONS.findIndex((m) => m.available);
    if (this.selectedIdx < 0) this.selectedIdx = 0;
    this.onConfirm = opts.onConfirm;
    this.status.text = opts.statusText ?? '';
    this.container.visible = true;
    this.redraw();
  }

  hide() {
    this.container.visible = false;
    this.onConfirm = null;
  }

  update(input: Input) {
    if (!this.container.visible) return;
    if (input.justPressed('up')) {
      this.selectedIdx = (this.selectedIdx - 1 + MISSIONS.length) % MISSIONS.length;
      this.redraw();
    } else if (input.justPressed('down')) {
      this.selectedIdx = (this.selectedIdx + 1) % MISSIONS.length;
      this.redraw();
    } else if (input.justPressed('confirm')) {
      const m = MISSIONS[this.selectedIdx]!;
      if (m.available && this.onConfirm) {
        const cb = this.onConfirm;
        cb(m);
      }
    }
  }

  private redraw() {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 16)
      .fill({ color: 0x101820, alpha: 0.96 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });

    this.cardsGfx.clear();
    for (let i = 0; i < MISSIONS.length; i++) {
      const m = MISSIONS[i]!;
      const cardY = 70 + i * (CARD_H + CARD_GAP);
      const isSelected = i === this.selectedIdx;
      const fillColor = m.available
        ? isSelected
          ? 0x223355
          : 0x182030
        : 0x111419;
      const strokeColor = isSelected ? 0xfff066 : m.available ? 0x88aaff : 0x3a4258;
      const strokeWidth = isSelected ? 3 : 1;
      this.cardsGfx
        .roundRect(CARD_PAD_X, cardY, PANEL_W - CARD_PAD_X * 2, CARD_H, 8)
        .fill({ color: fillColor, alpha: 0.95 })
        .stroke({ color: strokeColor, width: strokeWidth, alpha: 0.9 });

      const labels = this.cardLabels[i]!;
      labels.name.style.fill = m.available ? (isSelected ? 0xffffff : 0xfff066) : 0x6b7280;
      labels.sub.style.fill = isSelected ? 0xddddee : 0xaaaadd;
      labels.desc.style.fill = m.available ? 0xddddee : 0x6b7280;
    }
  }
}
