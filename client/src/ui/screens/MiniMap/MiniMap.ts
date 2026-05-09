import styles from './MiniMap.module.css';

export interface StageEntry {
  readonly id: string;
  readonly name: string;
}

export class MiniMap {
  readonly element: HTMLElement;
  private stagesContainer: HTMLElement;
  private titleEl: HTMLElement;
  private stages: readonly StageEntry[] = [];
  private currentIdx = 0;
  private missionName = '';

  constructor() {
    const root = document.createElement('div');
    root.className = styles.root!;
    root.dataset.visible = 'false';
    root.innerHTML = `
      <div class="${styles.panel}">
        <div class="${styles.panelCorner}"></div>
        <div class="${styles.head}">
          <div class="${styles.eyebrow}">Mapa da jornada</div>
          <h3 class="${styles.title}" data-title>—</h3>
        </div>
        <div class="${styles.stages}" data-stages></div>
        <div class="${styles.hint}">
          <span>Solte <span class="${styles.hintKey}">Tab</span> para fechar</span>
        </div>
      </div>
    `;
    this.element = root;
    this.stagesContainer = root.querySelector('[data-stages]')!;
    this.titleEl = root.querySelector('[data-title]')!;
  }

  setStages(stages: readonly StageEntry[], missionName?: string) {
    this.stages = stages;
    if (missionName !== undefined) this.missionName = missionName;
  }

  show(currentIdx: number) {
    this.currentIdx = currentIdx;
    this.render();
    this.element.dataset.visible = 'true';
  }

  hide() {
    this.element.dataset.visible = 'false';
  }

  isVisible(): boolean {
    return this.element.dataset.visible === 'true';
  }

  private render() {
    this.titleEl.textContent = this.missionName || 'Travessia';
    this.stagesContainer.innerHTML = '';
    for (let i = 0; i < this.stages.length; i++) {
      const s = this.stages[i]!;
      const state =
        i < this.currentIdx ? 'completed' : i === this.currentIdx ? 'current' : 'locked';
      const stateLabel =
        state === 'completed' ? '✓ Concluído' : state === 'current' ? '› Atual' : 'Bloqueado';
      const hint =
        state === 'current'
          ? 'Estágio em andamento'
          : state === 'completed'
            ? 'Atravessado'
            : 'A trilhar';
      const row = document.createElement('div');
      row.className = styles.stage!;
      row.dataset.state = state;
      row.innerHTML = `
        <div class="${styles.stageMarker}">${i + 1}</div>
        <div class="${styles.stageBody}">
          <span class="${styles.stageName}">${escapeHtml(s.name)}</span>
          <span class="${styles.stageHint}">${hint}</span>
        </div>
        <span class="${styles.stageState}">${stateLabel}</span>
      `;
      this.stagesContainer.appendChild(row);
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
