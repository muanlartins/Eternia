import styles from './BossHpBar.module.css';

const TICK_COUNT = 10;

export class BossHpBar {
  readonly element: HTMLElement;
  private nameEl: HTMLElement;
  private fillEl: HTMLElement;
  private labelEl: HTMLElement;
  private hitEl: HTMLElement;
  private lastPct = 1;
  private lastHpText = '';
  private flashTimeout: number | null = null;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.dataset.phase = '1';
    root.innerHTML = `
      <div class="${styles.eyebrow}">
        <span class="${styles.eyebrowDot}"></span>
        <span data-eyebrowtext>Boss</span>
        <span class="${styles.eyebrowDot}"></span>
      </div>
      <div class="${styles.name}" data-name>Boss</div>
      <div class="${styles.barWrap}">
        <div class="${styles.barFill}" data-fill style="transform: scaleX(1)"></div>
        <div class="${styles.barHit}" data-hit data-flash="false"></div>
        <div class="${styles.barTicks}">
          ${Array(TICK_COUNT).fill(`<div class="${styles.barTick}"></div>`).join('')}
        </div>
        <div class="${styles.barLabel}" data-label>—</div>
      </div>
      <div class="${styles.phaseStamp}">
        <span class="${styles.phaseStampInner}">II</span>
      </div>
    `;
    this.element = root;
    this.nameEl = root.querySelector('[data-name]')!;
    this.fillEl = root.querySelector('[data-fill]')!;
    this.labelEl = root.querySelector('[data-label]')!;
    this.hitEl = root.querySelector('[data-hit]')!;
  }

  show(bossName: string) {
    this.nameEl.textContent = bossName.toUpperCase();
    this.element.dataset.visible = 'true';
    this.element.dataset.phase = '1';
    this.lastPct = 1;
  }

  hide() {
    this.element.dataset.visible = 'false';
  }

  update(hp: number, maxHp: number, phase: 1 | 2) {
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    if (Math.abs(this.lastPct - pct) > 0.001) {
      if (pct < this.lastPct) {
        this.flashHit();
      }
      this.lastPct = pct;
      this.fillEl.style.transform = `scaleX(${pct})`;
    }
    const hpText = `${Math.round(hp)} / ${maxHp}`;
    if (this.lastHpText !== hpText) {
      this.lastHpText = hpText;
      this.labelEl.textContent = hpText;
    }
    const phaseStr = String(phase);
    if (this.element.dataset.phase !== phaseStr) {
      this.element.dataset.phase = phaseStr;
    }
  }

  private flashHit() {
    if (this.flashTimeout !== null) {
      clearTimeout(this.flashTimeout);
    }
    this.hitEl.dataset.flash = 'true';
    this.flashTimeout = window.setTimeout(() => {
      this.hitEl.dataset.flash = 'false';
      this.flashTimeout = null;
    }, 90);
  }
}
