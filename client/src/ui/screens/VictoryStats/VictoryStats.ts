import styles from './VictoryStats.module.css';
import { formatTime, type NewRecordFlags, type PersonalRecords } from '../../../game/Records.js';
import type { LeaderboardEntry } from '../../../game/Auth.js';

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

export class VictoryStats {
  readonly element: HTMLElement;
  private lastStats: RunStatsView | null = null;
  private lastLeaderboard: readonly LeaderboardEntry[] = [];
  private lastUsername: string | null = null;
  private leaderboardLoaded = false;

  private titleEl: HTMLElement;
  private statsEl: HTMLElement;
  private killsEl: HTMLElement;
  private buffsEl: HTMLElement;
  private leaderboardEl: HTMLElement;
  private lifetimeEl: HTMLElement;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.motes}"></div>
      </div>

      <div class="${styles.panel}">
        <div class="${styles.panelCorner}"></div>

        <div class="${styles.panelHero}">
          <div class="${styles.eyebrow}">Travessia · Vitória</div>
          <h2 class="${styles.title}" data-title>Run Complete</h2>
          <p class="${styles.subtitle}">"As árvores guardam o nome dos viajantes que passaram."</p>
        </div>

        <div class="${styles.statsGrid}" data-stats></div>

        <div class="${styles.section}">
          <div class="${styles.sectionHead}">Inimigos abatidos</div>
          <div class="${styles.killsList}" data-kills></div>
        </div>

        <div class="${styles.section}">
          <div class="${styles.sectionHead}">Bênçãos coletadas</div>
          <div class="${styles.buffsList}" data-buffs></div>
        </div>

        <div class="${styles.section}">
          <div class="${styles.sectionHead}">Top global · Mais rápidos</div>
          <div class="${styles.leaderboard}" data-leaderboard></div>
        </div>

        <div class="${styles.lifetime}" data-lifetime>
          <span>Vitórias <span class="${styles.lifetimeValue}">0</span></span>
          <span>·</span>
          <span>Tentativas <span class="${styles.lifetimeValue}">0</span></span>
        </div>

        <div class="${styles.hint}">
          <span><span class="${styles.hintKey}">Qualquer tecla</span> · iniciar nova jornada</span>
        </div>
      </div>
    `;
    this.element = root;
    this.titleEl = root.querySelector('[data-title]')!;
    this.statsEl = root.querySelector('[data-stats]')!;
    this.killsEl = root.querySelector('[data-kills]')!;
    this.buffsEl = root.querySelector('[data-buffs]')!;
    this.leaderboardEl = root.querySelector('[data-leaderboard]')!;
    this.lifetimeEl = root.querySelector('[data-lifetime]')!;
  }

  show(stats: RunStatsView, currentUsername: string | null = null) {
    this.lastStats = stats;
    this.lastUsername = currentUsername;
    this.lastLeaderboard = [];
    this.leaderboardLoaded = false;
    this.render();
    this.element.dataset.visible = 'true';
  }

  hide() {
    this.element.dataset.visible = 'false';
  }

  isVisible(): boolean {
    return this.element.dataset.visible === 'true';
  }

  setLeaderboard(leaderboard: readonly LeaderboardEntry[], currentUsername: string | null) {
    this.lastLeaderboard = leaderboard;
    this.lastUsername = currentUsername;
    this.leaderboardLoaded = true;
    if (this.lastStats) this.render();
  }

  private render() {
    const stats = this.lastStats;
    if (!stats) return;
    const newAny =
      stats.flags.newBestTime || stats.flags.newBestDamage || stats.flags.newFewestDeaths;

    if (newAny) {
      this.titleEl.dataset.record = 'true';
      this.titleEl.innerHTML = `Run Complete <span class="${styles.titleStar}">★</span>`;
    } else {
      this.titleEl.dataset.record = 'false';
      this.titleEl.textContent = 'Run Complete';
    }

    const timeStr = formatTime(stats.durationMs);
    const bestTimeStr =
      stats.records.bestTimeMs !== null ? formatTime(stats.records.bestTimeMs) : '—';
    const bestDamageStr =
      stats.records.bestDamageDealt > 0 ? `${stats.records.bestDamageDealt}` : '—';
    const fewestDeathsStr =
      stats.records.fewestDeathsInVictory !== null
        ? `${stats.records.fewestDeathsInVictory}`
        : '—';

    const statBlocks: { label: string; value: string; hint: string; record: boolean }[] = [
      {
        label: 'Tempo',
        value: timeStr,
        hint: stats.flags.newBestTime ? '★ Novo recorde' : `melhor ${bestTimeStr}`,
        record: stats.flags.newBestTime,
      },
      {
        label: 'Dano causado',
        value: stats.damageDealt.toString(),
        hint: stats.flags.newBestDamage ? '★ Novo recorde' : `melhor ${bestDamageStr}`,
        record: stats.flags.newBestDamage,
      },
      {
        label: 'Dano sofrido',
        value: stats.damageTaken.toString(),
        hint: '',
        record: false,
      },
      {
        label: 'Mortes',
        value: stats.deaths.toString(),
        hint: stats.flags.newFewestDeaths ? '★ Novo recorde' : `melhor ${fewestDeathsStr}`,
        record: stats.flags.newFewestDeaths,
      },
    ];

    this.statsEl.innerHTML = '';
    for (const s of statBlocks) {
      const el = document.createElement('div');
      el.className = styles.statBlock!;
      el.innerHTML = `
        <span class="${styles.statLabel}">${s.label}</span>
        <span class="${styles.statValue}" data-record="${s.record}">${s.value}</span>
        ${s.hint ? `<span class="${styles.statHint}" data-record="${s.record}">${s.hint}</span>` : ''}
      `;
      this.statsEl.appendChild(el);
    }

    const kills = Object.values(stats.killCounts).filter((k) => k.count > 0);
    this.killsEl.innerHTML = '';
    if (kills.length === 0) {
      this.killsEl.innerHTML = `<span class="${styles.empty}">Nenhum inimigo abatido.</span>`;
    } else {
      for (const k of kills) {
        const chip = document.createElement('span');
        chip.className = styles.killChip!;
        chip.innerHTML = `${escapeHtml(k.name)}<span class="${styles.killChipCount}">${k.count}</span>`;
        this.killsEl.appendChild(chip);
      }
    }

    this.buffsEl.innerHTML = '';
    if (stats.buffsPicked.length === 0) {
      this.buffsEl.innerHTML = `<span class="${styles.empty}">Nenhuma bênção coletada.</span>`;
    } else {
      for (const b of stats.buffsPicked) {
        const chip = document.createElement('span');
        chip.className = styles.buffChip!;
        chip.textContent = b;
        this.buffsEl.appendChild(chip);
      }
    }

    this.leaderboardEl.innerHTML = '';
    if (!this.leaderboardLoaded) {
      this.leaderboardEl.innerHTML = `<div class="${styles.leaderboardLoading}">Carregando...</div>`;
    } else if (this.lastLeaderboard.length === 0) {
      const empty = this.lastUsername
        ? 'Ninguém aqui ainda — seja o primeiro!'
        : 'Faça login para salvar seu run e competir.';
      this.leaderboardEl.innerHTML = `<div class="${styles.leaderboardEmpty}">${empty}</div>`;
    } else {
      const rows = this.lastLeaderboard.slice(0, 5);
      for (let i = 0; i < rows.length; i++) {
        const e = rows[i]!;
        const isMe =
          this.lastUsername !== null &&
          e.username.toLowerCase() === this.lastUsername.toLowerCase();
        const t = formatTime(e.durationMs);
        const deathsStr = e.deaths === 1 ? '1 morte' : `${e.deaths} mortes`;
        const row = document.createElement('div');
        row.className = styles.leaderboardRow!;
        row.dataset.me = isMe ? 'true' : 'false';
        row.innerHTML = `
          <span class="${styles.leaderboardRank}">${i + 1}</span>
          <span class="${styles.leaderboardName}">${escapeHtml(e.username)}</span>
          <span class="${styles.leaderboardTime}">${t}</span>
          <span class="${styles.leaderboardDeaths}">${deathsStr}</span>
        `;
        this.leaderboardEl.appendChild(row);
      }
    }

    this.lifetimeEl.innerHTML = `
      <span>Vitórias <span class="${styles.lifetimeValue}">${stats.records.totalVictories}</span></span>
      <span>·</span>
      <span>Tentativas <span class="${styles.lifetimeValue}">${stats.records.totalAttempts}</span></span>
    `;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
