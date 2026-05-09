import styles from './MenuScreen.module.css';
import type { GameAudio } from '../../../game/Audio.js';
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardMetric } from '../../../game/Auth.js';
import { formatTime } from '../../../game/Records.js';

export interface MenuContext {
  username: string | null;
  onLogout: () => void;
}

type View = 'root' | 'audio' | 'leaderboard';

const METRICS: { id: LeaderboardMetric; label: string }[] = [
  { id: 'time', label: 'Tempo' },
  { id: 'damage', label: 'Dano' },
  { id: 'deaths', label: 'Mortes' },
];

export class MenuScreen {
  readonly element: HTMLElement;
  private view: View = 'root';
  private rootIdx = 0;
  private audioIdx = 0;
  private metricIdx = 0;
  private lbEntries: readonly LeaderboardEntry[] = [];
  private lbState: 'idle' | 'loading' | 'loaded' = 'idle';
  private lbReqToken = 0;
  private currentAudio: GameAudio | null = null;
  private currentCtx: MenuContext | null = null;

  private viewRootEl: HTMLElement;
  private viewAudioEl: HTMLElement;
  private viewLbEl: HTMLElement;
  private titleEl: HTMLElement;
  private eyebrowEl: HTMLElement;
  private userPillEl: HTMLElement;
  private hintEl: HTMLElement;
  private rootItemsEl: HTMLElement[] = [];
  private audioRows: HTMLElement[] = [];
  private lbTabs: HTMLButtonElement[] = [];
  private lbListEl: HTMLElement;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.innerHTML = `
      <div class="${styles.panel}">
        <div class="${styles.panelCorner}"></div>
        <div class="${styles.head}">
          <div class="${styles.eyebrow}" data-eyebrow><span>Menu</span></div>
          <h2 class="${styles.title}" data-title>Pausa</h2>
          <div class="${styles.userPill}" data-userpill></div>
        </div>

        <div class="${styles.viewRoot}" data-view-root></div>
        <div data-view-audio style="display:none"></div>
        <div data-view-lb style="display:none"></div>

        <div class="${styles.hint}" data-hint>
          <span><span class="${styles.hintKey}">↑↓</span> selecionar · <span class="${styles.hintKey}">Enter</span> abrir</span>
          <span><span class="${styles.hintKey}">Esc</span> fechar</span>
        </div>
      </div>
    `;
    this.element = root;
    this.titleEl = root.querySelector('[data-title]')!;
    this.eyebrowEl = root.querySelector('[data-eyebrow]')!;
    this.userPillEl = root.querySelector('[data-userpill]')!;
    this.hintEl = root.querySelector('[data-hint]')!;
    this.viewRootEl = root.querySelector('[data-view-root]')!;
    this.viewAudioEl = root.querySelector('[data-view-audio]')!;
    this.viewLbEl = root.querySelector('[data-view-lb]')!;
    this.lbListEl = document.createElement('div');

    this.buildRootMenu();
    this.buildAudioView();
    this.buildLeaderboardView();

    document.addEventListener('keydown', this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    if (e.key === 'Escape' || e.key === 'o' || e.key === 'O') {
      if (this.view === 'root') {
        this.close();
      } else {
        this.setView('root');
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    if (this.view === 'root') {
      const items = this.rootItemsEl;
      if (items.length === 0) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.selectRoot((this.rootIdx - 1 + items.length) % items.length);
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.selectRoot((this.rootIdx + 1) % items.length);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        items[this.rootIdx]?.click();
        e.preventDefault();
      }
    } else if (this.view === 'audio') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this.audioIdx = (this.audioIdx - 1 + this.audioRows.length) % this.audioRows.length;
        this.refreshAudioSelection();
        e.preventDefault();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.audioIdx = (this.audioIdx + 1) % this.audioRows.length;
        this.refreshAudioSelection();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.adjustAudio(-1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.adjustAudio(1);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (this.audioIdx === 3) this.toggleMute();
      }
    } else if (this.view === 'leaderboard') {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.metricIdx = (this.metricIdx - 1 + METRICS.length) % METRICS.length;
        this.refreshTabs();
        this.requestLeaderboard();
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.metricIdx = (this.metricIdx + 1) % METRICS.length;
        this.refreshTabs();
        this.requestLeaderboard();
        e.preventDefault();
      }
    }
  };

  isOpen(): boolean {
    return this.element.dataset.visible === 'true';
  }

  open(audio: GameAudio, ctx: MenuContext) {
    this.currentAudio = audio;
    this.currentCtx = ctx;
    this.view = 'root';
    this.rootIdx = 0;
    this.element.dataset.visible = 'true';
    this.setView('root');
    this.refreshUser();
  }

  close() {
    this.element.dataset.visible = 'false';
    this.currentAudio = null;
    this.currentCtx = null;
  }

  refresh() {
    if (this.view === 'audio') this.refreshAudioValues();
  }

  private setView(view: View) {
    this.view = view;
    this.viewRootEl.style.display = view === 'root' ? '' : 'none';
    this.viewAudioEl.style.display = view === 'audio' ? '' : 'none';
    this.viewLbEl.style.display = view === 'leaderboard' ? '' : 'none';

    const crumbs: { label: string; type: 'root' | 'sub' }[] =
      view === 'root'
        ? [{ label: 'Pausa', type: 'root' }]
        : [{ label: 'Pausa', type: 'root' }, { label: view === 'audio' ? 'Som' : 'Top global', type: 'sub' }];
    this.eyebrowEl.innerHTML = crumbs
      .map((c, i) =>
        i === 0
          ? `<span class="${styles.crumb}">${c.label}</span>`
          : `<span class="${styles.sep}">›</span><span>${c.label}</span>`,
      )
      .join('');
    this.titleEl.textContent =
      view === 'root' ? 'Sala de descanso' : view === 'audio' ? 'Som' : 'Top global';

    if (view === 'audio') this.refreshAudioValues();
    if (view === 'leaderboard') this.requestLeaderboard();

    this.refreshHint();
  }

  private refreshHint() {
    if (this.view === 'root') {
      this.hintEl.innerHTML = `
        <span><span class="${styles.hintKey}">↑↓</span> selecionar · <span class="${styles.hintKey}">Enter</span> abrir</span>
        <span><span class="${styles.hintKey}">Esc</span> fechar</span>
      `;
    } else if (this.view === 'audio') {
      this.hintEl.innerHTML = `
        <span><span class="${styles.hintKey}">↑↓</span> linha · <span class="${styles.hintKey}">←→</span> ajustar</span>
        <span><span class="${styles.hintKey}">Esc</span> voltar</span>
      `;
    } else {
      this.hintEl.innerHTML = `
        <span><span class="${styles.hintKey}">←→</span> alterna métrica</span>
        <span><span class="${styles.hintKey}">Esc</span> voltar</span>
      `;
    }
  }

  private refreshUser() {
    if (this.currentCtx?.username) {
      this.userPillEl.innerHTML = `Logado como <span class="${styles.userPillName}">${escapeHtml(this.currentCtx.username)}</span>`;
    } else {
      this.userPillEl.textContent = 'Jogando como visitante';
    }
  }

  private buildRootMenu() {
    this.rootItemsEl = [];
    const items: { id: 'leaderboard' | 'audio' | 'logout'; label: string; icon: string; needAuth: boolean; variant?: 'danger' }[] = [
      { id: 'leaderboard', label: 'Top global', icon: '★', needAuth: false },
      { id: 'audio', label: 'Som', icon: '♪', needAuth: false },
      { id: 'logout', label: 'Sair da conta', icon: '×', needAuth: true, variant: 'danger' },
    ];
    const populate = () => {
      this.viewRootEl.innerHTML = '';
      this.rootItemsEl = [];
      const visible = items.filter(
        (it) => !it.needAuth || (this.currentCtx?.username != null && this.currentCtx.username !== ''),
      );
      for (let i = 0; i < visible.length; i++) {
        const it = visible[i]!;
        const el = document.createElement('button');
        el.className = styles.menuItem!;
        el.type = 'button';
        el.dataset.id = it.id;
        el.dataset.selected = i === this.rootIdx ? 'true' : 'false';
        if (it.variant) el.dataset.variant = it.variant;
        el.innerHTML = `
          <span class="${styles.menuItemIcon}">${it.icon}</span>
          <span class="${styles.menuItemLabel}">${it.label}</span>
          <span class="${styles.menuItemArrow}">→</span>
        `;
        el.addEventListener('click', () => {
          if (it.id === 'leaderboard') this.setView('leaderboard');
          else if (it.id === 'audio') this.setView('audio');
          else if (it.id === 'logout') {
            this.currentCtx?.onLogout();
            this.close();
          }
        });
        el.addEventListener('mouseenter', () => this.selectRoot(i));
        this.viewRootEl.appendChild(el);
        this.rootItemsEl.push(el);
      }
      if (this.rootIdx >= this.rootItemsEl.length) this.rootIdx = 0;
      this.refreshRootSelection();
    };
    this.viewRootEl.addEventListener('focus', populate, true);
    populate();
    (this as unknown as { _populateRoot: () => void })._populateRoot = populate;
  }

  private selectRoot(i: number) {
    this.rootIdx = i;
    this.refreshRootSelection();
  }

  private refreshRootSelection() {
    for (let j = 0; j < this.rootItemsEl.length; j++) {
      this.rootItemsEl[j]!.dataset.selected = j === this.rootIdx ? 'true' : 'false';
    }
  }

  private buildAudioView() {
    const rows: { id: 'master' | 'bgm' | 'sfx' | 'mute'; label: string }[] = [
      { id: 'master', label: 'Master' },
      { id: 'bgm', label: 'BGM' },
      { id: 'sfx', label: 'SFX' },
      { id: 'mute', label: 'Mudo' },
    ];
    this.viewAudioEl.innerHTML = '';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const row = document.createElement('div');
      row.className = styles.audioRow!;
      row.dataset.idx = String(i);
      row.dataset.selected = i === this.audioIdx ? 'true' : 'false';
      if (r.id === 'mute') {
        row.innerHTML = `
          <span class="${styles.audioLabel}">${r.label}</span>
          <span></span>
          <button class="${styles.muteToggle}" type="button" data-mute>
            <span class="${styles.muteToggleHandle}"></span>
          </button>
        `;
        row.querySelector('[data-mute]')!.addEventListener('click', () => this.toggleMute());
      } else {
        const sliderId: 'master' | 'bgm' | 'sfx' = r.id;
        row.innerHTML = `
          <span class="${styles.audioLabel}">${r.label}</span>
          <input type="range" class="${styles.audioSlider}" min="0" max="100" step="5" value="50" data-slider="${sliderId}" />
          <span class="${styles.audioValue}" data-slidervalue="${sliderId}">50%</span>
        `;
        const slider = row.querySelector(`[data-slider="${sliderId}"]`) as HTMLInputElement;
        slider.addEventListener('input', () => {
          const v = parseInt(slider.value, 10) / 100;
          this.setAudioValue(sliderId, v);
        });
      }
      row.addEventListener('mouseenter', () => {
        this.audioIdx = i;
        this.refreshAudioSelection();
      });
      this.viewAudioEl.appendChild(row);
      this.audioRows.push(row);
    }
  }

  private refreshAudioSelection() {
    for (let j = 0; j < this.audioRows.length; j++) {
      this.audioRows[j]!.dataset.selected = j === this.audioIdx ? 'true' : 'false';
    }
  }

  private refreshAudioValues() {
    if (!this.currentAudio) return;
    const setSlider = (id: string, v: number) => {
      const sl = this.viewAudioEl.querySelector(`[data-slider="${id}"]`) as HTMLInputElement | null;
      const lbl = this.viewAudioEl.querySelector(`[data-slidervalue="${id}"]`);
      if (sl) sl.value = String(Math.round(v * 100));
      if (lbl) lbl.textContent = `${Math.round(v * 100)}%`;
    };
    setSlider('master', this.currentAudio.getMasterVolume());
    setSlider('bgm', this.currentAudio.getBgmVolume());
    setSlider('sfx', this.currentAudio.getSfxVolume());
    const muteBtn = this.viewAudioEl.querySelector('[data-mute]') as HTMLElement | null;
    if (muteBtn) muteBtn.dataset.on = this.currentAudio.isMuted() ? 'true' : 'false';
  }

  private setAudioValue(id: 'master' | 'bgm' | 'sfx', v: number) {
    if (!this.currentAudio) return;
    const clamped = Math.max(0, Math.min(1, v));
    if (id === 'master') this.currentAudio.setMasterVolume(clamped);
    else if (id === 'bgm') this.currentAudio.setBgmVolume(clamped);
    else if (id === 'sfx') this.currentAudio.setSfxVolume(clamped);
    this.refreshAudioValues();
  }

  private adjustAudio(dir: number) {
    if (this.audioIdx === 3) {
      this.toggleMute();
      return;
    }
    if (!this.currentAudio) return;
    const id: 'master' | 'bgm' | 'sfx' =
      this.audioIdx === 0 ? 'master' : this.audioIdx === 1 ? 'bgm' : 'sfx';
    const cur =
      id === 'master'
        ? this.currentAudio.getMasterVolume()
        : id === 'bgm'
          ? this.currentAudio.getBgmVolume()
          : this.currentAudio.getSfxVolume();
    this.setAudioValue(id, cur + dir * 0.05);
  }

  private toggleMute() {
    if (!this.currentAudio) return;
    this.currentAudio.setMuted(!this.currentAudio.isMuted());
    this.refreshAudioValues();
  }

  private buildLeaderboardView() {
    const tabs = document.createElement('div');
    tabs.className = styles.lbTabs!;
    for (let i = 0; i < METRICS.length; i++) {
      const m = METRICS[i]!;
      const btn = document.createElement('button');
      btn.className = styles.lbTab!;
      btn.type = 'button';
      btn.textContent = m.label;
      btn.dataset.active = i === this.metricIdx ? 'true' : 'false';
      btn.addEventListener('click', () => {
        this.metricIdx = i;
        this.refreshTabs();
        this.requestLeaderboard();
      });
      tabs.appendChild(btn);
      this.lbTabs.push(btn);
    }
    this.lbListEl = document.createElement('div');
    this.lbListEl.className = styles.lbList!;
    this.viewLbEl.appendChild(tabs);
    this.viewLbEl.appendChild(this.lbListEl);
  }

  private refreshTabs() {
    for (let i = 0; i < this.lbTabs.length; i++) {
      this.lbTabs[i]!.dataset.active = i === this.metricIdx ? 'true' : 'false';
    }
  }

  private requestLeaderboard() {
    const metric = METRICS[this.metricIdx]!.id;
    this.lbState = 'loading';
    this.lbEntries = [];
    this.renderLeaderboard();
    const token = ++this.lbReqToken;
    void fetchLeaderboard(metric, 10).then((entries) => {
      if (token !== this.lbReqToken) return;
      this.lbEntries = entries;
      this.lbState = 'loaded';
      this.renderLeaderboard();
    });
  }

  private renderLeaderboard() {
    this.lbListEl.innerHTML = '';
    const metric = METRICS[this.metricIdx]!.id;
    const me = this.currentCtx?.username ?? null;
    if (this.lbState === 'loading') {
      this.lbListEl.innerHTML = `<div class="${styles.lbLoading}">Carregando...</div>`;
      return;
    }
    if (this.lbEntries.length === 0) {
      const msg = me
        ? 'Sem registros ainda. Seja o primeiro!'
        : 'Faça login pra registrar seu run.';
      this.lbListEl.innerHTML = `<div class="${styles.lbEmpty}">${msg}</div>`;
      return;
    }
    for (let i = 0; i < this.lbEntries.length; i++) {
      const e = this.lbEntries[i]!;
      const isMe = me !== null && e.username.toLowerCase() === me.toLowerCase();
      const value =
        metric === 'time'
          ? formatTime(e.durationMs)
          : metric === 'damage'
            ? e.damageDealt.toString()
            : e.deaths.toString();
      const row = document.createElement('div');
      row.className = styles.lbRow!;
      row.dataset.me = isMe ? 'true' : 'false';
      row.innerHTML = `
        <span class="${styles.lbRank}">${i + 1}</span>
        <span class="${styles.lbName}">${escapeHtml(e.username)}</span>
        <span class="${styles.lbValue}">${value}</span>
      `;
      this.lbListEl.appendChild(row);
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
