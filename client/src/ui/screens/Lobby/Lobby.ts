import styles from './Lobby.module.css';

export interface LobbyShowOptions {
  username: string | null;
  onSolo: () => void;
  onCreatePublic: () => void;
  onJoinByCode: (code: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onBack?: () => void;
}

export class Lobby {
  readonly element: HTMLElement;
  private opts: LobbyShowOptions | null = null;
  private codeInput: HTMLInputElement;
  private codeJoinBtn: HTMLButtonElement;
  private codeError: HTMLElement;
  private userValueEl: HTMLElement;
  private busy = false;
  private selectedIdx = 0;
  private cardEls: HTMLElement[] = [];

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.dataset.view = 'menu';

    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.tint}"></div>
        <div class="${styles.motes}"></div>
        <div class="${styles.grain}"></div>
      </div>

      <div class="${styles.topBar}">
        <div class="${styles.heading}">
          <div class="${styles.eyebrow}">Travessia · Modo de jogo</div>
          <h1 class="${styles.title}">Como jornadeará hoje?</h1>
        </div>
        <div class="${styles.user}">
          Logado como <span class="${styles.userValue}" data-user>—</span>
        </div>
      </div>

      <button class="${styles.back}" data-back type="button">← Voltar ao herói</button>

      <div class="${styles.cards}" data-cards>
        <button class="${styles.modeCard}" data-mode="solo" data-idx="0" data-selected="true" type="button">
          <div class="${styles.modeCardBg}"></div>
          <div class="${styles.modeCardCorner}"></div>
          <div class="${styles.modeCardIndex}">
            <span class="${styles.modeCardIndexKey}">1</span>
            <span>Tecla</span>
          </div>
          <div class="${styles.modeCardContent}">
            <div class="${styles.modeIcon}">
              <span class="${styles.modeIconGlyph}">I</span>
            </div>
            <h2 class="${styles.modeName}">Solitário</h2>
            <p class="${styles.modeSubtitle}">"Quem caminha só, escuta a floresta com mais clareza."</p>
            <div class="${styles.modeMeta}">
              <div class="${styles.modeMetaLine}">
                <span class="${styles.modeMetaLabel}">Modo</span>
                <span class="${styles.modeMetaValue}">Single-player</span>
              </div>
              <div class="${styles.modeMetaLine}">
                <span class="${styles.modeMetaLabel}">Conexão</span>
                <span class="${styles.modeMetaValue}">Local</span>
              </div>
            </div>
          </div>
          <span class="${styles.modeChevron}">→</span>
        </button>

        <button class="${styles.modeCard}" data-mode="host" data-idx="1" type="button">
          <div class="${styles.modeCardBg}"></div>
          <div class="${styles.modeCardCorner}"></div>
          <div class="${styles.modeCardIndex}">
            <span class="${styles.modeCardIndexKey}">2</span>
            <span>Tecla</span>
          </div>
          <div class="${styles.modeCardContent}">
            <div class="${styles.modeIcon}">
              <span class="${styles.modeIconGlyph}">II</span>
            </div>
            <h2 class="${styles.modeName}">Liderar</h2>
            <p class="${styles.modeSubtitle}">"Acenda a fogueira — outros virão pela luz no horizonte."</p>
            <div class="${styles.modeMeta}">
              <div class="${styles.modeMetaLine}">
                <span class="${styles.modeMetaLabel}">Modo</span>
                <span class="${styles.modeMetaValue}">Co-op host</span>
              </div>
              <div class="${styles.modeMetaLine}">
                <span class="${styles.modeMetaLabel}">Sala</span>
                <span class="${styles.modeMetaValue}">Pública</span>
              </div>
            </div>
          </div>
          <span class="${styles.modeChevron}">→</span>
        </button>

        <button class="${styles.modeCard}" data-mode="join" data-idx="2" type="button">
          <div class="${styles.modeCardBg}"></div>
          <div class="${styles.modeCardCorner}"></div>
          <div class="${styles.modeCardIndex}">
            <span class="${styles.modeCardIndexKey}">3</span>
            <span>Tecla</span>
          </div>
          <div class="${styles.modeCardContent}">
            <div class="${styles.modeIcon}">
              <span class="${styles.modeIconGlyph}">III</span>
            </div>
            <h2 class="${styles.modeName}">Acompanhar</h2>
            <p class="${styles.modeSubtitle}">"Diga o nome do caminho — e a porta há de se abrir."</p>
            <div class="${styles.modeMeta}">
              <div class="${styles.modeMetaLine}">
                <span class="${styles.modeMetaLabel}">Modo</span>
                <span class="${styles.modeMetaValue}">Co-op joiner</span>
              </div>
              <div class="${styles.modeMetaLine}">
                <span class="${styles.modeMetaLabel}">Entrada</span>
                <span class="${styles.modeMetaValue}">Código</span>
              </div>
            </div>
          </div>
          <span class="${styles.modeChevron}">→</span>
        </button>
      </div>

      <div class="${styles.codeView}">
        <div class="${styles.codeCorner}"></div>
        <div class="${styles.codeLabel}">
          <span class="${styles.codeLabelDot}"></span>
          <span>Acompanhar uma jornada</span>
        </div>
        <h2 class="${styles.codeTitle}">Diga o nome do caminho</h2>
        <p class="${styles.codeHelp}">
          Cole aqui o código de 6 letras que o líder da sua jornada
          compartilhou.
        </p>
        <div>
          <div class="${styles.codeFieldLabel}">Código de sala</div>
          <input
            class="${styles.codeInput}"
            type="text"
            maxlength="6"
            autocomplete="off"
            spellcheck="false"
            placeholder="ABC123"
            data-codeinput
          />
          <div class="${styles.codeError}" data-codeerror data-visible="false"></div>
        </div>
        <div class="${styles.codeActions}">
          <button class="${styles.codeBackBtn}" type="button" data-codeback>← Voltar</button>
          <button class="${styles.codePrimary}" type="button" data-codejoin>Acompanhar</button>
        </div>
      </div>
    `;

    this.element = root;
    this.userValueEl = root.querySelector('[data-user]')!;
    this.codeInput = root.querySelector('[data-codeinput]')!;
    this.codeJoinBtn = root.querySelector('[data-codejoin]')!;
    this.codeError = root.querySelector('[data-codeerror]')!;

    this.cardEls = Array.from(root.querySelectorAll<HTMLElement>(`.${styles.modeCard}`));
    for (let i = 0; i < this.cardEls.length; i++) {
      const card = this.cardEls[i]!;
      card.addEventListener('click', () => this.activateMode(i));
      card.addEventListener('mouseenter', () => this.selectIdx(i));
    }
    root.querySelector('[data-codeback]')!.addEventListener('click', () => {
      this.showMenuView();
    });
    this.codeJoinBtn.addEventListener('click', () => {
      void this.handleJoin();
    });
    this.codeInput.addEventListener('input', () => {
      this.codeInput.value = this.codeInput.value.toUpperCase();
      this.setCodeError(null);
    });
    this.codeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void this.handleJoin();
      }
    });
    root.querySelector('[data-back]')!.addEventListener('click', () => {
      this.opts?.onBack?.();
    });

    document.addEventListener('keydown', this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    if (this.element.dataset.view === 'code') {
      if (e.key === 'Escape') {
        this.showMenuView();
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.opts?.onBack?.();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.selectIdx((this.selectedIdx + 1) % this.cardEls.length);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.selectIdx((this.selectedIdx - 1 + this.cardEls.length) % this.cardEls.length);
      e.preventDefault();
    } else if (e.key === '1') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.activateMode(0);
    } else if (e.key === '2') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.activateMode(1);
    } else if (e.key === '3') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.activateMode(2);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.activateMode(this.selectedIdx);
    }
  };

  private selectIdx(i: number) {
    this.selectedIdx = i;
    for (let j = 0; j < this.cardEls.length; j++) {
      this.cardEls[j]!.dataset.selected = j === i ? 'true' : 'false';
    }
  }

  private activateMode(i: number) {
    this.selectIdx(i);
    const mode = this.cardEls[i]?.dataset.mode;
    if (mode === 'solo') this.opts?.onSolo();
    else if (mode === 'host') this.opts?.onCreatePublic();
    else if (mode === 'join') this.showCodeView();
  }

  show(opts: LobbyShowOptions) {
    this.opts = opts;
    this.userValueEl.textContent = opts.username ?? 'Visitante';
    this.codeInput.value = '';
    this.setCodeError(null);
    this.element.dataset.view = 'menu';
    this.element.dataset.visible = 'true';
    this.selectIdx(0);
  }

  hide() {
    this.element.dataset.visible = 'false';
    this.opts = null;
  }

  private showCodeView() {
    this.element.dataset.view = 'code';
    requestAnimationFrame(() => this.codeInput.focus());
  }

  private showMenuView() {
    this.element.dataset.view = 'menu';
    this.codeInput.value = '';
    this.setCodeError(null);
  }

  private setCodeError(text: string | null) {
    if (!text) {
      this.codeError.dataset.visible = 'false';
      this.codeError.textContent = '';
      return;
    }
    this.codeError.textContent = text;
    this.codeError.dataset.visible = 'true';
  }

  private async handleJoin() {
    if (this.busy) return;
    const code = this.codeInput.value.trim().toUpperCase();
    if (code.length !== 6) {
      this.setCodeError('Código tem 6 caracteres');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      this.setCodeError('Apenas letras e números');
      return;
    }
    this.busy = true;
    this.codeJoinBtn.disabled = true;
    const original = this.codeJoinBtn.textContent;
    this.codeJoinBtn.textContent = 'Conectando...';
    try {
      const result = await this.opts?.onJoinByCode(code);
      if (result && !result.ok) {
        this.setCodeError(result.error);
      }
    } finally {
      this.busy = false;
      this.codeJoinBtn.disabled = false;
      this.codeJoinBtn.textContent = original;
    }
  }
}
