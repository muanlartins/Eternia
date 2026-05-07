import { Container, Graphics, Text } from 'pixi.js';
import type { GameAudio } from './Audio.js';
import type { Input } from './Input.js';
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardMetric } from './Auth.js';
import { formatTime } from './Records.js';

type View = 'root' | 'audio' | 'leaderboard';

type RootKey = 'leaderboard' | 'audio' | 'logout';
const ROOT_AUTHED: readonly RootKey[] = ['leaderboard', 'audio', 'logout'];
const ROOT_GUEST: readonly RootKey[] = ['leaderboard', 'audio'];
const ROOT_LABELS: Record<RootKey, string> = {
  leaderboard: 'Leaderboard',
  audio: 'Sound',
  logout: 'Logout',
};

type AudioRowKey = 'master' | 'bgm' | 'sfx' | 'mute';
const AUDIO_ROWS: readonly AudioRowKey[] = ['master', 'bgm', 'sfx', 'mute'];
const AUDIO_LABELS: Record<AudioRowKey, string> = {
  master: 'Master',
  bgm: 'BGM',
  sfx: 'SFX',
  mute: 'Mute',
};

const METRICS: readonly LeaderboardMetric[] = ['time', 'damage', 'deaths'];
const METRIC_TITLES: Record<LeaderboardMetric, string> = {
  time: 'FASTEST TIME',
  damage: 'MOST DAMAGE',
  deaths: 'FEWEST DEATHS',
};

const PANEL_W = 540;
const PANEL_H = 420;
const VOL_STEP = 0.05;

export interface MenuContext {
  username: string | null;
  onLogout: () => void;
}

export class MenuScreen {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private body: Text;
  private hint: Text;
  private statusText: Text;
  private highlightGfx: Graphics;

  private view: View = 'root';
  private rootIdx = 0;
  private audioIdx = 0;
  private metricIdx = 0;
  private lbEntries: readonly LeaderboardEntry[] = [];
  private lbState: 'idle' | 'loading' | 'loaded' = 'idle';
  private lbReqToken = 0;

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
      text: 'MENU',
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xfff066,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.title.anchor.set(0.5, 0);
    this.title.x = gameW / 2;
    this.title.y = this.panelY + 18;
    this.container.addChild(this.title);

    this.highlightGfx = new Graphics();
    this.highlightGfx.x = this.panelX;
    this.highlightGfx.y = this.panelY;
    this.container.addChild(this.highlightGfx);

    this.body = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0xddddee,
        lineHeight: 24,
      },
    });
    this.body.x = this.panelX + 32;
    this.body.y = this.panelY + 64;
    this.container.addChild(this.body);

    this.statusText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 12, fill: 0xaaaadd },
    });
    this.statusText.x = this.panelX + 32;
    this.statusText.y = this.panelY + PANEL_H - 56;
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

  open() {
    this.view = 'root';
    this.rootIdx = 0;
    this.container.visible = true;
  }

  close() {
    this.container.visible = false;
  }

  update(audio: GameAudio, input: Input, ctx: MenuContext) {
    if (!this.container.visible) return;

    if (input.justPressed('options')) {
      if (this.view === 'root') {
        this.close();
        return;
      }
      this.view = 'root';
      this.rootIdx = 0;
      this.redraw(audio, ctx);
      return;
    }

    if (this.view === 'root') {
      this.handleRoot(input, ctx);
    } else if (this.view === 'audio') {
      this.handleAudio(audio, input);
    } else if (this.view === 'leaderboard') {
      this.handleLeaderboard(input);
    }

    this.redraw(audio, ctx);
  }

  private rootItems(ctx: MenuContext): readonly RootKey[] {
    return ctx.username ? ROOT_AUTHED : ROOT_GUEST;
  }

  private handleRoot(input: Input, ctx: MenuContext) {
    const items = this.rootItems(ctx);
    if (input.justPressed('up')) {
      this.rootIdx = (this.rootIdx - 1 + items.length) % items.length;
    } else if (input.justPressed('down')) {
      this.rootIdx = (this.rootIdx + 1) % items.length;
    } else if (input.justPressed('confirm') || input.justPressed('right')) {
      const key = items[this.rootIdx];
      if (key === 'leaderboard') {
        this.view = 'leaderboard';
        this.metricIdx = 0;
        this.requestLeaderboard();
      } else if (key === 'audio') {
        this.view = 'audio';
        this.audioIdx = 0;
      } else if (key === 'logout') {
        ctx.onLogout();
        this.close();
      }
    }
  }

  private handleAudio(audio: GameAudio, input: Input) {
    if (input.justPressed('up')) {
      this.audioIdx = (this.audioIdx - 1 + AUDIO_ROWS.length) % AUDIO_ROWS.length;
      return;
    }
    if (input.justPressed('down')) {
      this.audioIdx = (this.audioIdx + 1) % AUDIO_ROWS.length;
      return;
    }
    const left = input.justPressed('left');
    const right = input.justPressed('right');
    const confirm = input.justPressed('confirm');
    if (!left && !right && !confirm) return;
    const key = AUDIO_ROWS[this.audioIdx];
    const dir = right || confirm ? 1 : -1;
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

  private handleLeaderboard(input: Input) {
    if (input.justPressed('left')) {
      this.metricIdx = (this.metricIdx - 1 + METRICS.length) % METRICS.length;
      this.requestLeaderboard();
    } else if (input.justPressed('right')) {
      this.metricIdx = (this.metricIdx + 1) % METRICS.length;
      this.requestLeaderboard();
    }
  }

  private requestLeaderboard() {
    const metric = METRICS[this.metricIdx]!;
    this.lbState = 'loading';
    this.lbEntries = [];
    const token = ++this.lbReqToken;
    void fetchLeaderboard(metric, 10).then((entries) => {
      if (token !== this.lbReqToken) return; // stale request
      this.lbEntries = entries;
      this.lbState = 'loaded';
    });
  }

  private redraw(audio: GameAudio, ctx: MenuContext) {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 14)
      .fill({ color: 0x101820, alpha: 0.96 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.95 });

    this.highlightGfx.clear();

    if (this.view === 'root') {
      this.title.text = 'MENU';
      this.renderRoot(ctx);
      this.hint.text = '↑↓ select  ENTER open  ESC close';
      this.statusText.text = ctx.username ? `signed in as @${ctx.username}` : 'playing as guest';
    } else if (this.view === 'audio') {
      this.title.text = 'MENU › Sound';
      this.renderAudio(audio);
      this.hint.text = '↑↓ select  ←→ adjust  ESC back';
      this.statusText.text = '';
    } else {
      this.title.text = 'MENU › Leaderboard';
      this.renderLeaderboard(ctx);
      this.hint.text = '←→ switch metric  ESC back';
      this.statusText.text = '';
    }
  }

  private renderRoot(ctx: MenuContext) {
    const items = this.rootItems(ctx);
    const lines: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const key = items[i]!;
      const marker = i === this.rootIdx ? '>' : ' ';
      lines.push(`  ${marker} ${ROOT_LABELS[key]}`);
    }
    this.body.text = lines.join('\n');

    const rowH = 24;
    const y = 64 + this.rootIdx * rowH - 4;
    this.highlightGfx
      .roundRect(20, y, PANEL_W - 40, rowH + 2, 4)
      .fill({ color: 0x223355, alpha: 0.85 })
      .stroke({ color: 0xfff066, width: 1.5, alpha: 0.85 });
  }

  private renderAudio(audio: GameAudio) {
    const rowH = 24;
    const selY = 64 + this.audioIdx * rowH - 4;
    this.highlightGfx
      .roundRect(20, selY, PANEL_W - 40, rowH + 2, 4)
      .fill({ color: 0x223355, alpha: 0.85 })
      .stroke({ color: 0xfff066, width: 1.5, alpha: 0.85 });

    const lines: string[] = [];
    for (let i = 0; i < AUDIO_ROWS.length; i++) {
      const key = AUDIO_ROWS[i]!;
      const marker = i === this.audioIdx ? '>' : ' ';
      const label = `${marker} ${AUDIO_LABELS[key].padEnd(8, ' ')}`;
      let suffix: string;
      if (key === 'mute') {
        suffix = audio.isMuted() ? '       [ ON ]' : '       [ off ]';
      } else {
        const v =
          key === 'master'
            ? audio.getMasterVolume()
            : key === 'bgm'
              ? audio.getBgmVolume()
              : audio.getSfxVolume();
        const filled = Math.round(v * 12);
        const bar = '●'.repeat(filled) + '·'.repeat(12 - filled);
        const pct = `${Math.round(v * 100).toString().padStart(3, ' ')}%`;
        suffix = `[${bar}]  ${pct}`;
      }
      lines.push(`${label}${suffix}`);
    }
    this.body.text = lines.join('\n');
  }

  private renderLeaderboard(ctx: MenuContext) {
    const metric = METRICS[this.metricIdx]!;
    const tabs = METRICS.map((m, i) => {
      const label = METRIC_TITLES[m];
      return i === this.metricIdx ? `[ ${label} ]` : `  ${label}  `;
    }).join('  ');

    let body: string;
    if (this.lbState === 'loading') {
      body = '  loading…';
    } else if (this.lbEntries.length === 0) {
      body = '  no runs yet — be the first!';
    } else {
      body = this.lbEntries
        .slice(0, 10)
        .map((e, i) => {
          const isMe =
            ctx.username !== null && e.username.toLowerCase() === ctx.username.toLowerCase();
          const marker = isMe ? '>' : ' ';
          const rank = `${i + 1}.`.padEnd(4, ' ');
          const name = e.username.padEnd(14, ' ');
          let metricStr: string;
          if (metric === 'time') {
            metricStr = formatTime(e.durationMs);
          } else if (metric === 'damage') {
            metricStr = `${e.damageDealt} dmg`;
          } else {
            metricStr = e.deaths === 1 ? '1 death' : `${e.deaths} deaths`;
          }
          return `  ${marker} ${rank}${name}${metricStr}`;
        })
        .join('\n');
    }
    this.body.text = `${tabs}\n\n${body}`;
  }
}
