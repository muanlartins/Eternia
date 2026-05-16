export interface CamDevPanelOptions {
  initialZoom: number;
  initialNaiaScale: number;
  onZoomChange: (z: number) => void;
  onNaiaScaleChange: (s: number) => void;
}

export interface CamDevPanel {
  readonly element: HTMLElement;
  toggle(): void;
  show(): void;
  hide(): void;
  getZoom(): number;
  getNaiaScale(): number;
}

const ZOOM_KEY = 'eternia.camZoom';
const NAIA_KEY = 'eternia.naiaScale';

function loadStored(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, v: number) {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* ignore */
  }
}

export function createCamDevPanel(opts: CamDevPanelOptions): CamDevPanel {
  const initialZoom = loadStored(ZOOM_KEY, opts.initialZoom);
  const initialNaia = loadStored(NAIA_KEY, opts.initialNaiaScale);

  let zoom = initialZoom;
  let naiaScale = initialNaia;

  const root = document.createElement('div');
  root.id = 'cam-dev-panel';
  root.style.cssText = [
    'position:fixed',
    'top:80px',
    'right:20px',
    'z-index:9999',
    'background:rgba(8,12,10,0.92)',
    'color:#e8ede9',
    'border:1px solid rgba(106,191,149,0.35)',
    'border-radius:8px',
    'padding:14px 16px',
    'font:12px/1.4 ui-monospace,Menlo,monospace',
    'min-width:240px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.5)',
    'display:none',
  ].join(';');

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <strong style="color:#6abf95;letter-spacing:1px;">CAM DEV</strong>
      <span style="opacity:0.5;">\` to hide</span>
    </div>
    <div class="row" data-key="zoom">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span>Camera zoom</span><input type="number" class="num" step="0.05" min="0.5" max="3" style="width:60px;background:rgba(0,0,0,0.4);color:#e8ede9;border:1px solid rgba(106,191,149,0.2);border-radius:3px;padding:2px 6px;font:inherit;text-align:right;">
      </div>
      <input type="range" class="slider" min="0.5" max="3" step="0.05" style="width:100%;">
    </div>
    <div class="row" data-key="naia" style="margin-top:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span>Naia scale</span><input type="number" class="num" step="0.01" min="0.5" max="3" style="width:60px;background:rgba(0,0,0,0.4);color:#e8ede9;border:1px solid rgba(106,191,149,0.2);border-radius:3px;padding:2px 6px;font:inherit;text-align:right;">
      </div>
      <input type="range" class="slider" min="0.5" max="3" step="0.01" style="width:100%;">
    </div>
    <div style="display:flex;gap:6px;margin-top:14px;">
      <button class="copy" style="flex:1;background:rgba(106,191,149,0.15);color:#e8ede9;border:1px solid rgba(106,191,149,0.35);border-radius:4px;padding:6px 10px;cursor:pointer;font:inherit;">Copy values</button>
      <button class="reset" style="background:rgba(255,255,255,0.05);color:#e8ede9;border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:6px 10px;cursor:pointer;font:inherit;">Reset</button>
    </div>
    <div class="hint" style="margin-top:8px;opacity:0.6;font-size:11px;"></div>
  `;

  const zoomRow = root.querySelector('.row[data-key="zoom"]')!;
  const naiaRow = root.querySelector('.row[data-key="naia"]')!;
  const zoomSlider = zoomRow.querySelector('.slider') as HTMLInputElement;
  const zoomNum = zoomRow.querySelector('.num') as HTMLInputElement;
  const naiaSlider = naiaRow.querySelector('.slider') as HTMLInputElement;
  const naiaNum = naiaRow.querySelector('.num') as HTMLInputElement;
  const copyBtn = root.querySelector('.copy') as HTMLButtonElement;
  const resetBtn = root.querySelector('.reset') as HTMLButtonElement;
  const hint = root.querySelector('.hint') as HTMLDivElement;

  function syncZoomInputs() {
    zoomSlider.value = String(zoom);
    zoomNum.value = zoom.toFixed(2);
  }
  function syncNaiaInputs() {
    naiaSlider.value = String(naiaScale);
    naiaNum.value = naiaScale.toFixed(2);
  }

  function applyZoom(z: number) {
    zoom = clamp(z, 0.5, 3);
    syncZoomInputs();
    store(ZOOM_KEY, zoom);
    opts.onZoomChange(zoom);
  }
  function applyNaia(s: number) {
    naiaScale = clamp(s, 0.5, 3);
    syncNaiaInputs();
    store(NAIA_KEY, naiaScale);
    opts.onNaiaScaleChange(naiaScale);
  }

  zoomSlider.oninput = () => applyZoom(Number(zoomSlider.value));
  zoomNum.oninput = () => applyZoom(Number(zoomNum.value));
  naiaSlider.oninput = () => applyNaia(Number(naiaSlider.value));
  naiaNum.oninput = () => applyNaia(Number(naiaNum.value));

  copyBtn.onclick = () => {
    const snippet = `// main.ts\nconst CAMERA_ZOOM = ${zoom};\n// GameThreeLayer.ts (in loadNaia, replace 1.2)\nobj.scale.setScalar(${naiaScale} / size.y);`;
    void navigator.clipboard.writeText(snippet).then(() => {
      hint.textContent = 'copied snippet to clipboard';
      setTimeout(() => { hint.textContent = ''; }, 2000);
    });
  };
  resetBtn.onclick = () => {
    applyZoom(opts.initialZoom);
    applyNaia(opts.initialNaiaScale);
    hint.textContent = 'reset to defaults';
    setTimeout(() => { hint.textContent = ''; }, 2000);
  };

  syncZoomInputs();
  syncNaiaInputs();

  if (initialZoom !== opts.initialZoom) opts.onZoomChange(initialZoom);
  if (initialNaia !== opts.initialNaiaScale) opts.onNaiaScaleChange(initialNaia);

  return {
    element: root,
    toggle: () => { root.style.display = root.style.display === 'none' ? 'block' : 'none'; },
    show: () => { root.style.display = 'block'; },
    hide: () => { root.style.display = 'none'; },
    getZoom: () => zoom,
    getNaiaScale: () => naiaScale,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
