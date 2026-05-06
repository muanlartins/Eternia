import { Container, Graphics, Text } from 'pixi.js';
import { formatTime, type NewRecordFlags, type PersonalRecords } from './Records.js';

export interface RunStatsView {
  durationMs: number;
  damageDealt: number;
  damageTaken: number;
  killCounts: Record<string, { name: string; count: number }>;
  buffsPicked: readonly string[];
  deaths: number;
  records: PersonalRecords;
  flags: NewRecordFlags;
}

const PANEL_W = 520;
const PANEL_H = 480;

export class VictoryStats {
  readonly container = new Container();
  private bg: Graphics;
  private title: Text;
  private body: Text;
  private hint: Text;

  constructor(gameW: number, gameH: number) {
    this.bg = new Graphics();
    this.bg.x = (gameW - PANEL_W) / 2;
    this.bg.y = (gameH - PANEL_H) / 2;
    this.container.addChild(this.bg);

    this.title = new Text({
      text: 'RUN COMPLETE',
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
    this.title.y = (gameH - PANEL_H) / 2 + 24;
    this.container.addChild(this.title);

    this.body = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0xddddee,
        lineHeight: 22,
      },
    });
    this.body.x = (gameW - PANEL_W) / 2 + 32;
    this.body.y = (gameH - PANEL_H) / 2 + 80;
    this.container.addChild(this.body);

    this.hint = new Text({
      text: 'press any key to start a new run',
      style: { fontFamily: 'monospace', fontSize: 12, fill: 0xaaaadd },
    });
    this.hint.anchor.set(0.5, 0);
    this.hint.x = gameW / 2;
    this.hint.y = (gameH - PANEL_H) / 2 + PANEL_H - 32;
    this.container.addChild(this.hint);

    this.container.visible = false;
  }

  show(stats: RunStatsView) {
    const newAny = stats.flags.newBestTime || stats.flags.newBestDamage || stats.flags.newFewestDeaths;
    const borderColor = newAny ? 0xff9933 : 0xfff066;

    this.bg.clear();
    this.bg
      .roundRect(0, 0, PANEL_W, PANEL_H, 16)
      .fill({ color: 0x101820, alpha: 0.95 })
      .stroke({ color: borderColor, width: 4, alpha: 0.95 });

    this.title.text = newAny ? 'RUN COMPLETE  ★' : 'RUN COMPLETE';
    this.title.style.fill = newAny ? 0xff9933 : 0xfff066;

    const timeStr = formatTime(stats.durationMs);
    const bestTimeStr =
      stats.records.bestTimeMs !== null ? formatTime(stats.records.bestTimeMs) : '—';
    const bestDamageStr = stats.records.bestDamageDealt > 0 ? `${stats.records.bestDamageDealt}` : '—';
    const fewestDeathsStr =
      stats.records.fewestDeathsInVictory !== null ? `${stats.records.fewestDeathsInVictory}` : '—';

    const timeRecord = stats.flags.newBestTime ? '  ★ NEW BEST!' : `  best ${bestTimeStr}`;
    const damageRecord = stats.flags.newBestDamage ? '  ★ NEW BEST!' : `  best ${bestDamageStr}`;
    const deathsRecord = stats.flags.newFewestDeaths ? '  ★ NEW BEST!' : `  best ${fewestDeathsStr}`;

    const killLines = Object.values(stats.killCounts)
      .filter((k) => k.count > 0)
      .map((k) => `  ${k.name.padEnd(12, ' ')} ${k.count}`)
      .join('\n');

    const buffsLine =
      stats.buffsPicked.length === 0 ? '  (none)' : stats.buffsPicked.map((b) => `  ${b}`).join('\n');

    this.body.text =
      `Time:           ${timeStr.padEnd(8, ' ')}${timeRecord}\n` +
      `Damage Dealt:   ${stats.damageDealt.toString().padEnd(8, ' ')}${damageRecord}\n` +
      `Damage Taken:   ${stats.damageTaken}\n` +
      `Deaths:         ${stats.deaths.toString().padEnd(8, ' ')}${deathsRecord}\n` +
      `\n` +
      `Kills:\n${killLines || '  (none)'}\n` +
      `\n` +
      `Buffs:\n${buffsLine}\n` +
      `\n` +
      `Lifetime: ${stats.records.totalVictories} victories / ${stats.records.totalAttempts} attempts`;

    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
  }
}
