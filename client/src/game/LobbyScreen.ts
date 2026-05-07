import { Container, Graphics, Text } from 'pixi.js';
import type { Input } from './Input.js';

const PANEL_W = 520;
const PANEL_H = 360;
const MAX_CODE_LEN = 6;

type LobbyView = 'menu' | 'codeInput';

const ROW_KEYS = ['solo', 'createPublic', 'joinByCode'] as const;
type RowKey = (typeof ROW_KEYS)[number];
const ROW_LABELS: Record<RowKey, string> = {
  solo: 'Solo Run',
  createPublic: 'Create Public Room',
  joinByCode: 'Join Room by Code',
};
const ROW_DESC: Record<RowKey, string> = {
  solo: 'Play alone — server still tracks the room privately.',
  createPublic: 'Create a public room. Friends with the code can join.',
  joinByCode: 'Enter a 6-letter code to join an existing room.',
};

export class LobbyScreen {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private rowsGfx: Graphics;
  private rowLabels: Text[] = [];
  private detailDesc: Text;
  private hint: Text;
  private codePromptText: Text;
  private codeBox: Graphics;
  private codeText: Text;
  private codeError: Text;

  private view: LobbyView = 'menu';
  private selectedIdx = 0;
  private codeInput = '';
  private cursorBlinkMs = 0;
  private busy = false;

  private onSolo: (() => void) | null = null;
  private onCreatePublic: (() => void) | null = null;
  private onJoinByCode: ((code: string) => Promise<{ ok: true } | { ok: false; error: string }>) | null = null;

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
      text: 'LOBBY',
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

    this.rowsGfx = new Graphics();
    this.rowsGfx.x = this.panelX;
    this.rowsGfx.y = this.panelY;
    this.container.addChild(this.rowsGfx);

    for (let i = 0; i < ROW_KEYS.length; i++) {
      const key = ROW_KEYS[i]!;
      const lbl = new Text({
        text: ROW_LABELS[key],
        style: {
          fontFamily: 'monospace',
          fontSize: 16,
          fill: 0xeeeeee,
          fontWeight: 'bold',
        },
      });
      lbl.x = this.panelX + 36;
      lbl.y = this.panelY + 80 + i * 38;
      this.container.addChild(lbl);
      this.rowLabels.push(lbl);
    }

    this.detailDesc = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0xaaaadd,
        wordWrap: true,
        wordWrapWidth: PANEL_W - 80,
        align: 'center',
      },
    });
    this.detailDesc.anchor.set(0.5, 0);
    this.detailDesc.x = gameW / 2;
    this.detailDesc.y = this.panelY + 220;
    this.container.addChild(this.detailDesc);

    this.codePromptText = new Text({
      text: 'enter room code',
      style: { fontFamily: 'monospace', fontSize: 14, fill: 0xddddee },
    });
    this.codePromptText.anchor.set(0.5, 0);
    this.codePromptText.x = gameW / 2;
    this.codePromptText.y = this.panelY + 100;
    this.codePromptText.visible = false;
    this.container.addChild(this.codePromptText);

    this.codeBox = new Graphics();
    this.codeBox.x = this.panelX + 100;
    this.codeBox.y = this.panelY + 130;
    this.codeBox.visible = false;
    this.container.addChild(this.codeBox);

    this.codeText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 28,
        fill: 0xffffff,
        fontWeight: 'bold',
        letterSpacing: 6,
      },
    });
    this.codeText.anchor.set(0.5, 0.5);
    this.codeText.x = gameW / 2;
    this.codeText.y = this.panelY + 156;
    this.codeText.visible = false;
    this.container.addChild(this.codeText);

    this.codeError = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 12, fill: 0xff7777 },
    });
    this.codeError.anchor.set(0.5, 0);
    this.codeError.x = gameW / 2;
    this.codeError.y = this.panelY + 200;
    this.codeError.visible = false;
    this.container.addChild(this.codeError);

    this.hint = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xaaaadd },
    });
    this.hint.anchor.set(0.5, 0);
    this.hint.x = gameW / 2;
    this.hint.y = this.panelY + PANEL_H - 28;
    this.container.addChild(this.hint);

    this.container.visible = false;
  }

  isOpen(): boolean {
    return this.container.visible;
  }

  show(opts: {
    onSolo: () => void;
    onCreatePublic: () => void;
    onJoinByCode: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  }) {
    this.onSolo = opts.onSolo;
    this.onCreatePublic = opts.onCreatePublic;
    this.onJoinByCode = opts.onJoinByCode;
    this.view = 'menu';
    this.selectedIdx = 0;
    this.codeInput = '';
    this.busy = false;
    this.container.visible = true;
    this.redraw();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  hide() {
    this.container.visible = false;
    this.onSolo = null;
    this.onCreatePublic = null;
    this.onJoinByCode = null;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  tick(dtMs: number) {
    if (!this.container.visible) return;
    if (this.view === 'codeInput') {
      this.cursorBlinkMs = (this.cursorBlinkMs + dtMs) % 1000;
      this.redrawCode();
    }
  }

  update(input: Input) {
    if (!this.container.visible) return;
    if (this.view === 'menu') {
      if (input.justPressed('up')) {
        this.selectedIdx = (this.selectedIdx - 1 + ROW_KEYS.length) % ROW_KEYS.length;
        this.redraw();
      } else if (input.justPressed('down')) {
        this.selectedIdx = (this.selectedIdx + 1) % ROW_KEYS.length;
        this.redraw();
      } else if (input.justPressed('confirm')) {
        const key = ROW_KEYS[this.selectedIdx]!;
        if (key === 'solo') this.onSolo?.();
        else if (key === 'createPublic') this.onCreatePublic?.();
        else if (key === 'joinByCode') this.enterCodeMode();
      }
    }
    // codeInput mode: keypress handler covers it (handleKeyDown).
  }

  private enterCodeMode() {
    this.view = 'codeInput';
    this.codeInput = '';
    this.busy = false;
    this.redraw();
  }

  private async submitCode() {
    if (this.codeInput.length !== MAX_CODE_LEN || !this.onJoinByCode || this.busy) return;
    this.busy = true;
    this.codeError.text = 'joining…';
    this.codeError.style.fill = 0xddddee;
    this.codeError.visible = true;
    const result = await this.onJoinByCode(this.codeInput);
    if (!result.ok) {
      this.busy = false;
      this.codeError.text = result.error;
      this.codeError.style.fill = 0xff7777;
    }
    // on success: parent hides the lobby screen
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.view !== 'codeInput') return;
    if (this.busy) {
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape') {
      this.view = 'menu';
      this.codeError.visible = false;
      this.redraw();
    } else if (e.code === 'Enter') {
      void this.submitCode();
    } else if (e.code === 'Backspace') {
      this.codeInput = this.codeInput.slice(0, -1);
      this.codeError.visible = false;
      this.redrawCode();
    } else if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
      if (this.codeInput.length < MAX_CODE_LEN) {
        this.codeInput += e.key.toUpperCase();
        this.codeError.visible = false;
        this.redrawCode();
      }
    }
    e.preventDefault();
  };

  private redraw() {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 16)
      .fill({ color: 0x101820, alpha: 0.96 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });

    this.rowsGfx.clear();

    if (this.view === 'menu') {
      this.codePromptText.visible = false;
      this.codeBox.visible = false;
      this.codeText.visible = false;
      this.codeError.visible = false;
      for (let i = 0; i < ROW_KEYS.length; i++) {
        const isSel = i === this.selectedIdx;
        const y = 70 + i * 38;
        if (isSel) {
          this.rowsGfx
            .roundRect(20, y, PANEL_W - 40, 32, 6)
            .fill({ color: 0x223355, alpha: 0.9 })
            .stroke({ color: 0xfff066, width: 2, alpha: 0.9 });
        }
        const lbl = this.rowLabels[i];
        if (lbl) {
          lbl.style.fill = isSel ? 0xffffff : 0xeeeeee;
          lbl.visible = true;
        }
      }
      const sel = ROW_KEYS[this.selectedIdx]!;
      this.detailDesc.text = ROW_DESC[sel];
      this.detailDesc.visible = true;
      this.hint.text = '↑↓ select  ENTER confirm';
    } else {
      this.codePromptText.visible = true;
      this.codeBox.visible = true;
      this.codeText.visible = true;
      this.detailDesc.visible = false;
      for (const lbl of this.rowLabels) lbl.visible = false;
      this.hint.text = 'type 6-letter code  ENTER join  ESC back';
      this.redrawCode();
    }
  }

  private redrawCode() {
    this.codeBox.clear();
    this.codeBox
      .roundRect(0, 0, PANEL_W - 200, 52, 8)
      .fill({ color: 0x1a1f2e, alpha: 0.95 })
      .stroke({ color: 0x88aaff, width: 2, alpha: 0.85 });
    const showCursor = this.cursorBlinkMs < 500 && !this.busy;
    const placeholder = '_'.repeat(MAX_CODE_LEN - this.codeInput.length);
    let text = this.codeInput + placeholder;
    if (this.codeInput.length < MAX_CODE_LEN && showCursor) {
      // mark current slot
      const idx = this.codeInput.length;
      text = text.slice(0, idx) + (text[idx] === '_' ? '|' : text[idx]) + text.slice(idx + 1);
    }
    this.codeText.text = text;
  }
}
