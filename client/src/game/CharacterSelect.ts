import { Container, Graphics, Text } from 'pixi.js';
import type { Input } from './Input.js';
import { CHARACTERS, type CharacterSpec } from '../data/characters.js';

const PANEL_W = 760;
const PANEL_H = 380;
const SLOT_W = 130;
const SLOT_H = 160;
const SLOT_GAP = 24;

export class CharacterSelect {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private slotsGfx: Graphics;
  private slotLabels: Text[] = [];
  private detailName: Text;
  private detailClass: Text;
  private detailDesc: Text;
  private hint: Text;

  private selectedIdx = 0;
  private onConfirm: ((char: CharacterSpec) => void) | null = null;
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
      text: 'CHARACTER',
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

    this.slotsGfx = new Graphics();
    this.slotsGfx.x = this.panelX;
    this.slotsGfx.y = this.panelY;
    this.container.addChild(this.slotsGfx);

    const slotsTotalW = CHARACTERS.length * SLOT_W + (CHARACTERS.length - 1) * SLOT_GAP;
    const slotsStartX = (PANEL_W - slotsTotalW) / 2;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const c = CHARACTERS[i]!;
      const x = this.panelX + slotsStartX + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
      const y = this.panelY + 70 + SLOT_H / 2;

      const lbl = new Text({
        text: c.available ? c.name : '?',
        style: {
          fontFamily: 'monospace',
          fontSize: 16,
          fill: c.available ? 0xeeeeee : 0x6b7280,
          fontWeight: 'bold',
        },
      });
      lbl.anchor.set(0.5, 0.5);
      lbl.x = x;
      lbl.y = y;
      this.container.addChild(lbl);
      this.slotLabels.push(lbl);
    }

    this.detailName = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 18,
        fill: 0xfff066,
        fontWeight: 'bold',
      },
    });
    this.detailName.anchor.set(0.5, 0);
    this.detailName.x = gameW / 2;
    this.detailName.y = this.panelY + 250;
    this.container.addChild(this.detailName);

    this.detailClass = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 12, fill: 0xaaaadd },
    });
    this.detailClass.anchor.set(0.5, 0);
    this.detailClass.x = gameW / 2;
    this.detailClass.y = this.panelY + 274;
    this.container.addChild(this.detailClass);

    this.detailDesc = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 13,
        fill: 0xddddee,
        wordWrap: true,
        wordWrapWidth: PANEL_W - 100,
        align: 'center',
      },
    });
    this.detailDesc.anchor.set(0.5, 0);
    this.detailDesc.x = gameW / 2;
    this.detailDesc.y = this.panelY + 296;
    this.container.addChild(this.detailDesc);

    this.hint = new Text({
      text: '←→ select  ENTER confirm',
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

  show(onConfirm: (char: CharacterSpec) => void) {
    this.selectedIdx = CHARACTERS.findIndex((c) => c.available);
    if (this.selectedIdx < 0) this.selectedIdx = 0;
    this.onConfirm = onConfirm;
    this.container.visible = true;
    this.redraw();
  }

  hide() {
    this.container.visible = false;
    this.onConfirm = null;
  }

  update(input: Input) {
    if (!this.container.visible) return;
    if (input.justPressed('left')) {
      this.selectedIdx = (this.selectedIdx - 1 + CHARACTERS.length) % CHARACTERS.length;
      this.redraw();
    } else if (input.justPressed('right')) {
      this.selectedIdx = (this.selectedIdx + 1) % CHARACTERS.length;
      this.redraw();
    } else if (input.justPressed('confirm')) {
      const c = CHARACTERS[this.selectedIdx]!;
      if (c.available && this.onConfirm) {
        const cb = this.onConfirm;
        cb(c);
      }
    }
  }

  private redraw() {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 16)
      .fill({ color: 0x101820, alpha: 0.96 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });

    this.slotsGfx.clear();
    const slotsTotalW = CHARACTERS.length * SLOT_W + (CHARACTERS.length - 1) * SLOT_GAP;
    const slotsStartX = (PANEL_W - slotsTotalW) / 2;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const c = CHARACTERS[i]!;
      const x = slotsStartX + i * (SLOT_W + SLOT_GAP);
      const y = 70;
      const isSelected = i === this.selectedIdx;
      const fillColor = c.available
        ? isSelected
          ? 0x223355
          : 0x182030
        : 0x111419;
      const strokeColor = isSelected ? 0xfff066 : c.available ? 0x88aaff : 0x3a4258;
      const strokeWidth = isSelected ? 3 : 1;
      this.slotsGfx
        .roundRect(x, y, SLOT_W, SLOT_H, 8)
        .fill({ color: fillColor, alpha: 0.95 })
        .stroke({ color: strokeColor, width: strokeWidth, alpha: 0.9 });

      // simple "portrait" placeholder — colored circle
      const portraitColor = c.available
        ? isSelected
          ? 0xfff066
          : 0x88aaff
        : 0x3a4258;
      this.slotsGfx
        .circle(x + SLOT_W / 2, y + SLOT_H / 2 - 12, 28)
        .fill({ color: portraitColor, alpha: c.available ? 0.85 : 0.4 });

      const lbl = this.slotLabels[i];
      if (lbl) {
        lbl.style.fill = isSelected ? 0xffffff : c.available ? 0xeeeeee : 0x6b7280;
      }
    }

    const sel = CHARACTERS[this.selectedIdx]!;
    this.detailName.text = sel.name;
    this.detailName.style.fill = sel.available ? 0xfff066 : 0x6b7280;
    this.detailClass.text = sel.className;
    this.detailDesc.text = sel.description;

    if (!sel.available) {
      this.hint.text = '← → select  (this character is locked)';
      this.hint.style.fill = 0x8888aa;
    } else {
      this.hint.text = '←→ select  ENTER confirm';
      this.hint.style.fill = 0xaaaadd;
    }
  }
}
