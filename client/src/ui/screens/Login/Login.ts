import styles from './Login.module.css';

export interface LoginShowOptions {
  onSubmit: (username: string) => Promise<void> | void;
  onGuest: () => void;
}

export class Login {
  readonly element: HTMLElement;
  private input: HTMLInputElement;
  private form: HTMLFormElement;
  private errorEl: HTMLElement;
  private primaryBtn: HTMLButtonElement;
  private guestBtn: HTMLButtonElement;
  private opts: LoginShowOptions | null = null;
  private submitting = false;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.gradient}"></div>
        <div class="${styles.motes}"></div>
        <div class="${styles.vignette}"></div>
        <div class="${styles.grain}"></div>
      </div>

      <div class="${styles.brandRow}">
        <div class="${styles.brandGlyph}">
          <span class="${styles.brandGlyphLetter}">Æ</span>
        </div>
        <div class="${styles.brandLockup}">
          <div class="${styles.brandTitle}">Eternia</div>
          <div class="${styles.brandSubtitle}">A jornada · v0.0.1</div>
        </div>
      </div>

      <div class="${styles.stage}">
        <div class="${styles.hero}">
          <div class="${styles.heroEyebrow}">Ato I · A Travessia</div>
          <h1 class="${styles.heroTitle}">Eternia</h1>
          <p class="${styles.heroTagline}">Onde os caminhos se cruzam</p>
        </div>

        <div class="${styles.card}">
          <div class="${styles.cardCorner}"></div>
          <div class="${styles.cardLabel}">
            <span class="${styles.cardLabelDot}"></span>
            <span>Identificação do herói</span>
          </div>
          <form class="${styles.form}">
            <div class="${styles.field}">
              <label class="${styles.fieldLabel}" for="login-input">Nome do guerreiro</label>
              <input
                class="${styles.input}"
                id="login-input"
                name="username"
                type="text"
                maxlength="20"
                autocomplete="off"
                spellcheck="false"
                placeholder="ex: lyra, kaelen, ..."
              />
              <div class="${styles.error}" data-visible="false"></div>
            </div>
            <button class="${styles.primary}" type="submit">
              <span>Entrar na jornada</span>
            </button>
            <button class="${styles.secondary}" type="button" data-action="guest">
              Continuar como visitante
            </button>
          </form>
        </div>
      </div>

      <div class="${styles.footRow}">
        <span>WASD · mover</span>
        <span class="${styles.footDot}">·</span>
        <span>Z · ataque</span>
        <span class="${styles.footDot}">·</span>
        <span>1·2·3 · habilidades</span>
      </div>
    `;
    this.element = root;
    this.input = root.querySelector('input')!;
    this.form = root.querySelector('form')!;
    this.errorEl = root.querySelector(`.${styles.error}`)!;
    this.primaryBtn = root.querySelector(`.${styles.primary}`)!;
    this.guestBtn = root.querySelector(`[data-action="guest"]`)!;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });
    this.guestBtn.addEventListener('click', () => {
      this.opts?.onGuest();
    });
    this.input.addEventListener('input', () => {
      this.setError(null);
    });
  }

  show(opts: LoginShowOptions) {
    this.opts = opts;
    this.element.dataset.visible = 'true';
    requestAnimationFrame(() => {
      this.input.focus();
    });
  }

  hide() {
    this.element.dataset.visible = 'false';
    this.input.value = '';
    this.setError(null);
    this.opts = null;
  }

  setError(text: string | null) {
    if (!text) {
      this.errorEl.dataset.visible = 'false';
      this.errorEl.textContent = '';
      return;
    }
    this.errorEl.textContent = text;
    this.errorEl.dataset.visible = 'true';
    const card = this.element.querySelector(`.${styles.card}`);
    card?.classList.remove(styles.shake!);
    void (card as HTMLElement | null)?.offsetWidth;
    card?.classList.add(styles.shake!);
  }

  private async handleSubmit() {
    if (this.submitting) return;
    const value = this.input.value.trim();
    if (value.length < 2) {
      this.setError('Pelo menos 2 caracteres');
      return;
    }
    if (value.length > 20) {
      this.setError('Máximo de 20 caracteres');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      this.setError('Apenas letras, números, _ e -');
      return;
    }
    this.submitting = true;
    this.primaryBtn.disabled = true;
    this.primaryBtn.querySelector('span')!.textContent = 'Entrando...';
    try {
      await this.opts?.onSubmit(value);
    } finally {
      this.submitting = false;
      this.primaryBtn.disabled = false;
      this.primaryBtn.querySelector('span')!.textContent = 'Entrar na jornada';
    }
  }
}
