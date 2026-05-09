import styles from './RoomLobby.module.css';
import type { RoomMember } from '../../../game/Network.js';
import { Character3DPortrait } from '../../../three/Character3DPortrait.js';
import { IDLE_NAIA } from '../../../three/procedural-anims.js';

export interface RoomLobbyShowOptions {
  code: string;
  youUserId: number | null;
  onReadyToggle: () => void;
  onStartMatch: () => void;
  onLeave: () => void;
}

const MAX_PARTY_SIZE = 4;

const NAIA_MODEL_URL = '/models/naia.glb';

interface PartySlotEls {
  root: HTMLElement;
  portraitHost: HTMLElement;
  content: HTMLElement;
}

export class RoomLobby {
  readonly element: HTMLElement;
  private opts: RoomLobbyShowOptions | null = null;
  private members: readonly RoomMember[] = [];
  private isHost = false;
  private isReady = false;
  private allReady = false;
  private codeEl: HTMLElement;
  private copyBtn: HTMLButtonElement;
  private partyEl: HTMLElement;
  private actionBtn: HTMLButtonElement;
  private actionHint: HTMLElement;
  private connStatusEl: HTMLElement;

  private partySlots: PartySlotEls[] = [];
  private portraits3d = new Map<number, Character3DPortrait>();

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';

    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.tint}"></div>
        <div class="${styles.motes}"></div>
        <div class="${styles.grain}"></div>
      </div>

      <div class="${styles.topBar}">
        <div class="${styles.heading}">
          <div class="${styles.eyebrow}">Travessia · Sala</div>
          <h1 class="${styles.title}" data-title>Sala da jornada</h1>
        </div>
        <div class="${styles.connStatus}" data-connstatus>
          <span class="${styles.connStatusDot}"></span>
          <span>Conectado · sala aberta</span>
        </div>
      </div>

      <div class="${styles.center}">
        <div class="${styles.codeBlock}">
          <div class="${styles.codeLabel}">Código da jornada</div>
          <div class="${styles.codeRow}">
            <div class="${styles.codeDigits}" data-code>------</div>
            <button class="${styles.codeCopyBtn}" type="button" data-copy>Copiar</button>
          </div>
          <p class="${styles.codeHelp}">
            Compartilhe o código com aliados para que possam acompanhar a jornada.
          </p>
        </div>

        <div class="${styles.party}" data-party></div>
      </div>

      <div class="${styles.bottomBar}">
        <button class="${styles.leaveBtn}" type="button" data-leave>
          ← Abandonar a sala
        </button>
        <div class="${styles.actionCol}">
          <span class="${styles.actionHint}" data-hint>
            <span class="${styles.actionHintKey}">Esc</span> · sair · <span class="${styles.actionHintKey}">Enter</span> · ação
          </span>
          <button class="${styles.actionBtn}" type="button" data-action>
            <span data-actionlabel>Pronto</span>
            <span class="${styles.actionArrow}">►</span>
          </button>
        </div>
      </div>
    `;

    this.element = root;
    this.codeEl = root.querySelector('[data-code]')!;
    this.copyBtn = root.querySelector('[data-copy]')!;
    this.partyEl = root.querySelector('[data-party]')!;
    this.actionBtn = root.querySelector('[data-action]')!;
    this.actionHint = root.querySelector('[data-hint]')!;
    this.connStatusEl = root.querySelector('[data-connstatus]')!;

    this.copyBtn.addEventListener('click', () => this.handleCopy());
    this.actionBtn.addEventListener('click', () => this.handleAction());
    root.querySelector('[data-leave]')!.addEventListener('click', () => {
      this.opts?.onLeave();
    });

    this.buildPartySlots();

    document.addEventListener('keydown', this.onKey);
  }

  private buildPartySlots() {
    for (let i = 0; i < MAX_PARTY_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = styles.partySlot!;
      slot.dataset.empty = 'true';

      const portraitHost = document.createElement('div');
      portraitHost.className = styles.partySlotPortrait!;

      const content = document.createElement('div');

      slot.appendChild(portraitHost);
      slot.appendChild(content);

      this.partyEl.appendChild(slot);
      this.partySlots.push({ root: slot, portraitHost, content });

      if (i < MAX_PARTY_SIZE - 1) {
        const conn = document.createElement('div');
        conn.className = styles.partyConnector!;
        this.partyEl.appendChild(conn);
      }
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.opts?.onLeave();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.handleAction();
    }
  };

  show(opts: RoomLobbyShowOptions) {
    this.opts = opts;
    this.codeEl.textContent = opts.code;
    this.copyBtn.dataset.copied = 'false';
    this.copyBtn.textContent = 'Copiar';
    this.members = [];
    this.isHost = false;
    this.isReady = false;
    this.allReady = false;
    this.refreshUI();
    this.element.dataset.visible = 'true';
  }

  hide() {
    this.element.dataset.visible = 'false';
    this.opts = null;
    this.destroyAllPortraits();
  }

  applyStatus(members: readonly RoomMember[]) {
    this.members = members;
    if (this.opts?.youUserId != null) {
      const me = members.find((m) => m.userId === this.opts!.youUserId);
      this.isHost = me?.isHost ?? false;
      this.isReady = me?.ready ?? false;
    }
    const others = members.filter((m) => m.userId !== this.opts?.youUserId);
    this.allReady = members.length > 1 && others.every((m) => m.ready);
    this.refreshUI();
  }

  setConnectionStatus(text: string, kind: 'good' | 'warn' | 'bad' = 'good') {
    const dot = this.connStatusEl.querySelector(`.${styles.connStatusDot}`) as HTMLElement;
    const label = this.connStatusEl.querySelector('span:last-child')!;
    label.textContent = text;
    if (dot) {
      const color =
        kind === 'good'
          ? 'var(--success)'
          : kind === 'warn'
            ? 'var(--warning)'
            : 'var(--danger)';
      dot.style.background = color;
      dot.style.boxShadow = `0 0 8px ${color}`;
    }
  }

  private refreshUI() {
    this.refreshParty();
    this.refreshAction();
  }

  private refreshParty() {
    for (let i = 0; i < MAX_PARTY_SIZE; i++) {
      const slotEls = this.partySlots[i]!;
      const member = this.members[i];

      if (!member) {
        slotEls.root.dataset.empty = 'true';
        delete slotEls.root.dataset.ready;
        slotEls.content.innerHTML = `
          <span class="${styles.emptyGlyph}">·</span>
          <span class="${styles.emptyLabel}">Aguardando aliado</span>
        `;
        this.releasePortrait(i);
        continue;
      }

      const isYou = this.opts?.youUserId === member.userId;
      const showsReady = !member.isHost && member.ready;
      slotEls.root.dataset.empty = 'false';
      slotEls.root.dataset.ready = showsReady ? 'true' : 'false';

      const badges: string[] = [];
      if (member.isHost) {
        badges.push(`<span class="${styles.partySlotBadge} ${styles.partySlotBadgeHost}">Líder</span>`);
      }
      if (isYou) {
        badges.push(`<span class="${styles.partySlotBadge} ${styles.partySlotBadgeYou}">Você</span>`);
      }
      const isAlone = this.members.length <= 1;
      const stateText = member.isHost
        ? isAlone
          ? 'Sozinho · pronto pra partir'
          : this.allReady
            ? 'Aliados prontos · pode iniciar'
            : 'Aguardando aliados'
        : member.ready
          ? 'Pronto'
          : 'Preparando-se';
      slotEls.content.innerHTML = `
        <div class="${styles.partySlotCorner}"></div>
        <div class="${styles.partySlotHead}">
          <span class="${styles.partySlotName}">${escapeHtml(member.username)}</span>
          <div style="display:flex; gap:4px;">${badges.join('')}</div>
        </div>
        <div class="${styles.partySlotMeta}">
          <span>${member.isHost ? 'Líder da jornada' : 'Aliado'}</span>
        </div>
        <div class="${styles.partySlotState}">
          <span class="${styles.partySlotStateDot}"></span>
          <span class="${styles.partySlotStateText}">${stateText}</span>
        </div>
      `;

      this.ensurePortrait(i, slotEls.portraitHost);
    }
  }

  private ensurePortrait(slotIdx: number, host: HTMLElement) {
    if (this.portraits3d.has(slotIdx)) return;
    const portrait = new Character3DPortrait({
      container: host,
      modelUrl: NAIA_MODEL_URL,
      toonShading: true,
      cameraDistance: 2.0,
      chestRatio: 0.55,
      swayAmplitude: 0.14,
      baseRotationY: -Math.PI / 2,
      proceduralIdle: IDLE_NAIA,
      onLoadError: () => {
        host.style.display = 'none';
      },
    });
    portrait.start();
    this.portraits3d.set(slotIdx, portrait);
  }

  private releasePortrait(slotIdx: number) {
    const p = this.portraits3d.get(slotIdx);
    if (!p) return;
    p.destroy();
    this.portraits3d.delete(slotIdx);
  }

  private destroyAllPortraits() {
    for (const [, p] of this.portraits3d) p.destroy();
    this.portraits3d.clear();
  }

  private refreshAction() {
    const labelEl = this.actionBtn.querySelector('[data-actionlabel]')!;
    if (this.isHost) {
      this.actionBtn.dataset.variant = 'start';
      this.actionBtn.dataset.active = 'false';
      const isAlone = this.members.length <= 1;
      labelEl.textContent = isAlone ? 'Iniciar (solo)' : 'Iniciar jornada';
      const canStart = isAlone || this.allReady;
      this.actionBtn.disabled = !canStart;
      this.actionHint.innerHTML = canStart
        ? `<span class="${styles.actionHintKey}">Enter</span> · iniciar`
        : 'Aguardando aliados ficarem prontos';
    } else {
      this.actionBtn.dataset.variant = 'ready';
      this.actionBtn.dataset.active = this.isReady ? 'true' : 'false';
      labelEl.textContent = this.isReady ? 'Cancelar' : 'Pronto';
      this.actionBtn.disabled = false;
      this.actionHint.innerHTML = `<span class="${styles.actionHintKey}">Enter</span> · alternar pronto`;
    }
  }

  private handleAction() {
    if (this.actionBtn.disabled) return;
    if (this.isHost) {
      const isAlone = this.members.length <= 1;
      if (isAlone || this.allReady) {
        this.opts?.onStartMatch();
      }
    } else {
      this.opts?.onReadyToggle();
    }
  }

  private async handleCopy() {
    const code = this.codeEl.textContent ?? '';
    if (!code || code === '------') return;
    try {
      await navigator.clipboard.writeText(code);
      this.copyBtn.dataset.copied = 'true';
      this.copyBtn.textContent = 'Copiado';
      setTimeout(() => {
        this.copyBtn.dataset.copied = 'false';
        this.copyBtn.textContent = 'Copiar';
      }, 1500);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(this.codeEl);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
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
