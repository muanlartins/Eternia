import { Container, Graphics, Text } from 'pixi.js';
import type { Input } from './Input.js';
import type { RoomMember } from './Network.js';

const PANEL_W = 560;
const PANEL_H = 480;

export class RoomLobby {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private codeText: Text;
  private subtitle: Text;
  private membersText: Text;
  private hint: Text;
  private statusText: Text;

  private code = '';
  private members: readonly RoomMember[] = [];
  private youUserId: number | null = null;
  private isHost = false;
  private allReady = false;
  private isReady = false;
  private status = 'waiting for players…';
  private onReadyToggle: (() => void) | null = null;
  private onStartMatch: (() => void) | null = null;
  private onLeave: (() => void) | null = null;
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
      text: 'ROOM',
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
    this.title.y = this.panelY + 18;
    this.container.addChild(this.title);

    this.codeText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 28,
        fill: 0xffffff,
        fontWeight: 'bold',
        letterSpacing: 6,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.codeText.anchor.set(0.5, 0);
    this.codeText.x = gameW / 2;
    this.codeText.y = this.panelY + 56;
    this.container.addChild(this.codeText);

    this.subtitle = new Text({
      text: 'share this code with friends to join',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xaaaadd },
    });
    this.subtitle.anchor.set(0.5, 0);
    this.subtitle.x = gameW / 2;
    this.subtitle.y = this.panelY + 100;
    this.container.addChild(this.subtitle);

    this.membersText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0xddddee,
        lineHeight: 24,
      },
    });
    this.membersText.x = this.panelX + 60;
    this.membersText.y = this.panelY + 138;
    this.container.addChild(this.membersText);

    this.statusText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 13, fill: 0xfff066 },
    });
    this.statusText.anchor.set(0.5, 0);
    this.statusText.x = gameW / 2;
    this.statusText.y = this.panelY + PANEL_H - 60;
    this.container.addChild(this.statusText);

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
    code: string;
    onReadyToggle: () => void;
    onStartMatch: () => void;
    onLeave: () => void;
    youUserId: number | null;
  }) {
    this.code = opts.code;
    this.onReadyToggle = opts.onReadyToggle;
    this.onStartMatch = opts.onStartMatch;
    this.onLeave = opts.onLeave;
    this.youUserId = opts.youUserId;
    this.members = [];
    this.isHost = false;
    this.allReady = false;
    this.isReady = false;
    this.container.visible = true;
    this.redraw();
  }

  hide() {
    this.container.visible = false;
    this.onReadyToggle = null;
    this.onStartMatch = null;
    this.onLeave = null;
  }

  applyStatus(members: readonly RoomMember[]) {
    this.members = members;
    if (this.youUserId !== null) {
      const me = members.find((m) => m.userId === this.youUserId);
      this.isHost = me?.isHost ?? false;
      this.isReady = me?.ready ?? false;
    }
    const others = members.filter((m) => m.userId !== this.youUserId);
    this.allReady = members.length > 1 && others.every((m) => m.ready);
    this.redraw();
  }

  update(input: Input) {
    if (!this.container.visible) return;
    if (input.justPressed('options')) {
      this.onLeave?.();
      return;
    }
    if (input.justPressed('confirm')) {
      if (this.isHost) {
        this.onStartMatch?.();
      } else {
        this.onReadyToggle?.();
      }
      return;
    }
    // Ready toggle on space too (alt key for hosts who want to ready themselves)
    if (input.justPressed('parry')) {
      this.onReadyToggle?.();
    }
  }

  private redraw() {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 16)
      .fill({ color: 0x101820, alpha: 0.96 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });

    this.codeText.text = this.code;

    const lines = this.members.map((m) => {
      const youMark = m.userId === this.youUserId ? ' (you)' : '';
      const hostMark = m.isHost ? '★ ' : '  ';
      const readyMark = m.ready ? '[ READY ]' : '[ ...   ]';
      return `${hostMark}${m.username.padEnd(16, ' ')}${readyMark}${youMark}`;
    });
    if (lines.length === 0) {
      lines.push('  (no players yet)');
    }
    this.membersText.text = lines.join('\n');

    if (this.isHost) {
      this.statusText.text = this.allReady
        ? 'all players ready — press ENTER to start match'
        : this.members.length < 2
          ? 'waiting for players to join…'
          : 'waiting for players to ready up…';
      this.statusText.style.fill = this.allReady ? 0x88ff88 : 0xfff066;
      this.hint.text = 'ENTER start match  ·  SPACE toggle ready  ·  ESC leave';
    } else {
      this.statusText.text = this.isReady ? 'you are READY — waiting for host to start' : 'press ENTER (or SPACE) to ready up';
      this.statusText.style.fill = this.isReady ? 0x88ff88 : 0xfff066;
      this.hint.text = 'ENTER toggle ready  ·  ESC leave';
    }
  }
}
