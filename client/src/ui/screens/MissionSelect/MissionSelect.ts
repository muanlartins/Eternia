import styles from './MissionSelect.module.css';
import { MISSIONS, type MissionSpec } from '../../../data/missions.js';
import continentImg from '../../../assets/world-map/continent.png';
import nodeForestImg from '../../../assets/world-map/node-forest.png';
import nodeLockedImg from '../../../assets/world-map/node-locked.png';

interface MapNode {
  readonly id: string;
  readonly missionId: string;
  readonly xPct: number;
  readonly yPct: number;
  readonly unlocked: boolean;
  readonly iconUrl: string;
  readonly label: string;
}

const NODES: readonly MapNode[] = [
  { id: 'forest', missionId: 'forest', xPct: 24, yPct: 42, unlocked: true,  iconUrl: nodeForestImg, label: 'Floresta dos Elfos' },
  { id: 'swamp',  missionId: 'swamp',  xPct: 72, yPct: 62, unlocked: false, iconUrl: nodeLockedImg, label: '???' },
];

export interface MissionSelectShowOptions {
  onSelectMission: (mission: MissionSpec) => void;
  onBack?: () => void;
}

export class MissionSelect {
  readonly element: HTMLElement;
  private opts: MissionSelectShowOptions | null = null;
  private nodeEls: HTMLElement[] = [];
  private selectedIdx = 0;

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';

    root.innerHTML = `
      <div class="${styles.atmosphere}">
        <div class="${styles.vignette}"></div>
        <div class="${styles.motes}"></div>
        <div class="${styles.grain}"></div>
      </div>

      <button class="${styles.heroSwap}" data-back type="button" title="Trocar herói (Esc)">
        <span class="${styles.heroSwapArrow}">←</span>
        <span class="${styles.heroSwapLabel}">Trocar herói</span>
      </button>

      <div class="${styles.mapStage}">
        <div class="${styles.mapFrame}">
          <img class="${styles.mapImg}" src="${continentImg}" alt="" draggable="false" />
          <svg class="${styles.trail}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path data-trail fill="none"
              stroke="rgba(245, 200, 112, 0.5)" stroke-width="0.45"
              stroke-dasharray="1.6,1.4" stroke-linecap="round" />
          </svg>
          <div class="${styles.nodes}" data-nodes></div>
        </div>
      </div>
    `;

    this.element = root;

    const nodesEl = root.querySelector('[data-nodes]')!;
    const trailEl = root.querySelector('[data-trail]') as SVGPathElement;

    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i]!;
      const btn = document.createElement('button');
      btn.className = styles.node!;
      btn.type = 'button';
      btn.dataset.idx = String(i);
      btn.dataset.locked = n.unlocked ? 'false' : 'true';
      btn.style.left = `${n.xPct}%`;
      btn.style.top = `${n.yPct}%`;
      btn.title = n.label;
      btn.innerHTML = `
        <span class="${styles.nodePulse}"></span>
        <span class="${styles.nodeIconWrap}">
          <img class="${styles.nodeIcon}" src="${n.iconUrl}" alt="" draggable="false" />
        </span>
        <span class="${styles.nodeLabel}">${n.label}</span>
      `;
      btn.addEventListener('click', () => this.onNodeClick(i));
      nodesEl.appendChild(btn);
      this.nodeEls.push(btn);
    }

    if (NODES.length >= 2) {
      let d = `M ${NODES[0]!.xPct},${NODES[0]!.yPct}`;
      for (let i = 1; i < NODES.length; i++) {
        const prev = NODES[i - 1]!;
        const cur = NODES[i]!;
        const cx = (prev.xPct + cur.xPct) / 2;
        const cy = Math.min(prev.yPct, cur.yPct) - 8;
        d += ` Q ${cx},${cy} ${cur.xPct},${cur.yPct}`;
      }
      trailEl.setAttribute('d', d);
    }

    const backBtn = root.querySelector('[data-back]') as HTMLButtonElement;
    backBtn.addEventListener('click', () => this.opts?.onBack?.());

    document.addEventListener('keydown', this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.element.dataset.visible !== 'true') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.opts?.onBack?.();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.cycleNode(1);
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.cycleNode(-1);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.confirmSelected();
    }
  };

  private cycleNode(delta: number) {
    let next = this.selectedIdx;
    for (let step = 0; step < NODES.length; step++) {
      next = (next + delta + NODES.length) % NODES.length;
      if (NODES[next]?.unlocked) {
        this.setSelectedIdx(next);
        return;
      }
    }
  }

  private setSelectedIdx(idx: number) {
    this.selectedIdx = idx;
    for (let j = 0; j < this.nodeEls.length; j++) {
      this.nodeEls[j]!.dataset.selected = j === idx ? 'true' : 'false';
    }
  }

  private confirmSelected() {
    const node = NODES[this.selectedIdx];
    if (!node || !node.unlocked) return;
    const mission = MISSIONS.find((m) => m.id === node.missionId);
    if (!mission || !mission.available) return;
    this.opts?.onSelectMission(mission);
  }

  private onNodeClick(idx: number) {
    const node = NODES[idx];
    if (!node || !node.unlocked) return;
    this.setSelectedIdx(idx);
    const mission = MISSIONS.find((m) => m.id === node.missionId);
    if (!mission || !mission.available) return;
    this.opts?.onSelectMission(mission);
  }

  show(opts: MissionSelectShowOptions) {
    this.opts = opts;
    const firstUnlocked = NODES.findIndex((n) => n.unlocked);
    this.setSelectedIdx(firstUnlocked >= 0 ? firstUnlocked : 0);
    this.element.dataset.visible = 'true';
  }

  hide() {
    this.element.dataset.visible = 'false';
    this.opts = null;
  }
}
