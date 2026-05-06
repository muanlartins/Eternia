import { Container, Graphics, Text } from 'pixi.js';

const PANEL_W = 480;
const PANEL_H = 280;
const MAX_USERNAME_LEN = 16;

type Submit = (username: string) => void | Promise<void>;
type Guest = () => void;

export class LoginScreen {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private prompt: Text;
  private inputBox: Graphics;
  private inputText: Text;
  private hint: Text;
  private statusText: Text;
  private username = '';
  private busy = false;
  private onSubmit: Submit | null = null;
  private onGuest: Guest | null = null;
  private readonly panelX: number;
  private readonly panelY: number;
  private cursorBlinkMs = 0;

  constructor(gameW: number, gameH: number) {
    this.panelX = (gameW - PANEL_W) / 2;
    this.panelY = (gameH - PANEL_H) / 2;

    this.bg = new Graphics();
    this.bg.x = this.panelX;
    this.bg.y = this.panelY;
    this.container.addChild(this.bg);

    this.title = new Text({
      text: 'ETERNIA',
      style: {
        fontFamily: 'monospace',
        fontSize: 32,
        fill: 0xfff066,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 },
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.x = gameW / 2;
    this.title.y = this.panelY + 28;
    this.container.addChild(this.title);

    this.prompt = new Text({
      text: 'enter your name',
      style: { fontFamily: 'monospace', fontSize: 13, fill: 0xddddee },
    });
    this.prompt.anchor.set(0.5, 0);
    this.prompt.x = gameW / 2;
    this.prompt.y = this.panelY + 90;
    this.container.addChild(this.prompt);

    this.inputBox = new Graphics();
    this.inputBox.x = this.panelX + 60;
    this.inputBox.y = this.panelY + 120;
    this.container.addChild(this.inputBox);

    this.inputText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 22,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.inputText.x = this.panelX + 76;
    this.inputText.y = this.panelY + 130;
    this.container.addChild(this.inputText);

    this.statusText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 12, fill: 0xff7777 },
    });
    this.statusText.anchor.set(0.5, 0);
    this.statusText.x = gameW / 2;
    this.statusText.y = this.panelY + 180;
    this.container.addChild(this.statusText);

    this.hint = new Text({
      text: 'ENTER login  ·  ESC play as guest',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xaaaadd },
    });
    this.hint.anchor.set(0.5, 0);
    this.hint.x = gameW / 2;
    this.hint.y = this.panelY + PANEL_H - 30;
    this.container.addChild(this.hint);

    this.container.visible = false;
    this.redraw();
  }

  isOpen(): boolean {
    return this.container.visible;
  }

  show(opts: { onSubmit: Submit; onGuest: Guest; defaultUsername?: string }) {
    this.username = opts.defaultUsername ?? '';
    this.onSubmit = opts.onSubmit;
    this.onGuest = opts.onGuest;
    this.statusText.text = '';
    this.busy = false;
    this.container.visible = true;
    window.addEventListener('keydown', this.handleKeyDown);
    this.redraw();
  }

  hide() {
    this.container.visible = false;
    this.onSubmit = null;
    this.onGuest = null;
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  tick(dtMs: number) {
    if (!this.container.visible) return;
    this.cursorBlinkMs = (this.cursorBlinkMs + dtMs) % 1000;
    this.redrawInput();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.busy) {
      e.preventDefault();
      return;
    }
    if (e.code === 'Enter') {
      const u = this.username.trim();
      if (u.length === 0) {
        this.statusText.text = 'name required';
        return;
      }
      this.busy = true;
      this.statusText.text = 'logging in…';
      this.statusText.style.fill = 0xddddee;
      this.redraw();
      const cb = this.onSubmit;
      if (cb) {
        Promise.resolve(cb(u))
          .catch((err: unknown) => {
            this.busy = false;
            this.statusText.text = err instanceof Error ? err.message : 'login failed';
            this.statusText.style.fill = 0xff7777;
            this.redraw();
          });
      }
    } else if (e.code === 'Escape') {
      const cb = this.onGuest;
      if (cb) cb();
    } else if (e.code === 'Backspace') {
      this.username = this.username.slice(0, -1);
      this.redrawInput();
    } else if (e.key.length === 1 && /^[a-zA-Z0-9_-]$/.test(e.key)) {
      if (this.username.length < MAX_USERNAME_LEN) {
        this.username += e.key;
        this.redrawInput();
      }
    }
    e.preventDefault();
  };

  setError(msg: string) {
    this.busy = false;
    this.statusText.text = msg;
    this.statusText.style.fill = 0xff7777;
    this.redraw();
  }

  private redraw() {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 14)
      .fill({ color: 0x0d1018, alpha: 0.96 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });
    this.redrawInput();
  }

  private redrawInput() {
    this.inputBox.clear();
    this.inputBox
      .roundRect(0, 0, PANEL_W - 120, 36, 6)
      .fill({ color: 0x1a1f2e, alpha: 0.95 })
      .stroke({ color: 0x88aaff, width: 2, alpha: 0.85 });
    const showCursor = this.cursorBlinkMs < 500 && !this.busy;
    this.inputText.text = this.username + (showCursor ? '_' : ' ');
  }
}
