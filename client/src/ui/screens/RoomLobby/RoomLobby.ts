import styles from './RoomLobby.module.css';
import type { RoomMember } from '../../../game/Network.js';
import { Character3DPortrait } from '../../../three/Character3DPortrait.js';
import { IDLE_NAIA } from '../../../three/procedural-anims.js';
import type { ProceduralAnimSpec } from '../../../three/procedural-anims.js';

const NAIA_ANIMS = import.meta.glob<{ default: ProceduralAnimSpec }>(
  '../../../data/anim/naia/*.json',
  { eager: true },
);
function findNaiaIdleSpec(): ProceduralAnimSpec {
  for (const mod of Object.values(NAIA_ANIMS)) {
    if (mod.default?.name?.toLowerCase() === 'idle') return mod.default;
  }
  return IDLE_NAIA;
}

export interface RoomLobbyShowOptions {
  code: string;
  youUserId: number | null;
  missionName: string;
  missionEyebrow: string;
  missionDescription: string;
  missionArtUrl: string | null;
  onReadyToggle: () => void;
  onStartMatch: () => void;
  onLeave: () => void;
}

const MAX_PARTY_SIZE = 4;
const NAIA_MODEL_URL = '/models/naia-mixamo.glb';

interface SlotEls {
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
  private inviteBtn: HTMLButtonElement;
  private actionBtn: HTMLButtonElement;
  private actionHint: HTMLElement;
  private connStatusEl: HTMLElement;
  private leaderSlot: SlotEls;
  private allySlots: SlotEls[] = [];
  private missionTitleEl: HTMLElement;
  private missionEyebrowEl: HTMLElement;
  private missionDescriptionEl: HTMLElement;
  private missionArtEl: HTMLElement;
  private chatLogEl: HTMLElement;
  private chatInputEl: HTMLInputElement;

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

      <div class="${styles.shell}">
        <header class="${styles.topBar}">
          <div class="${styles.heading}">
            <span class="${styles.eyebrow}">Travessia · sala</span>
            <span class="${styles.codeChip}">
              <span class="${styles.codeChipLabel}">#</span>
              <span class="${styles.codeChipDigits}" data-code>------</span>
            </span>
          </div>
          <div class="${styles.connStatus}" data-connstatus>
            <span class="${styles.connStatusDot}"></span>
            <span>Conectado · sala aberta</span>
          </div>
        </header>

        <div class="${styles.body}">
          <section class="${styles.leaderCol}" data-leader>
            <div class="${styles.leaderPortrait}" data-leader-portrait></div>
            <div class="${styles.leaderInfo}">
              <span class="${styles.leaderRole}" data-leader-role>Líder da jornada</span>
              <h2 class="${styles.leaderName}" data-leader-name>—</h2>
              <div class="${styles.leaderState}" data-leader-state>
                <span class="${styles.leaderStateDot}"></span>
                <span data-leader-statetext>Aguardando</span>
              </div>
            </div>
          </section>

          <div class="${styles.rightCol}">
            <section class="${styles.alliesCard}">
              <div class="${styles.cardLabel}">Aliados</div>
              <div class="${styles.alliesRow}" data-allies></div>
            </section>

            <section class="${styles.missionCard}">
              <div class="${styles.cardLabel}">Missão</div>
              <div class="${styles.missionPreview}">
                <div class="${styles.missionArt}" data-mission-art></div>
                <div class="${styles.missionMeta}">
                  <span class="${styles.missionEyebrow}" data-mission-eyebrow>—</span>
                  <h3 class="${styles.missionTitle}" data-mission-title>—</h3>
                  <p class="${styles.missionDescription}" data-mission-description></p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer class="${styles.bottomBar}">
          <section class="${styles.chatCard}">
            <div class="${styles.cardLabel}">Conversa</div>
            <div class="${styles.chatLog}" data-chat-log>
              <div class="${styles.chatPlaceholder}">A conversa começa quando alguém entrar na sala.</div>
            </div>
            <div class="${styles.chatInputRow}">
              <input class="${styles.chatInput}" data-chat-input type="text" placeholder="Digite uma mensagem…" maxlength="180" disabled />
              <span class="${styles.chatSoon}">em breve</span>
            </div>
          </section>

          <div class="${styles.actionStack}">
            <button class="${styles.inviteBtn}" type="button" data-invite>
              <span class="${styles.inviteBtnArrow}">⌥</span>
              <span class="${styles.inviteBtnLabel}">Convidar</span>
            </button>
            <button class="${styles.actionBtn}" type="button" data-action>
              <span data-actionlabel>Pronto</span>
            </button>
            <button class="${styles.leaveBtn}" type="button" data-leave>
              <span class="${styles.leaveBtnArrow}">←</span>
              <span class="${styles.leaveBtnLabel}">Sair</span>
            </button>
            <span class="${styles.actionHint}" data-hint>
              <span class="${styles.actionHintKey}">Esc</span> · sair · <span class="${styles.actionHintKey}">Enter</span> · ação
            </span>
          </div>
        </footer>
      </div>
    `;

    this.element = root;
    this.codeEl = root.querySelector('[data-code]')!;
    this.inviteBtn = root.querySelector('[data-invite]')!;
    this.actionBtn = root.querySelector('[data-action]')!;
    this.actionHint = root.querySelector('[data-hint]')!;
    this.connStatusEl = root.querySelector('[data-connstatus]')!;
    this.missionTitleEl = root.querySelector('[data-mission-title]')!;
    this.missionEyebrowEl = root.querySelector('[data-mission-eyebrow]')!;
    this.missionDescriptionEl = root.querySelector('[data-mission-description]')!;
    this.missionArtEl = root.querySelector('[data-mission-art]')!;
    this.chatLogEl = root.querySelector('[data-chat-log]')!;
    this.chatInputEl = root.querySelector('[data-chat-input]')!;

    this.leaderSlot = this.buildLeaderSlot(root);
    this.allySlots = this.buildAllySlots(root);

    this.inviteBtn.addEventListener('click', () => void this.handleInvite());
    this.actionBtn.addEventListener('click', () => this.handleAction());
    root.querySelector('[data-leave]')!.addEventListener('click', () => {
      this.opts?.onLeave();
    });

    document.addEventListener('keydown', this.onKey, { capture: true });
  }

  private buildLeaderSlot(root: HTMLElement): SlotEls {
    return {
      root: root.querySelector('[data-leader]')!,
      portraitHost: root.querySelector('[data-leader-portrait]')!,
      content: root.querySelector('[data-leader-state]')!,
    };
  }

  private buildAllySlots(root: HTMLElement): SlotEls[] {
    const host = root.querySelector('[data-allies]')!;
    const slots: SlotEls[] = [];
    for (let i = 0; i < MAX_PARTY_SIZE - 1; i++) {
      const slot = document.createElement('div');
      slot.className = styles.allySlot!;
      slot.dataset.empty = 'true';

      const portraitHost = document.createElement('div');
      portraitHost.className = styles.allySlotPortrait!;

      const content = document.createElement('div');
      content.className = styles.allySlotContent!;

      slot.appendChild(portraitHost);
      slot.appendChild(content);
      host.appendChild(slot);

      slots.push({ root: slot, portraitHost, content });
    }
    return slots;
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
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
    // Drop focus from any lingering element on the previous screen so Enter
    // hits our document-level handler instead of an off-screen button.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }
    this.members = [];
    this.isHost = false;
    this.isReady = false;
    this.allReady = false;

    this.missionTitleEl.textContent = opts.missionName;
    this.missionEyebrowEl.textContent = opts.missionEyebrow;
    this.missionDescriptionEl.textContent = opts.missionDescription;
    if (opts.missionArtUrl) {
      this.missionArtEl.style.backgroundImage = `url(${opts.missionArtUrl})`;
      this.missionArtEl.dataset.hasArt = 'true';
    } else {
      this.missionArtEl.style.backgroundImage = '';
      this.missionArtEl.dataset.hasArt = 'false';
    }

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
    this.refreshLeader();
    this.refreshAllies();
    this.refreshAction();
  }

  private refreshLeader() {
    const leader = this.members[0];
    const nameEl = this.element.querySelector('[data-leader-name]') as HTMLElement;
    const roleEl = this.element.querySelector('[data-leader-role]') as HTMLElement;
    const stateText = this.element.querySelector('[data-leader-statetext]') as HTMLElement;
    const stateBlock = this.element.querySelector('[data-leader-state]') as HTMLElement;

    if (!leader) {
      this.leaderSlot.root.dataset.empty = 'true';
      nameEl.textContent = '—';
      roleEl.textContent = 'Sala vazia';
      stateText.textContent = 'Aguardando';
      stateBlock.dataset.kind = 'idle';
      this.releasePortrait(0);
      return;
    }

    this.leaderSlot.root.dataset.empty = 'false';
    nameEl.textContent = leader.username;
    roleEl.textContent = leader.userId === this.opts?.youUserId ? 'Líder · você' : 'Líder da jornada';

    const isAlone = this.members.length <= 1;
    if (isAlone) {
      stateText.textContent = 'Sozinho · pronto pra partir';
      stateBlock.dataset.kind = 'ready';
    } else if (this.allReady) {
      stateText.textContent = 'Aliados prontos · pode iniciar';
      stateBlock.dataset.kind = 'ready';
    } else {
      stateText.textContent = 'Aguardando aliados';
      stateBlock.dataset.kind = 'idle';
    }

    this.ensurePortrait(0, this.leaderSlot.portraitHost);
  }

  private refreshAllies() {
    for (let i = 0; i < this.allySlots.length; i++) {
      const slotEls = this.allySlots[i]!;
      const member = this.members[i + 1];

      if (!member) {
        slotEls.root.dataset.empty = 'true';
        delete slotEls.root.dataset.ready;
        slotEls.content.innerHTML = `
          <span class="${styles.allySlotEmpty}">vago</span>
        `;
        this.releasePortrait(i + 1);
        continue;
      }

      const isYou = this.opts?.youUserId === member.userId;
      slotEls.root.dataset.empty = 'false';
      slotEls.root.dataset.ready = member.ready ? 'true' : 'false';
      slotEls.root.dataset.you = isYou ? 'true' : 'false';

      slotEls.content.innerHTML = `
        <span class="${styles.allySlotName}">${escapeHtml(member.username)}</span>
        <span class="${styles.allySlotState}" data-kind="${member.ready ? 'ready' : 'idle'}">
          ${member.ready ? 'Pronto' : 'Preparando'}
        </span>
      `;

      this.ensurePortrait(i + 1, slotEls.portraitHost);
    }
  }

  private ensurePortrait(slotIdx: number, host: HTMLElement) {
    if (this.portraits3d.has(slotIdx)) return;
    const portrait = new Character3DPortrait({
      container: host,
      modelUrl: NAIA_MODEL_URL,
      toonShading: true,
      cameraDistance: slotIdx === 0 ? 2.6 : 2.1,
      chestRatio: slotIdx === 0 ? 0.55 : 0.55,
      swayAmplitude: 0.14,
      baseRotationY: 0,
      proceduralIdle: findNaiaIdleSpec(),
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
      labelEl.textContent = isAlone ? 'Iniciar (solo)' : 'Iniciar';
      const canStart = isAlone || this.allReady;
      this.actionBtn.disabled = !canStart;
      this.actionHint.innerHTML = canStart
        ? `<span class="${styles.actionHintKey}">Enter</span> · iniciar`
        : 'Aguardando aliados';
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

  private async handleInvite() {
    const code = this.codeEl.textContent ?? '';
    if (!code || code === '------') return;
    try {
      await navigator.clipboard.writeText(code);
      this.inviteBtn.dataset.copied = 'true';
      const labelEl = this.inviteBtn.querySelector(`.${styles.inviteBtnLabel}`)!;
      labelEl.textContent = 'Copiado!';
      setTimeout(() => {
        this.inviteBtn.dataset.copied = 'false';
        labelEl.textContent = 'Convidar';
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
