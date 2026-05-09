import styles from './Hud.module.css';
import type { Player } from '../../../game/Player.js';

const SKILL_KEYS = ['1', '2', '3'];
const SKILL_GLYPHS = ['I', 'II', 'III'];

export interface HudUpdateOptions {
  player: Player;
  characterName: string;
  lives: number;
  maxLives: number;
  stageIdx: number;
  stageName: string;
  totalStages: number;
  aliveCount: number;
  serverInfo: string;
  runMs: number;
}

interface CachedState {
  hpPct: number;
  hpText: string;
  mpPct: number;
  mpText: string;
  chargeTier: number;
  chargeX: number;
  charging: boolean;
  dodgeFilled: number;
  dodgeMax: number;
  parryActive: boolean;
  parryText: string;
  skillCds: [number, number, number];
  livesText: string;
  livesCount: number;
  livesMax: number;
  stageText: string;
  mobsText: string;
  buffsHTML: string;
  timerText: string;
  serverInfo: string;
  characterName: string;
}

export class HtmlHud {
  readonly element: HTMLElement;
  private hpFill: HTMLElement;
  private hpValue: HTMLElement;
  private mpFill: HTMLElement;
  private mpValue: HTMLElement;
  private mpTicksEl: HTMLElement;
  private mpCursor: HTMLElement;
  private dodgeRow: HTMLElement;
  private parryEl: HTMLElement;
  private parryText: HTMLElement;
  private skillSlots: HTMLElement[] = [];
  private skillCdLabels: HTMLElement[] = [];
  private skillCostLabels: HTMLElement[] = [];
  private skillSweeps: HTMLElement[] = [];
  private livesEl: HTMLElement;
  private nameEl: HTMLElement;
  private buffsEl: HTMLElement;
  private timerEl: HTMLElement;
  private serverInfoEl: HTMLElement;
  private stageBadgeEl: HTMLElement;
  private stageNameEl: HTMLElement;
  private stageMobsEl: HTMLElement;

  private cache: CachedState = {
    hpPct: -1, hpText: '', mpPct: -1, mpText: '',
    chargeTier: -1, chargeX: -1, charging: false,
    dodgeFilled: -1, dodgeMax: -1,
    parryActive: false, parryText: '',
    skillCds: [-1, -1, -1],
    livesText: '', livesCount: -1, livesMax: -1,
    stageText: '', mobsText: '',
    buffsHTML: '', timerText: '', serverInfo: '',
    characterName: '',
  };

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';

    root.innerHTML = `
      <div class="${styles.vitals}">
        <div class="${styles.vitalsHead}">
          <span class="${styles.vitalsName}" data-name>—</span>
          <div class="${styles.vitalsLives}" data-lives></div>
        </div>
        <div class="${styles.bar} ${styles.hpBar}">
          <div class="${styles.barFill}" data-hpfill style="transform: scaleX(1)"></div>
          <span class="${styles.barLabel}">HP</span>
          <span class="${styles.barValue}" data-hpvalue>—</span>
        </div>
        <div class="${styles.bar} ${styles.mpBar}">
          <div class="${styles.barFill}" data-mpfill style="transform: scaleX(0)"></div>
          <div class="${styles.mpTicks}" data-mpticks></div>
          <div class="${styles.mpCursor}" data-mpcursor data-tier="0" style="display:none"></div>
          <span class="${styles.barLabel}">MP</span>
          <span class="${styles.barValue}" data-mpvalue>—</span>
        </div>
        <div class="${styles.dodge}" data-dodge></div>
        <div class="${styles.parryBuff}" data-parry data-active="false">
          <span class="${styles.parryBuffStar}">★</span>
          <span data-parrytext>PARRY</span>
        </div>
        <div class="${styles.buffs}" data-buffs></div>
      </div>

      <div class="${styles.stageInfo}" data-stageinfo>
        <span class="${styles.stageBadge}" data-stagebadge>STAGE 1/4</span>
        <span class="${styles.stageDivider}"></span>
        <span data-stagename>—</span>
        <span class="${styles.stageDivider}"></span>
        <span class="${styles.stageMobs}" data-stagemobs>0 mobs</span>
      </div>

      <div class="${styles.meta}">
        <div class="${styles.timer}">
          <span class="${styles.timerDot}"></span>
          <span class="${styles.timerValue}" data-timer>0:00</span>
        </div>
        <span class="${styles.serverInfo}" data-server></span>
      </div>

      <div class="${styles.skillTray}" data-skilltray>
        <div class="${styles.quickSlot}">
          <span class="${styles.quickSlotKey}">Z</span>
          <span class="${styles.quickSlotGlyph}">·</span>
        </div>
        <span class="${styles.skillTrayDivider}"></span>
        ${[0, 1, 2]
          .map(
            (i) => `
              <div class="${styles.skillSlot}" data-skillslot data-idx="${i}" data-ready="true">
                <div class="${styles.skillSlotSweep}"></div>
                <span class="${styles.skillSlotKey}">${SKILL_KEYS[i]}</span>
                <span class="${styles.skillSlotGlyph}">${SKILL_GLYPHS[i]}</span>
                <span class="${styles.skillSlotCost}" data-skillcost>—</span>
                <div class="${styles.skillSlotCd}" data-skillcd>0.0</div>
              </div>
            `,
          )
          .join('')}
      </div>
    `;

    this.element = root;
    this.hpFill = root.querySelector('[data-hpfill]')!;
    this.hpValue = root.querySelector('[data-hpvalue]')!;
    this.mpFill = root.querySelector('[data-mpfill]')!;
    this.mpValue = root.querySelector('[data-mpvalue]')!;
    this.mpTicksEl = root.querySelector('[data-mpticks]')!;
    this.mpCursor = root.querySelector('[data-mpcursor]')!;
    this.dodgeRow = root.querySelector('[data-dodge]')!;
    this.parryEl = root.querySelector('[data-parry]')!;
    this.parryText = root.querySelector('[data-parrytext]')!;
    this.livesEl = root.querySelector('[data-lives]')!;
    this.nameEl = root.querySelector('[data-name]')!;
    this.buffsEl = root.querySelector('[data-buffs]')!;
    this.timerEl = root.querySelector('[data-timer]')!;
    this.serverInfoEl = root.querySelector('[data-server]')!;
    this.stageBadgeEl = root.querySelector('[data-stagebadge]')!;
    this.stageNameEl = root.querySelector('[data-stagename]')!;
    this.stageMobsEl = root.querySelector('[data-stagemobs]')!;

    this.skillSlots = Array.from(root.querySelectorAll<HTMLElement>('[data-skillslot]'));
    this.skillCdLabels = Array.from(root.querySelectorAll<HTMLElement>('[data-skillcd]'));
    this.skillCostLabels = Array.from(root.querySelectorAll<HTMLElement>('[data-skillcost]'));
    this.skillSweeps = this.skillSlots.map(
      (s) => s.querySelector(`.${styles.skillSlotSweep}`) as HTMLElement,
    );
  }

  show() {
    this.element.dataset.visible = 'true';
  }

  hide() {
    this.element.dataset.visible = 'false';
  }

  isVisible(): boolean {
    return this.element.dataset.visible === 'true';
  }

  update(opts: HudUpdateOptions) {
    const { player, characterName, lives, maxLives, stageIdx, stageName, totalStages, aliveCount, serverInfo, runMs } = opts;
    const spec = player.spec;

    if (this.cache.characterName !== characterName) {
      this.cache.characterName = characterName;
      this.nameEl.textContent = characterName;
    }

    if (this.cache.livesCount !== lives || this.cache.livesMax !== maxLives) {
      this.cache.livesCount = lives;
      this.cache.livesMax = maxLives;
      this.livesEl.innerHTML = '';
      for (let i = 0; i < maxLives; i++) {
        const heart = document.createElement('span');
        heart.className = `${styles.vitalsHeart} ${i < lives ? '' : styles.vitalsHeartLost}`;
        this.livesEl.appendChild(heart);
      }
    }

    const maxHp = player.getMaxHp();
    const hpPct = Math.max(0, Math.min(1, player.hp / maxHp));
    if (Math.abs(this.cache.hpPct - hpPct) > 0.005) {
      this.cache.hpPct = hpPct;
      this.hpFill.style.transform = `scaleX(${hpPct})`;
    }
    const hpText = `${Math.round(player.hp)} / ${maxHp}`;
    if (this.cache.hpText !== hpText) {
      this.cache.hpText = hpText;
      this.hpValue.textContent = hpText;
    }

    const maxMp = spec.maxMp;
    const mpPct = Math.max(0, Math.min(1, player.mp / maxMp));
    if (Math.abs(this.cache.mpPct - mpPct) > 0.005) {
      this.cache.mpPct = mpPct;
      this.mpFill.style.transform = `scaleX(${mpPct})`;
    }
    const mpText = `${Math.round(player.mp)} / ${maxMp}`;
    if (this.cache.mpText !== mpText) {
      this.cache.mpText = mpText;
      this.mpValue.textContent = mpText;
    }

    if (!this.mpTicksEl.firstChild) {
      const costs = [
        spec.skills.s1.mpCost,
        spec.skills.s2.mpCost,
        spec.skills.s3.mpCost,
      ];
      for (const cost of costs) {
        const tick = document.createElement('span');
        tick.className = styles.mpTick!;
        tick.style.left = `${(cost / maxMp) * 100}%`;
        this.mpTicksEl.appendChild(tick);
      }
    }

    const charging = player.chargingActive;
    if (charging) {
      const cap = spec.chargeTier3Ms;
      const progress = Math.min(1, player.chargingMs / cap);
      const cursorMp = progress * spec.skills.s3.mpCost;
      const cursorPct = (cursorMp / maxMp) * 100;
      let tier = 0;
      if (player.chargingMs >= cap) tier = 3;
      else if (player.chargingMs >= spec.chargeTier2Ms) tier = 2;
      else if (player.chargingMs >= spec.chargeTier1Ms) tier = 1;
      if (this.cache.charging !== charging) {
        this.cache.charging = true;
        this.mpCursor.style.display = 'block';
      }
      if (this.cache.chargeTier !== tier) {
        this.cache.chargeTier = tier;
        this.mpCursor.dataset.tier = String(tier);
      }
      if (Math.abs(this.cache.chargeX - cursorPct) > 0.5) {
        this.cache.chargeX = cursorPct;
        this.mpCursor.style.left = `calc(${cursorPct}% - 1.5px)`;
      }
    } else if (this.cache.charging) {
      this.cache.charging = false;
      this.mpCursor.style.display = 'none';
    }

    const dodgeMax = spec.dodgeBarMax;
    const dodgeFilled = Math.floor(player.dodgeBar);
    if (this.cache.dodgeMax !== dodgeMax || this.cache.dodgeFilled !== dodgeFilled) {
      this.cache.dodgeMax = dodgeMax;
      this.cache.dodgeFilled = dodgeFilled;
      this.dodgeRow.innerHTML = '';
      for (let i = 0; i < dodgeMax; i++) {
        const chip = document.createElement('span');
        chip.className = `${styles.dodgeChip} ${i < dodgeFilled ? styles.dodgeChipFilled : ''}`;
        this.dodgeRow.appendChild(chip);
      }
    }

    const parryActive = player.hasParryBuff();
    if (parryActive) {
      const text = `PARRY ×${spec.parryBuffDamageMul.toFixed(1)} · ${(player.parryBuffMs / 1000).toFixed(1)}s`;
      if (this.cache.parryText !== text) {
        this.cache.parryText = text;
        this.parryText.textContent = text;
      }
      if (!this.cache.parryActive) {
        this.cache.parryActive = true;
        this.parryEl.dataset.active = 'true';
      }
    } else if (this.cache.parryActive) {
      this.cache.parryActive = false;
      this.parryEl.dataset.active = 'false';
    }

    for (let i = 0; i < 3; i++) {
      const cd = player.skillCooldowns[i]!;
      const wasReady = this.cache.skillCds[i]! <= 0;
      const isReady = cd <= 0;
      const cost = this.getSkillCost(spec, i);
      const costText = `${cost}MP`;
      if (this.skillCostLabels[i]!.textContent !== costText) {
        this.skillCostLabels[i]!.textContent = costText;
      }
      if (wasReady !== isReady) {
        this.skillSlots[i]!.dataset.ready = isReady ? 'true' : 'false';
      }
      if (Math.abs(this.cache.skillCds[i]! - cd) > 30) {
        this.cache.skillCds[i] = cd;
        if (isReady) {
          if (this.skillCdLabels[i]!.textContent !== '') this.skillCdLabels[i]!.textContent = '';
        } else {
          this.skillCdLabels[i]!.textContent = `${(cd / 1000).toFixed(1)}s`;
          const totalCd = this.getSkillTotalCd(spec, i);
          const pct = Math.max(0, Math.min(100, ((totalCd - cd) / totalCd) * 100));
          this.skillSweeps[i]!.style.setProperty('--cd-pct', `${pct}%`);
        }
      }
    }

    const modName = player.acquiredModifier?.name;
    const buffNames = player.acquiredBuffs.map((b) => b.name);
    let buffsHTML = '';
    if (modName) {
      buffsHTML += `<span class="${styles.buffsModifier}">★ ${modName}</span>`;
    }
    if (buffNames.length > 0) {
      buffsHTML += `<span class="${styles.buffsLabel}">path:</span>${buffNames.join(' · ')}`;
    }
    if (this.cache.buffsHTML !== buffsHTML) {
      this.cache.buffsHTML = buffsHTML;
      this.buffsEl.innerHTML = buffsHTML;
    }

    const stageText = `Stage ${stageIdx + 1}/${totalStages}`;
    if (this.cache.stageText !== stageText) {
      this.cache.stageText = stageText;
      this.stageBadgeEl.textContent = stageText;
      this.stageNameEl.textContent = stageName;
    }
    const mobsText = `${aliveCount} mobs`;
    if (this.cache.mobsText !== mobsText) {
      this.cache.mobsText = mobsText;
      this.stageMobsEl.textContent = mobsText;
    }

    const totalSec = Math.floor(runMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const timerText = `${min}:${String(sec).padStart(2, '0')}`;
    if (this.cache.timerText !== timerText) {
      this.cache.timerText = timerText;
      this.timerEl.textContent = timerText;
    }

    if (this.cache.serverInfo !== serverInfo) {
      this.cache.serverInfo = serverInfo;
      this.serverInfoEl.textContent = serverInfo;
    }
  }

  private getSkillCost(spec: Player['spec'], i: number): number {
    if (i === 0) return spec.skills.s1.mpCost;
    if (i === 1) return spec.skills.s2.mpCost;
    return spec.skills.s3.mpCost;
  }

  private getSkillTotalCd(spec: Player['spec'], i: number): number {
    if (i === 0) return spec.skills.s1.cooldownMs;
    if (i === 1) return spec.skills.s2.cooldownMs;
    return spec.skills.s3.cooldownMs;
  }
}
