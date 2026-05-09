import styles from './CharacterSelect.module.css';
import { CHARACTERS, type CharacterSpec } from '../../../data/characters.js';
import naiaPortrait from '../../../assets/naia/naia-cutout.png';
import naiaHeadshot from '../../../assets/naia/naia-headshot.png';
import { Character3DPortrait } from '../../../three/Character3DPortrait.js';
import { IDLE_NAIA } from '../../../three/procedural-anims.js';

interface Model3DSpec {
  modelUrl: string;
  extraAnimationUrls?: readonly string[];
}

const MODELS_3D: Record<string, Model3DSpec> = {
  naia: {
    modelUrl: '/models/naia.glb',
  },
};

interface CharBible {
  className: string;
  lore: string;
  chips: readonly string[];
}

const BIBLES: Record<string, CharBible> = {
  naia: {
    className: 'Elven Archer · Arco curto',
    lore: '"Cada flecha encontra seu alvo, se a paciência permitir."',
    chips: ['RANGED', 'POWER SHOT', 'DOUBLE-JUMP', 'I-FRAMES'],
  },
  astrid: {
    className: 'Knight · Espadachim',
    lore: '"Onde a espada cruza, o caminho se abre."',
    chips: ['EM BREVE'],
  },
  slot3: {
    className: 'Mage · Caster místico',
    lore: 'A guardiã de runas perdidas vai retornar quando seu nome for lembrado.',
    chips: ['EM BREVE'],
  },
  slot4: {
    className: 'Spell Knight · Lâmina e arcano',
    lore: 'A espada que canta runas espera seu portador.',
    chips: ['EM BREVE'],
  },
};

const PORTRAITS: Record<string, string> = {
  naia: naiaPortrait,
};

const HEADSHOTS: Record<string, string> = {
  naia: naiaHeadshot,
};

export interface CharacterSelectShowOptions {
  username: string | null;
  onConfirm: (char: CharacterSpec) => void;
  onBack?: () => void;
}

export class CharacterSelect {
  readonly element: HTMLElement;
  private opts: CharacterSelectShowOptions | null = null;
  private selectedIdx = 0;
  private cardEls: HTMLElement[] = [];
  private infoEl: HTMLElement;
  private nameEl: HTMLElement;
  private classEl: HTMLElement;
  private loreEl: HTMLElement;
  private chipsEl: HTMLElement;
  private portraitImg: HTMLImageElement;
  private portraitLockedEl: HTMLElement;
  private portrait3dHost: HTMLElement;
  private confirmBtn: HTMLButtonElement;
  private userNameEl: HTMLElement;
  private portraits3d = new Map<string, Character3DPortrait>();
  private active3dCharId: string | null = null;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.dataset.char = 'astrid';

    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.tint}"></div>
        <div class="${styles.beam}"></div>
        <div class="${styles.motes}"></div>
        <div class="${styles.grain}"></div>
      </div>

      <div class="${styles.topBar}">
        <div class="${styles.topBarLabel}">Capítulo I · Escolha o herói</div>
        <div class="${styles.topBarRight}">
          <span data-userlabel>·</span>
        </div>
      </div>

      <div class="${styles.stage}">
        <div class="${styles.heroPortrait}" data-portrait>
          <div class="${styles.heroBacklight}"></div>
          <img class="${styles.heroImg}" data-portraitimg alt="" />
          <div class="${styles.heroPortrait3d}" data-portrait3d></div>
          <div class="${styles.heroLocked}" data-portraitlocked style="display:none">
            <span class="${styles.heroLockedGlyph}">?</span>
            <span class="${styles.heroLockedLabel}">Em breve</span>
          </div>
          <div class="${styles.heroGround}"></div>
        </div>

        <div class="${styles.heroDivider}"></div>

        <div class="${styles.heroInfo}">
          <h1 class="${styles.heroName}" data-name>—</h1>
          <div class="${styles.heroNameRule}"></div>
          <div class="${styles.heroClass}" data-class>—</div>
          <p class="${styles.heroLore}" data-lore>—</p>
          <div class="${styles.heroKitBlock}">
            <div class="${styles.heroKitLabel}">Kit</div>
            <div class="${styles.heroChips}" data-chips></div>
          </div>
        </div>
      </div>

      <div class="${styles.bottomBar}">
        <div class="${styles.roster}" data-roster></div>

        <div class="${styles.navHint}">
          <span class="${styles.navHintItem}">
            <span class="${styles.navKey}">←</span>
            <span class="${styles.navKey}">→</span>
            alterna
          </span>
          <button class="${styles.confirmLink}" data-confirm type="button">
            confirmar <span class="${styles.confirmKey}">⏎</span>
          </button>
        </div>
      </div>
    `;

    this.element = root;
    this.infoEl = root.querySelector(`.${styles.heroInfo}`)!;
    this.nameEl = root.querySelector('[data-name]')!;
    this.classEl = root.querySelector('[data-class]')!;
    this.loreEl = root.querySelector('[data-lore]')!;
    this.chipsEl = root.querySelector('[data-chips]')!;
    this.portraitImg = root.querySelector('[data-portraitimg]')!;
    this.portraitLockedEl = root.querySelector('[data-portraitlocked]')!;
    this.portrait3dHost = root.querySelector('[data-portrait3d]')!;
    this.confirmBtn = root.querySelector('[data-confirm]')!;
    this.userNameEl = root.querySelector('[data-userlabel]')!;

    const rosterEl = root.querySelector('[data-roster]')!;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const c = CHARACTERS[i]!;
      const card = document.createElement('button');
      card.className = styles.headshot!;
      card.type = 'button';
      card.dataset.idx = String(i);
      card.dataset.locked = c.available ? 'false' : 'true';
      card.title = c.available ? c.name : 'Em breve';
      const headshotUrl = HEADSHOTS[c.id] ?? PORTRAITS[c.id];
      if (headshotUrl) {
        card.style.backgroundImage = `url(${headshotUrl})`;
      }
      if (!c.available) {
        card.innerHTML = `<span class="${styles.headshotLockGlyph}">?</span>`;
      }
      card.addEventListener('click', () => {
        if (!c.available) return;
        this.selectIdx(i);
      });
      rosterEl.appendChild(card);
      this.cardEls.push(card);
    }

    this.confirmBtn.addEventListener('click', () => this.confirmCurrent());

    document.addEventListener('keydown', this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.cycle(1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.cycle(-1);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.confirmCurrent();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.opts?.onBack?.();
    }
  };

  private cycle(delta: number) {
    let next = this.selectedIdx;
    for (let step = 0; step < CHARACTERS.length; step++) {
      next = (next + delta + CHARACTERS.length) % CHARACTERS.length;
      if (CHARACTERS[next]?.available) {
        this.selectIdx(next);
        return;
      }
    }
  }

  show(opts: CharacterSelectShowOptions) {
    this.opts = opts;
    this.userNameEl.textContent = opts.username
      ? `Logado como ${opts.username}`
      : 'Visitante';
    if (opts.username) {
      this.userNameEl.innerHTML = `<span class="${styles.topBarUser}">${opts.username}</span>`;
    }
    const firstAvail = CHARACTERS.findIndex((c) => c.available);
    this.selectIdx(firstAvail >= 0 ? firstAvail : 0);
    this.element.dataset.visible = 'true';
  }

  hide() {
    this.element.dataset.visible = 'false';
    this.opts = null;
    this.hide3DPortrait();
  }

  private show3DPortrait(charId: string, spec: Model3DSpec) {
    let portrait = this.portraits3d.get(charId);
    if (!portrait) {
      portrait = new Character3DPortrait({
        container: this.portrait3dHost,
        modelUrl: spec.modelUrl,
        ...(spec.extraAnimationUrls
          ? { extraAnimationUrls: spec.extraAnimationUrls }
          : {}),
        toonShading: true,
        chestRatio: 0.55,
        cameraDistance: 2.5,
        baseRotationY: -Math.PI / 2,
        proceduralIdle: IDLE_NAIA,
        enableUserRotation: true,
        onLoad: () => {
          if (this.active3dCharId !== charId) return;
          this.portrait3dHost.style.display = 'block';
          this.portraitImg.style.display = 'none';
        },
        onLoadError: () => {
          this.portrait3dHost.style.display = 'none';
        },
      });
      this.portraits3d.set(charId, portrait);
    } else if (portrait.isLoaded()) {
      this.portrait3dHost.style.display = 'block';
      this.portraitImg.style.display = 'none';
    }
    portrait.start();
    this.active3dCharId = charId;
  }

  private hide3DPortrait() {
    if (this.active3dCharId !== null) {
      const cur = this.portraits3d.get(this.active3dCharId);
      cur?.stop();
      cur?.resetUserRotation();
      this.active3dCharId = null;
    }
    this.portrait3dHost.style.display = 'none';
  }

  private selectIdx(i: number) {
    this.selectedIdx = i;
    const c = CHARACTERS[i]!;
    const bible = BIBLES[c.id]!;
    const isLocked = !c.available;

    this.element.dataset.char = isLocked ? 'locked' : c.id;

    this.infoEl.classList.remove(styles.infoTransition!);
    void this.infoEl.offsetWidth;
    this.infoEl.classList.add(styles.infoTransition!);

    this.nameEl.textContent = isLocked ? '???' : c.name;
    this.classEl.textContent = bible.className;
    this.loreEl.textContent = bible.lore;

    this.chipsEl.innerHTML = '';
    for (const chip of bible.chips) {
      const span = document.createElement('span');
      span.className = styles.heroChip!;
      span.textContent = chip;
      this.chipsEl.appendChild(span);
    }

    const portraitUrl = PORTRAITS[c.id];
    const model3D = !isLocked ? MODELS_3D[c.id] : undefined;

    this.hide3DPortrait();

    if (isLocked) {
      this.portraitImg.style.display = 'none';
      this.portraitImg.dataset.fading = 'true';
      this.portraitLockedEl.style.display = '';
    } else if (portraitUrl) {
      this.portraitLockedEl.style.display = 'none';
      this.portraitImg.dataset.fading = 'true';
      requestAnimationFrame(() => {
        this.portraitImg.src = portraitUrl;
        if (this.portrait3dHost.style.display !== 'block') {
          this.portraitImg.style.display = '';
        }
        this.portraitImg.dataset.fading = 'false';
      });
    } else {
      this.portraitImg.style.display = 'none';
      this.portraitLockedEl.style.display = 'none';
    }

    if (model3D) this.show3DPortrait(c.id, model3D);

    for (let j = 0; j < this.cardEls.length; j++) {
      this.cardEls[j]!.dataset.selected = j === i ? 'true' : 'false';
    }

    this.confirmBtn.disabled = isLocked;
  }

  private confirmCurrent() {
    const c = CHARACTERS[this.selectedIdx]!;
    if (!c.available) return;
    this.opts?.onConfirm(c);
  }
}
