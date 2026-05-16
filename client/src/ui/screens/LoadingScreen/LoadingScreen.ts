import styles from './LoadingScreen.module.css';

const LOGO_URL = '/assets/branding/eternia-logo.png';
const LOADING_ART_URL = '/assets/branding/loading-naia.png';

export interface LoadingScreenOptions {
  minDurationMs?: number;
  fadeOutMs?: number;
  characterName?: string;
  quote?: string;
}

export class LoadingScreen {
  readonly element: HTMLElement;
  private fadeOutMs: number;
  private startedAt = 0;
  private minDurationMs: number;

  constructor(opts: LoadingScreenOptions = {}) {
    this.minDurationMs = opts.minDurationMs ?? 2500;
    this.fadeOutMs = opts.fadeOutMs ?? 500;
    const characterName = opts.characterName ?? 'NAIA';
    const quote =
      opts.quote ?? '"Cada flecha encontra seu alvo, se a paciência permitir."';

    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.state = 'showing';
    root.dataset.artLoaded = 'false';
    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.tint}"></div>
        <div class="${styles.beam}"></div>
        <div class="${styles.grain}"></div>
      </div>
      <div class="${styles.vignette}"></div>
      <div class="${styles.logoCorner}">
        <img class="${styles.logoImg}" data-logo alt="ETERNIA" style="display:none;" />
        <h1 class="${styles.logoText}" data-logo-text>ETERNIA</h1>
      </div>
      <div class="${styles.title}">
        <h2 class="${styles.titleName}">${escapeHtml(characterName)}</h2>
        <div class="${styles.titleQuote}">${escapeHtml(quote)}</div>
      </div>
      <div class="${styles.progress}">
        <div class="${styles.progressBar}"></div>
        <div class="${styles.progressLabel}">Carregando</div>
      </div>
    `;

    const logoImg = root.querySelector<HTMLImageElement>('[data-logo]')!;
    const logoText = root.querySelector<HTMLElement>('[data-logo-text]')!;
    logoImg.onload = () => {
      logoImg.style.display = '';
      logoText.style.display = 'none';
    };
    logoImg.onerror = () => {
      // keep text fallback
    };
    logoImg.src = LOGO_URL;

    const artProbe = new Image();
    artProbe.onload = () => {
      root.style.backgroundImage = `url(${LOADING_ART_URL})`;
      root.dataset.artLoaded = 'true';
    };
    artProbe.onerror = () => {
      // keep atmospheric fallback (gradient + tint + beam + grain)
    };
    artProbe.src = LOADING_ART_URL;

    this.element = root;
    this.startedAt = performance.now();
  }

  /**
   * Schedule hide after BOTH minDurationMs has elapsed AND `waitFor` (if provided) resolves.
   * If waitFor rejects, the screen still hides (failures shouldn't deadlock boot).
   */
  hideAfterMin(waitFor?: Promise<unknown>): Promise<void> {
    const elapsed = performance.now() - this.startedAt;
    const minWait = new Promise<void>((resolve) =>
      window.setTimeout(resolve, Math.max(0, this.minDurationMs - elapsed)),
    );
    const safeWaitFor: Promise<unknown> = waitFor
      ? waitFor.catch((err) => {
          console.warn('[LoadingScreen] waitFor rejected, hiding anyway:', err);
        })
      : Promise.resolve();
    return Promise.all([minWait, safeWaitFor]).then(
      () =>
        new Promise<void>((resolve) => {
          this.element.dataset.state = 'hiding';
          window.setTimeout(() => {
            this.element.dataset.state = 'hidden';
            resolve();
          }, this.fadeOutMs);
        }),
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
