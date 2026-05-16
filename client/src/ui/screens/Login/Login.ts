import styles from './Login.module.css';

const LOGO_URL = '/assets/branding/eternia-logo.png';
const LOGIN_BG_URL = '/assets/branding/login-bg.png';

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
  private opts: LoginShowOptions | null = null;
  private submitting = false;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.dataset.artLoaded = 'false';
    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.gradient}"></div>
        <div class="${styles.motes}"></div>
        <div class="${styles.grain}"></div>
      </div>
      <div class="${styles.vignette}"></div>

      <div class="${styles.logoCorner}">
        <img class="${styles.logoImg}" data-logo alt="ETERNIA" style="display:none;" />
        <h1 class="${styles.logoText}" data-logo-text>ETERNIA</h1>
      </div>

      <div class="${styles.formWrap}">
        <form
          class="${styles.card}"
          autocomplete="off"
          data-form-type="other"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
        >
          <div class="${styles.cardLabel}">Identificação</div>
          <div class="${styles.field}">
            <input
              class="${styles.input}"
              id="eternia-nickname-input"
              type="text"
              maxlength="20"
              autocomplete="one-time-code"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              placeholder="nickname"
              data-form-type="other"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
            />
            <div class="${styles.error}" data-visible="false"></div>
          </div>
          <button class="${styles.primary}" type="submit">
            <span>JOGAR</span>
          </button>
        </form>
      </div>
    `;
    this.element = root;
    this.input = root.querySelector('input')!;
    this.form = root.querySelector('form')!;
    this.errorEl = root.querySelector(`.${styles.error}`)!;
    this.primaryBtn = root.querySelector(`.${styles.primary}`)!;

    const logoImg = root.querySelector<HTMLImageElement>('[data-logo]')!;
    const logoText = root.querySelector<HTMLElement>('[data-logo-text]')!;
    logoImg.onload = () => {
      logoImg.style.display = '';
      logoText.style.display = 'none';
    };
    logoImg.onerror = () => { /* keep text fallback */ };
    logoImg.src = LOGO_URL;

    const bgProbe = new Image();
    bgProbe.onload = () => {
      root.style.backgroundImage = `url(${LOGIN_BG_URL})`;
      root.dataset.artLoaded = 'true';
    };
    bgProbe.onerror = () => { /* keep atmospheric fallback */ };
    bgProbe.src = LOGIN_BG_URL;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.handleSubmit();
    });
    this.input.addEventListener('input', () => {
      this.setError(null);
    });
    // Refocus the input if the user clicks anywhere on the login backdrop
    // (defensive: keeps Enter ready even if focus was lost to an overlay).
    this.element.addEventListener('mousedown', (e) => {
      if (this.element.dataset.visible !== 'true') return;
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLButtonElement) return;
      this.input.focus();
    });
  }

  show(opts: LoginShowOptions) {
    this.opts = opts;
    this.element.dataset.visible = 'true';
    this.scheduleFocus();
  }

  private scheduleFocus(): void {
    // Try several times in case loading-screen overlay or layout settling
    // intercepts the first focus call.
    const tries = [0, 60, 200, 600, 1200];
    for (const ms of tries) {
      window.setTimeout(() => {
        if (this.element.dataset.visible === 'true' && document.activeElement !== this.input) {
          this.input.focus();
        }
      }, ms);
    }
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
      this.setError('pelo menos 2 caracteres');
      return;
    }
    if (value.length > 20) {
      this.setError('máximo 20 caracteres');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      this.setError('apenas letras, números, _ e -');
      return;
    }
    this.submitting = true;
    this.primaryBtn.disabled = true;
    this.primaryBtn.querySelector('span')!.textContent = 'entrando...';
    try {
      await this.opts?.onSubmit(value);
    } finally {
      this.submitting = false;
      this.primaryBtn.disabled = false;
      this.primaryBtn.querySelector('span')!.textContent = 'JOGAR';
    }
  }
}
