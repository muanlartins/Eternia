import styles from './CharacterSelect.module.css';
import { CHARACTERS, type CharacterSpec } from '../../../data/characters.js';
import naiaPortrait from '../../../assets/naia/naia-cutout.png';
import naiaHeadshot from '../../../assets/naia/naia-headshot.png';
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

interface Model3DSpec {
  modelUrl: string;
  extraAnimationUrls?: readonly string[];
}

const MODELS_3D: Record<string, Model3DSpec> = {
  naia: {
    modelUrl: '/models/naia-mixamo.glb',
  },
};

type AbilitySlot = 'A' | 'S' | 'D';

interface AbilityDef {
  slot: AbilitySlot;
  name: string;
  desc: string;
}

interface CharBible {
  className: string;
  lore: string;
  abilities: readonly AbilityDef[];
}

const BIBLES: Record<string, CharBible> = {
  naia: {
    className: 'Elven Archer · Arco curto',
    lore: '"Cada flecha encontra seu alvo, se a paciência permitir."',
    abilities: [
      {
        slot: 'A',
        name: 'Rajada de Flechas',
        desc: 'Disparo multi-flecha contínuo na mesma direção do ataque básico — mesmo arco balístico, volume bem maior. Cobertura linear pra zerar mob denso.',
      },
      {
        slot: 'S',
        name: 'Flecha-Tempestade',
        desc: 'Flecha alta lançada num arco íngreme. Após percorrer distância horizontal, explode em chuva descendente de mini-flechas. AoE vertical que ignora cobertura.',
      },
      {
        slot: 'D',
        name: 'Tríplice Tempestade',
        desc: 'Oito rajadas em cascata densa, cada uma disparando 2 das 5 linhas paralelas tight (alturas próximas, escolhidas aleatoriamente). Flechas seguem arcos parabólicos paralelos — 16 flechas total em chuva contínua e caótica.',
      },
    ],
  },
  astrid: {
    className: 'Knight · Espadachim',
    lore: '"Onde a espada cruza, o caminho se abre."',
    abilities: [],
  },
  slot3: {
    className: 'Mage · Caster místico',
    lore: 'A guardiã de runas perdidas vai retornar quando seu nome for lembrado.',
    abilities: [],
  },
  slot4: {
    className: 'Spell Knight · Lâmina e arcano',
    lore: 'A espada que canta runas espera seu portador.',
    abilities: [],
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
  private abilityWrapEl: HTMLElement;
  private abilitySlotsEl: HTMLElement;
  private abilityNameEl: HTMLElement;
  private abilityDescEl: HTMLElement;
  private cycleHintEl: HTMLElement;
  private abilityIdx = 0;
  private focusMode: 'character' | 'ability' = 'character';
  private portraitImg: HTMLImageElement;
  private portraitLockedEl: HTMLElement;
  private portrait3dHost: HTMLElement;
  private confirmBtn: HTMLButtonElement;
  private userNameEl: HTMLElement;
  private portraits3d = new Map<string, Character3DPortrait>();
  private portraitLoads = new Map<string, Promise<void>>();
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
            <div class="${styles.heroKitLabel}">
              Kit
              <span class="${styles.heroAbilityCycleHint}" data-cycle-hint>↑ ↓ alterna</span>
            </div>
            <div class="${styles.heroAbility}" data-ability>
              <div class="${styles.heroAbilitySlots}" data-ability-slots></div>
              <div class="${styles.heroAbilityCard}">
                <div class="${styles.heroAbilityName}" data-ability-name>—</div>
                <p class="${styles.heroAbilityDesc}" data-ability-desc>—</p>
              </div>
            </div>
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
    this.abilityWrapEl = root.querySelector('[data-ability]')!;
    this.abilitySlotsEl = root.querySelector('[data-ability-slots]')!;
    this.abilityNameEl = root.querySelector('[data-ability-name]')!;
    this.abilityDescEl = root.querySelector('[data-ability-desc]')!;
    this.cycleHintEl = root.querySelector('[data-cycle-hint]')!;
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
    const isLeft = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A';
    const isRight = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
    const isUp = e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
    const isDown = e.key === 'ArrowDown' || e.key === 's' || e.key === 'S';

    if (this.focusMode === 'ability') {
      if (isLeft) {
        this.cycleAbility(-1);
        e.preventDefault();
      } else if (isRight) {
        this.cycleAbility(1);
        e.preventDefault();
      } else if (isDown) {
        this.setFocusMode('character');
        e.preventDefault();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.setFocusMode('character');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.confirmCurrent();
      }
      return;
    }

    if (isRight) {
      this.cycle(1);
      e.preventDefault();
    } else if (isLeft) {
      this.cycle(-1);
      e.preventDefault();
    } else if (isUp) {
      const c = CHARACTERS[this.selectedIdx]!;
      const bible = BIBLES[c.id]!;
      if (bible.abilities.length > 0) {
        this.setFocusMode('ability');
      }
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

  private setFocusMode(mode: 'character' | 'ability'): void {
    this.focusMode = mode;
    this.abilityWrapEl.dataset.focused = mode === 'ability' ? 'true' : 'false';
    this.updateCycleHint();
  }

  private updateCycleHint(): void {
    if (this.focusMode === 'ability') {
      this.cycleHintEl.textContent = '← → alterna · ↓ voltar';
    } else {
      const c = CHARACTERS[this.selectedIdx]!;
      const bible = BIBLES[c.id]!;
      this.cycleHintEl.textContent = bible.abilities.length > 0 ? '↑ ver habilidades' : '';
    }
  }

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

  /**
   * Eagerly construct the Character3DPortrait for `charId` so its GLB load + parse
   * happens BEFORE the screen is shown. Returns a promise that resolves on first
   * successful render-ready frame (or rejects on load error).
   *
   * Safe to call multiple times — subsequent calls return the cached load promise.
   */
  preload(charId: string): Promise<void> {
    const cached = this.portraitLoads.get(charId);
    if (cached) return cached;
    const spec = MODELS_3D[charId];
    if (!spec) {
      const p = Promise.resolve();
      this.portraitLoads.set(charId, p);
      return p;
    }
    const loadPromise = new Promise<void>((resolve, reject) => {
      const portrait = new Character3DPortrait({
        container: this.portrait3dHost,
        modelUrl: spec.modelUrl,
        ...(spec.extraAnimationUrls
          ? { extraAnimationUrls: spec.extraAnimationUrls }
          : {}),
        toonShading: true,
        chestRatio: 0.55,
        cameraDistance: 2.5,
        baseRotationY: 0,
        proceduralIdle: findNaiaIdleSpec(),
        enableUserRotation: true,
        onLoad: () => resolve(),
        onLoadError: (err) => reject(err),
      });
      this.portraits3d.set(charId, portrait);
    });
    this.portraitLoads.set(charId, loadPromise);
    return loadPromise;
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
        baseRotationY: 0,
        proceduralIdle: findNaiaIdleSpec(),
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

    this.abilityIdx = 0;
    this.renderAbility(bible);
    if (bible.abilities.length === 0 && this.focusMode === 'ability') {
      this.setFocusMode('character');
    } else {
      this.updateCycleHint();
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

  private cycleAbility(delta: number): void {
    const c = CHARACTERS[this.selectedIdx]!;
    const bible = BIBLES[c.id]!;
    if (bible.abilities.length === 0) return;
    this.abilityIdx =
      (this.abilityIdx + delta + bible.abilities.length) % bible.abilities.length;
    this.renderAbility(bible);
  }

  private renderAbility(bible: CharBible): void {
    this.abilitySlotsEl.innerHTML = '';
    if (bible.abilities.length === 0) {
      this.abilityNameEl.textContent = 'Em breve';
      this.abilityDescEl.textContent =
        'Habilidades dessa heroína serão reveladas quando ela for jogável.';
      this.cycleHintEl.style.visibility = 'hidden';
      return;
    }
    this.cycleHintEl.style.visibility = '';
    const active = bible.abilities[this.abilityIdx]!;
    for (const ab of bible.abilities) {
      const slot = document.createElement('span');
      slot.className = styles.heroAbilitySlot!;
      slot.textContent = ab.slot;
      slot.dataset.active = ab.slot === active.slot ? 'true' : 'false';
      this.abilitySlotsEl.appendChild(slot);
    }
    this.abilityNameEl.textContent = `${active.slot} · ${active.name}`;
    this.abilityDescEl.textContent = active.desc;
  }

}
