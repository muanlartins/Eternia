import styles from './RoomList.module.css';
import type { MissionSpec } from '../../../data/missions.js';
import type { Room } from '../../../game/Auth.js';

interface StageCardInfo {
  eyebrow: string;
  name: string;
  lore: string;
  mobs: readonly string[];
  drops: readonly string[];
  artUrl: string | null;
}

const STAGE_INFO: Record<string, StageCardInfo> = {
  forest: {
    eyebrow: 'Bioma I · Floresta',
    name: 'Floresta dos Elfos',
    lore: '"As árvores ainda lembram o nome dos primeiros viajantes."',
    mobs: ['Forest Sprite', 'Bramble Beast'],
    drops: [],
    artUrl: null,
  },
};

export interface RoomListShowOptions {
  mission: MissionSpec;
  username: string | null;
  fetchRooms: (missionId: string) => Promise<Room[]>;
  onCreateRoom: () => void;
  onJoinRoom: (room: Room) => void;
  onBack?: () => void;
}

export class RoomList {
  readonly element: HTMLElement;
  private opts: RoomListShowOptions | null = null;
  private listEl: HTMLElement;
  private emptyEl: HTMLElement;
  private refreshing = false;
  private cardArtEl: HTMLElement;
  private cardEyebrowEl: HTMLElement;
  private cardNameEl: HTMLElement;
  private cardLoreEl: HTMLElement;
  private cardMobsEl: HTMLElement;
  private cardDropsEl: HTMLElement;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';

    root.innerHTML = `
      <div class="${styles.backdrop}" data-backdrop></div>

      <div class="${styles.dialog}" role="dialog">
        <button class="${styles.closeBtn}" data-back type="button" aria-label="Fechar">×</button>

        <div class="${styles.dialogBody}">
          <aside class="${styles.stageCard}">
            <div class="${styles.cardArt}" data-card-art>
              <span class="${styles.cardArtPlaceholder}">arte do mapa em breve</span>
              <div class="${styles.cardArtOverlay}">
                <div class="${styles.cardArtEyebrow}" data-card-eyebrow></div>
                <h2 class="${styles.cardArtTitle}" data-card-name></h2>
              </div>
            </div>
            <p class="${styles.cardLore}" data-card-lore></p>
            <div class="${styles.cardMetaGrid}">
              <div class="${styles.cardMetaBlock}">
                <div class="${styles.cardMetaLabel}">Inimigos</div>
                <div class="${styles.cardMetaValue}" data-card-mobs></div>
              </div>
              <div class="${styles.cardMetaBlock}">
                <div class="${styles.cardMetaLabel}">Drops</div>
                <div class="${styles.cardMetaValue}" data-card-drops></div>
              </div>
            </div>
          </aside>

          <section class="${styles.roomCol}">
            <div class="${styles.roomHead}">
              <span class="${styles.roomHeadLabel}">Salas disponíveis</span>
              <button class="${styles.refreshBtn}" data-refresh type="button" title="Atualizar">↻</button>
            </div>
            <div class="${styles.roomList}" data-rooms></div>
            <div class="${styles.roomEmpty}" data-empty style="display:none">
              Nenhuma sala disponível.<br/>
              <span class="${styles.roomEmptyHint}">Crie a sua para começar.</span>
            </div>
          </section>
        </div>

        <footer class="${styles.dialogFoot}">
          <button class="${styles.backLink}" data-backlink type="button">← voltar ao mapa</button>
          <button class="${styles.createBtn}" data-create type="button">
            <span class="${styles.createBtnPlus}">+</span>
            Criar sala
          </button>
        </footer>
      </div>
    `;

    this.element = root;

    this.listEl = root.querySelector('[data-rooms]')!;
    this.emptyEl = root.querySelector('[data-empty]')!;
    this.cardArtEl = root.querySelector('[data-card-art]')!;
    this.cardEyebrowEl = root.querySelector('[data-card-eyebrow]')!;
    this.cardNameEl = root.querySelector('[data-card-name]')!;
    this.cardLoreEl = root.querySelector('[data-card-lore]')!;
    this.cardMobsEl = root.querySelector('[data-card-mobs]')!;
    this.cardDropsEl = root.querySelector('[data-card-drops]')!;

    const closeBtn = root.querySelector('[data-back]') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.opts?.onBack?.());
    const backLinkBtn = root.querySelector('[data-backlink]') as HTMLButtonElement;
    backLinkBtn.addEventListener('click', () => this.opts?.onBack?.());
    const refreshBtn = root.querySelector('[data-refresh]') as HTMLButtonElement;
    refreshBtn.addEventListener('click', () => void this.refresh());
    const createBtn = root.querySelector('[data-create]') as HTMLButtonElement;
    createBtn.addEventListener('click', () => this.opts?.onCreateRoom());

    const backdropEl = root.querySelector('[data-backdrop]') as HTMLElement;
    backdropEl.addEventListener('click', () => this.opts?.onBack?.());

    document.addEventListener('keydown', this.onKey, { capture: true });
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.opts?.onBack?.();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.opts?.onCreateRoom();
    }
  };

  show(opts: RoomListShowOptions) {
    this.opts = opts;
    const info = STAGE_INFO[opts.mission.id] ?? {
      eyebrow: opts.mission.subtitle,
      name: opts.mission.name,
      lore: opts.mission.description,
      mobs: [],
      drops: [],
      artUrl: null,
    };
    this.cardEyebrowEl.textContent = info.eyebrow;
    this.cardNameEl.textContent = info.name;
    this.cardLoreEl.textContent = info.lore;
    this.cardMobsEl.textContent = info.mobs.length > 0 ? info.mobs.join(' · ') : '—';
    this.cardDropsEl.textContent = info.drops.length > 0 ? info.drops.join(' · ') : '—';
    if (info.artUrl) {
      this.cardArtEl.style.backgroundImage = `url(${info.artUrl})`;
      this.cardArtEl.dataset.hasArt = 'true';
    } else {
      this.cardArtEl.style.backgroundImage = '';
      this.cardArtEl.dataset.hasArt = 'false';
    }
    this.element.dataset.visible = 'true';
    void this.refresh();
  }

  hide() {
    this.element.dataset.visible = 'false';
    this.opts = null;
  }

  private async refresh() {
    if (!this.opts || this.refreshing) return;
    this.refreshing = true;
    const rooms = await this.opts.fetchRooms(this.opts.mission.id);
    this.refreshing = false;
    if (this.element.dataset.visible !== 'true') return;
    this.renderRooms(rooms);
  }

  private renderRooms(rooms: readonly Room[]) {
    this.listEl.innerHTML = '';
    if (rooms.length === 0) {
      this.emptyEl.style.display = '';
      return;
    }
    this.emptyEl.style.display = 'none';
    for (const r of rooms) {
      const row = document.createElement('button');
      row.className = styles.roomRow!;
      row.type = 'button';
      const memberCount = r.members?.length ?? 1;
      const cap = 4;
      const modeLabel = r.mode === 'solo' ? 'Solo' : 'Aliança';
      row.innerHTML = `
        <span class="${styles.roomCode}">Sala <span class="${styles.roomCodeMono}">#${r.code}</span></span>
        <span class="${styles.roomMembers}">
          <span class="${styles.roomMembersDot}"></span>
          ${memberCount}/${cap}
        </span>
        <span class="${styles.roomMode}" data-mode="${r.mode}">${modeLabel}</span>
        <span class="${styles.roomEnter}">entrar →</span>
      `;
      row.addEventListener('click', () => this.opts?.onJoinRoom(r));
      this.listEl.appendChild(row);
    }
  }
}
