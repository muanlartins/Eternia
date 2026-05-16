import styles from './CardPick.module.css';

export type CardRarity = 'common' | 'rare' | 'modifier';

export interface CardPickEntry {
  name: string;
  description: string;
  rarity: CardRarity;
  glyph?: string;
}

export interface CardPickShowOptions {
  eyebrow: string;
  title: string;
  subtitle?: string;
  cards: CardPickEntry[];
  hintLabel?: string;
  onPick: (idx: number) => void;
}

export class CardPick {
  readonly element: HTMLElement;
  private opts: CardPickShowOptions | null = null;
  private cardsEl: HTMLElement;
  private titleEl: HTMLElement;
  private eyebrowEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private hintEl: HTMLElement;
  private cardEls: HTMLElement[] = [];
  private selectedIdx = 0;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';

    root.innerHTML = `
      <div class="${styles.layout}">
        <div class="${styles.head}">
          <div class="${styles.eyebrow}" data-eyebrow>—</div>
          <h2 class="${styles.title}" data-title>—</h2>
          <p class="${styles.subtitle}" data-subtitle></p>
        </div>
        <div class="${styles.cards}" data-cards></div>
        <div class="${styles.hint}" data-hint>
          <span class="${styles.hintKey}">1 · 2 · 3</span> selecionar · <span class="${styles.hintKey}">Enter</span> aplicar
        </div>
      </div>
    `;

    this.element = root;
    this.cardsEl = root.querySelector('[data-cards]')!;
    this.titleEl = root.querySelector('[data-title]')!;
    this.eyebrowEl = root.querySelector('[data-eyebrow]')!;
    this.subtitleEl = root.querySelector('[data-subtitle]')!;
    this.hintEl = root.querySelector('[data-hint]')!;

    document.addEventListener('keydown', this.onKey, { capture: true });
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    const handled =
      e.key === '1' ||
      e.key === '2' ||
      e.key === '3' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowLeft' ||
      e.key === 'a' ||
      e.key === 'A' ||
      e.key === 'd' ||
      e.key === 'D' ||
      e.key === 'Enter';
    if (!handled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === '1') this.activate(0);
    else if (e.key === '2') this.activate(1);
    else if (e.key === '3') this.activate(2);
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.selectIdx((this.selectedIdx + 1) % this.cardEls.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.selectIdx((this.selectedIdx - 1 + this.cardEls.length) % this.cardEls.length);
    } else if (e.key === 'Enter') {
      this.activate(this.selectedIdx);
    }
  };

  show(opts: CardPickShowOptions) {
    this.opts = opts;
    this.eyebrowEl.textContent = opts.eyebrow;
    this.titleEl.textContent = opts.title;
    this.subtitleEl.textContent = opts.subtitle ?? '';
    this.subtitleEl.style.display = opts.subtitle ? '' : 'none';

    if (opts.hintLabel) {
      this.hintEl.innerHTML = `
        <span class="${styles.hintKey}">1 · 2 · 3</span> selecionar · <span class="${styles.hintKey}">Enter</span> ${opts.hintLabel}
      `;
    }

    this.cardsEl.innerHTML = '';
    this.cardEls = [];
    for (let i = 0; i < opts.cards.length; i++) {
      const c = opts.cards[i]!;
      const el = document.createElement('button');
      el.className = styles.card!;
      el.type = 'button';
      el.dataset.idx = String(i);
      el.dataset.rarity = c.rarity;
      el.dataset.selected = i === 0 ? 'true' : 'false';
      const rarityLabel =
        c.rarity === 'rare'
          ? 'Rare'
          : c.rarity === 'modifier'
            ? 'Caminho'
            : 'Common';
      const rarityClass =
        c.rarity === 'rare'
          ? styles.cardRarityRare
          : c.rarity === 'modifier'
            ? styles.cardRarityModifier
            : styles.cardRarityCommon;
      const iconBlock = c.glyph
        ? `<div class="${styles.cardIcon}"><span class="${styles.cardIconGlyph}">${escapeHtml(c.glyph)}</span></div>`
        : '';
      el.innerHTML = `
        <div class="${styles.cardBg}"></div>
        <div class="${styles.cardCorner}"></div>
        <div class="${styles.cardKey}">
          <span class="${styles.cardKeyBadge}">${i + 1}</span>
          <span>Tecla</span>
        </div>
        <div class="${styles.cardRarity} ${rarityClass}">${rarityLabel}</div>
        <div class="${styles.cardContent}">
          ${iconBlock}
          <h3 class="${styles.cardName}">${escapeHtml(c.name)}</h3>
          <p class="${styles.cardDesc}">${escapeHtml(c.description)}</p>
        </div>
        <span class="${styles.cardChevron}">→</span>
      `;
      el.addEventListener('click', () => this.activate(i));
      el.addEventListener('mouseenter', () => this.selectIdx(i));
      this.cardsEl.appendChild(el);
      this.cardEls.push(el);
    }
    this.selectedIdx = 0;
    this.element.dataset.visible = 'true';
  }

  hide() {
    this.element.dataset.visible = 'false';
    this.opts = null;
  }

  isVisible(): boolean {
    return this.element.dataset.visible === 'true';
  }

  private selectIdx(i: number) {
    this.selectedIdx = i;
    for (let j = 0; j < this.cardEls.length; j++) {
      this.cardEls[j]!.dataset.selected = j === i ? 'true' : 'false';
    }
  }

  private activate(i: number) {
    if (i < 0 || i >= this.cardEls.length) return;
    this.selectIdx(i);
    this.opts?.onPick(i);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
