import { Container, Graphics, Text } from 'pixi.js';
import type { GameAudio } from './Audio.js';
import type { Input } from './Input.js';

const PANEL_W = 420;
const PANEL_H = 340;
const ROW_H = 44;
const ROW_TOP = 64;
const BAR_W = 220;
const BAR_H = 14;
const VOL_STEP = 0.05;

type RowKey = 'master' | 'bgm' | 'sfx' | 'mute';

const ROWS: readonly RowKey[] = ['master', 'bgm', 'sfx', 'mute'];

const ROW_LABELS: Record<RowKey, string> = {
  master: 'Master',
  bgm: 'BGM',
  sfx: 'SFX',
  mute: 'Mute',
};

export class SettingsMenu {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private rowsGfx: Graphics;
  private rowLabels: Text[] = [];
  private rowValues: Text[] = [];
  private hint: Text;
  private selectedIdx = 0;
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
      text: 'AUDIO SETTINGS',
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xfff066,
        fontWeight: 'bold',
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.x = gameW / 2;
    this.title.y = this.panelY + 20;
    this.container.addChild(this.title);

    this.rowsGfx = new Graphics();
    this.rowsGfx.x = this.panelX;
    this.rowsGfx.y = this.panelY;
    this.container.addChild(this.rowsGfx);

    for (let i = 0; i < ROWS.length; i++) {
      const key = ROWS[i]!;
      const lbl = new Text({
        text: ROW_LABELS[key],
        style: { fontFamily: 'monospace', fontSize: 14, fill: 0xeeeeee, fontWeight: 'bold' },
      });
      lbl.x = this.panelX + 28;
      lbl.y = this.panelY + ROW_TOP + i * ROW_H + 8;
      this.container.addChild(lbl);
      this.rowLabels.push(lbl);

      const val = new Text({
        text: '',
        style: { fontFamily: 'monospace', fontSize: 13, fill: 0xddddee },
      });
      val.anchor.set(1, 0);
      val.x = this.panelX + PANEL_W - 28;
      val.y = this.panelY + ROW_TOP + i * ROW_H + 10;
      this.container.addChild(val);
      this.rowValues.push(val);
    }

    this.hint = new Text({
      text: '↑↓ select  ←→ adjust  M mute toggle  O / Esc close',
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

  show() {
    this.container.visible = true;
    this.selectedIdx = 0;
  }

  hide() {
    this.container.visible = false;
  }

  toggle() {
    if (this.container.visible) this.hide();
    else this.show();
  }

  update(audio: GameAudio, input: Input) {
    if (!this.container.visible) return;

    if (input.justPressed('up')) {
      this.selectedIdx = (this.selectedIdx - 1 + ROWS.length) % ROWS.length;
    }
    if (input.justPressed('down')) {
      this.selectedIdx = (this.selectedIdx + 1) % ROWS.length;
    }

    const key = ROWS[this.selectedIdx]!;
    const left = input.justPressed('left');
    const right = input.justPressed('right');

    if (left || right) {
      const dir = right ? 1 : -1;
      switch (key) {
        case 'master':
          audio.setMasterVolume(audio.getMasterVolume() + dir * VOL_STEP);
          break;
        case 'bgm':
          audio.setBgmVolume(audio.getBgmVolume() + dir * VOL_STEP);
          break;
        case 'sfx':
          audio.setSfxVolume(audio.getSfxVolume() + dir * VOL_STEP);
          break;
        case 'mute':
          audio.setMuted(!audio.isMuted());
          break;
      }
    }

    this.redraw(audio);
  }

  private redraw(audio: GameAudio) {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 14)
      .fill({ color: 0x101820, alpha: 0.96 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });

    this.rowsGfx.clear();

    const values: Record<RowKey, number> = {
      master: audio.getMasterVolume(),
      bgm: audio.getBgmVolume(),
      sfx: audio.getSfxVolume(),
      mute: audio.isMuted() ? 1 : 0,
    };

    for (let i = 0; i < ROWS.length; i++) {
      const key = ROWS[i]!;
      const isSelected = i === this.selectedIdx;
      const y = ROW_TOP + i * ROW_H;

      if (isSelected) {
        this.rowsGfx
          .roundRect(16, y, PANEL_W - 32, ROW_H - 8, 6)
          .fill({ color: 0x223355, alpha: 0.9 })
          .stroke({ color: 0xfff066, width: 2, alpha: 0.9 });
      } else {
        this.rowsGfx
          .roundRect(16, y, PANEL_W - 32, ROW_H - 8, 6)
          .fill({ color: 0x1a1f2e, alpha: 0.6 });
      }

      const lbl = this.rowLabels[i];
      const val = this.rowValues[i];
      if (lbl) lbl.style.fill = isSelected ? 0xffffff : 0xddddee;

      if (key === 'mute') {
        if (val) {
          val.text = audio.isMuted() ? 'ON' : 'off';
          val.style.fill = audio.isMuted() ? 0xff5544 : 0x8899aa;
        }
      } else {
        const v = values[key];
        const barX = PANEL_W - 28 - 70 - BAR_W;
        const barY = y + (ROW_H - 8) / 2 - BAR_H / 2;
        this.rowsGfx
          .rect(barX, barY, BAR_W, BAR_H)
          .fill({ color: 0x222233, alpha: 0.9 })
          .stroke({ color: 0x6b7280, width: 1, alpha: 0.7 });
        if (v > 0) {
          this.rowsGfx
            .rect(barX, barY, BAR_W * v, BAR_H)
            .fill({ color: isSelected ? 0xfff066 : 0x88aaff, alpha: 0.9 });
        }
        if (val) {
          val.text = `${Math.round(v * 100)}%`;
          val.style.fill = isSelected ? 0xfff066 : 0xddddee;
        }
      }
    }
  }
}
