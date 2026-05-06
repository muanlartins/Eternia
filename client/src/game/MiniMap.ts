import { Container, Graphics, Text } from 'pixi.js';

interface StageEntry {
  readonly id: string;
  readonly name: string;
}

const PANEL_W = 360;
const PANEL_H = 220;
const ROW_H = 36;

export class MiniMap {
  readonly container = new Container();
  private bg: Graphics;
  private rows: Graphics;
  private rowLabels: Text[] = [];
  private title: Text;
  private hint: Text;
  private currentIdx = 0;
  private stages: readonly StageEntry[] = [];

  constructor(gameW: number, gameH: number) {
    this.bg = new Graphics();
    this.bg.x = (gameW - PANEL_W) / 2;
    this.bg.y = (gameH - PANEL_H) / 2;
    this.container.addChild(this.bg);

    this.title = new Text({
      text: 'STAGES',
      style: {
        fontFamily: 'monospace',
        fontSize: 18,
        fill: 0xfff066,
        fontWeight: 'bold',
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.x = gameW / 2;
    this.title.y = (gameH - PANEL_H) / 2 + 14;
    this.container.addChild(this.title);

    this.rows = new Graphics();
    this.rows.x = (gameW - PANEL_W) / 2;
    this.rows.y = (gameH - PANEL_H) / 2 + 50;
    this.container.addChild(this.rows);

    this.hint = new Text({
      text: 'release Tab to close',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xaaaadd },
    });
    this.hint.anchor.set(0.5, 0);
    this.hint.x = gameW / 2;
    this.hint.y = (gameH - PANEL_H) / 2 + PANEL_H - 22;
    this.container.addChild(this.hint);

    this.container.visible = false;
  }

  setStages(stages: readonly StageEntry[]) {
    this.stages = stages;
    for (const t of this.rowLabels) {
      this.container.removeChild(t);
      t.destroy();
    }
    this.rowLabels = [];

    const baseX = this.rows.x + 70;
    const baseY = this.rows.y + 6;
    for (let i = 0; i < stages.length; i++) {
      const lbl = new Text({
        text: '',
        style: { fontFamily: 'monospace', fontSize: 13, fill: 0xeeeeee },
      });
      lbl.x = baseX;
      lbl.y = baseY + i * ROW_H;
      this.container.addChild(lbl);
      this.rowLabels.push(lbl);
    }
  }

  show(currentIdx: number) {
    this.currentIdx = currentIdx;
    this.redraw();
    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
  }

  private redraw() {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 14)
      .fill({ color: 0x101820, alpha: 0.95 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });

    this.rows.clear();
    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i]!;
      const isCurrent = i === this.currentIdx;
      const isPast = i < this.currentIdx;
      const y = i * ROW_H;

      const fillColor = isCurrent ? 0x4a8eff : isPast ? 0x666677 : 0x222233;
      const fillAlpha = isCurrent ? 0.9 : isPast ? 0.7 : 0.5;
      this.rows
        .roundRect(20, y, PANEL_W - 40, ROW_H - 8, 6)
        .fill({ color: fillColor, alpha: fillAlpha })
        .stroke({ color: isCurrent ? 0xfff066 : 0x6b7280, width: 1, alpha: 0.85 });

      const numText = `${i + 1}`;
      this.rows
        .circle(48, y + (ROW_H - 8) / 2, 12)
        .fill({ color: isCurrent ? 0xfff066 : 0x444455, alpha: 0.95 });

      const lbl = this.rowLabels[i];
      if (lbl) {
        lbl.text = `${numText}.  ${stage.name}`;
        lbl.style.fill = isCurrent ? 0xffffff : isPast ? 0xaaaaaa : 0x666677;
      }
    }
  }
}
