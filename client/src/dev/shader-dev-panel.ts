import {
  DEFAULT_SHADER_CONFIG,
  loadShaderConfig,
  saveShaderConfig,
  type ShaderConfig,
} from '../three/shader-config.js';

export interface ShaderDevPanelOptions {
  /** Models the user can switch between in the dropdown. `id` is used as the localStorage key. */
  models: Array<{ id: string; label: string }>;
  /** Initial active model id. Must be one of `models[].id`. */
  initialModelId: string;
  onConfigChange: (modelId: string, config: ShaderConfig) => void;
  onPullMats?: (modelId: string, url: string) => void;
  /** Optional model-change hook (e.g., reload the game to render the picked model). */
  onModelChange?: (modelId: string) => void;
}

export interface ShaderDevPanel {
  readonly element: HTMLElement;
  toggle(): void;
  show(): void;
  hide(): void;
  /** Force-load + apply a model's persisted config (useful when the active character changes). */
  loadModel(modelId: string): void;
}

const PANEL_W = 320;

export function createShaderDevPanel(opts: ShaderDevPanelOptions): ShaderDevPanel {
  let activeId = opts.initialModelId;
  let cfg: ShaderConfig = loadShaderConfig(activeId);

  const root = document.createElement('div');
  root.id = 'shader-dev-panel';
  root.style.cssText = [
    'position:fixed',
    'top:80px',
    'left:20px',
    'z-index:9999',
    'background:rgba(8,12,10,0.92)',
    'color:#e8ede9',
    'border:1px solid rgba(106,191,149,0.35)',
    'border-radius:8px',
    'padding:14px 16px',
    'font:11px/1.4 ui-monospace,Menlo,monospace',
    `min-width:${PANEL_W}px`,
    `max-width:${PANEL_W}px`,
    'max-height:80vh',
    'overflow-y:auto',
    'box-shadow:0 8px 24px rgba(0,0,0,0.5)',
    'display:none',
  ].join(';');

  const numInput = (sel: string, opts: { min?: number; max?: number; step?: number } = {}) => {
    const o = opts;
    return `<input type="number" data-${sel} step="${o.step ?? 0.05}"${o.min !== undefined ? ` min="${o.min}"` : ''}${o.max !== undefined ? ` max="${o.max}"` : ''} style="width:64px;background:rgba(0,0,0,0.4);color:#e8ede9;border:1px solid rgba(106,191,149,0.2);border-radius:3px;padding:2px 6px;font:inherit;text-align:right;">`;
  };
  const rangeInput = (sel: string, min: number, max: number, step: number) =>
    `<input type="range" data-${sel}-slider min="${min}" max="${max}" step="${step}" style="flex:1 1 0;min-width:0;">`;
  const colorInput = (sel: string, label: string) =>
    `<label style="display:flex;align-items:center;gap:2px;font-size:9px;opacity:0.85;">${label}<input type="color" data-${sel} style="width:24px;height:18px;padding:0;border:0;background:transparent;cursor:pointer;"></label>`;
  const row = (label: string, content: string) =>
    `<div style="display:flex;align-items:center;gap:6px;margin-top:6px;">
       <span style="white-space:nowrap;width:54px;opacity:0.6;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;">${label}</span>
       ${content}
     </div>`;

  const modelOptions = opts.models
    .map((m) => `<option value="${m.id}">${m.label}</option>`)
    .join('');

  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <strong style="color:#6abf95;letter-spacing:1px;">SHADER DEV</strong>
      <span style="opacity:0.5;">L to toggle</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
      <span style="opacity:0.6;">Modelo:</span>
      <select data-model style="flex:1;background:rgba(0,0,0,0.4);color:#e8ede9;border:1px solid rgba(106,191,149,0.2);border-radius:3px;padding:3px 6px;font:inherit;">
        ${modelOptions}
      </select>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
      <label style="display:flex;align-items:center;gap:4px;"><input type="checkbox" data-toon> toon</label>
      <label style="display:flex;align-items:center;gap:4px;"><input type="checkbox" data-outline> outline</label>
      <button data-reset style="margin-left:auto;background:rgba(255,255,255,0.06);color:#e8ede9;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:3px 8px;cursor:pointer;font:inherit;">reset</button>
    </div>
    ${row('expo', `${rangeInput('expo', 0.3, 2, 0.05)}${numInput('expo')}`)}
    ${row('key', `${rangeInput('key', 0, 3, 0.05)}${numInput('key')}`)}
    ${row('rim', `${rangeInput('rim', 0, 3, 0.05)}${numInput('rim')}`)}
    ${row('hemi', `${rangeInput('hemi', 0, 3, 0.05)}${numInput('hemi')}`)}
    ${row('fill', `${rangeInput('fill', 0, 3, 0.05)}${numInput('fill')}`)}
    ${row('key dir', `${numInput('kx', { step: 0.1 })}${numInput('ky', { step: 0.1 })}${numInput('kz', { step: 0.1 })}`)}
    ${row('outline', `${rangeInput('thick', 0, 0.012, 0.0005)}${numInput('thick', { step: 0.0005 })}${numInput('alpha', { min: 0, max: 1, step: 0.05 })}`)}
    ${row('toon ramp', `${numInput('band0', { min: 0, max: 255, step: 5 })}${numInput('band1', { min: 0, max: 255, step: 5 })}${numInput('band2', { min: 0, max: 255, step: 5 })}`)}
    ${row('cores',
      `<div style="display:flex;gap:6px;flex-wrap:wrap;flex:1;">
        ${colorInput('key-color', 'key')}
        ${colorInput('rim-color', 'rim')}
        ${colorInput('hemi-sky', 'hSky')}
        ${colorInput('hemi-gr', 'hGr')}
        ${colorInput('fill-color', 'fill')}
        ${colorInput('outline-color', 'out')}
      </div>`)}
    <div style="display:flex;gap:6px;align-items:center;margin-top:10px;">
      <input type="text" data-mat-url placeholder="/models/naia-mixamo.glb" style="flex:1;background:rgba(0,0,0,0.4);color:#e8ede9;border:1px solid rgba(106,191,149,0.2);border-radius:3px;padding:3px 6px;font:inherit;">
      <button data-mat-pull style="background:rgba(106,191,149,0.18);color:#e8ede9;border:1px solid rgba(106,191,149,0.35);border-radius:3px;padding:3px 8px;cursor:pointer;font:inherit;">pull mats</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button data-preset-copy style="flex:1;background:rgba(255,255,255,0.06);color:#e8ede9;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:4px;cursor:pointer;font:inherit;">📋 export</button>
      <button data-preset-paste style="flex:1;background:rgba(255,255,255,0.06);color:#e8ede9;border:1px solid rgba(255,255,255,0.15);border-radius:3px;padding:4px;cursor:pointer;font:inherit;">📥 import</button>
    </div>
    <div data-hint style="margin-top:6px;opacity:0.6;font-size:10px;min-height:14px;"></div>
  `;

  const q = <T extends HTMLElement>(sel: string): T | null => root.querySelector<T>(sel);
  const hint = q<HTMLElement>('[data-hint]');
  const setHint = (msg: string): void => {
    if (!hint) return;
    hint.textContent = msg;
    window.setTimeout(() => {
      if (hint.textContent === msg) hint.textContent = '';
    }, 2200);
  };

  const setVal = (sel: string, v: string | boolean): void => {
    const el = q<HTMLInputElement>(`[data-${sel}]`);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = String(v);
  };

  const refresh = (): void => {
    setVal('toon', cfg.toonEnabled);
    setVal('outline', cfg.outlineEnabled);
    setVal('expo', cfg.toneExposure.toFixed(2));
    setVal('expo-slider', String(cfg.toneExposure));
    setVal('key', cfg.keyIntensity.toFixed(2));
    setVal('key-slider', String(cfg.keyIntensity));
    setVal('rim', cfg.rimIntensity.toFixed(2));
    setVal('rim-slider', String(cfg.rimIntensity));
    setVal('hemi', cfg.hemiIntensity.toFixed(2));
    setVal('hemi-slider', String(cfg.hemiIntensity));
    setVal('fill', cfg.fillIntensity.toFixed(2));
    setVal('fill-slider', String(cfg.fillIntensity));
    setVal('kx', cfg.keyDirX.toFixed(1));
    setVal('ky', cfg.keyDirY.toFixed(1));
    setVal('kz', cfg.keyDirZ.toFixed(1));
    setVal('thick', cfg.outlineThickness.toFixed(4));
    setVal('thick-slider', String(cfg.outlineThickness));
    setVal('alpha', cfg.outlineAlpha.toFixed(2));
    setVal('band0', String(cfg.toonBand0));
    setVal('band1', String(cfg.toonBand1));
    setVal('band2', String(cfg.toonBand2));
    setVal('key-color', cfg.keyColor);
    setVal('rim-color', cfg.rimColor);
    setVal('hemi-sky', cfg.hemiSkyColor);
    setVal('hemi-gr', cfg.hemiGroundColor);
    setVal('fill-color', cfg.fillColor);
    setVal('outline-color', cfg.outlineColor);
    setVal('model', activeId);
  };

  const commit = (): void => {
    saveShaderConfig(activeId, cfg);
    opts.onConfigChange(activeId, cfg);
  };

  const bindNum = (key: keyof ShaderConfig, name: string, sliderName?: string): void => {
    const inp = q<HTMLInputElement>(`[data-${name}]`);
    const sl = sliderName ? q<HTMLInputElement>(`[data-${sliderName}]`) : null;
    const handler = (val: string): void => {
      const v = Number(val);
      if (!Number.isFinite(v)) return;
      (cfg[key] as number) = v;
      if (sl && sl.value !== val) sl.value = val;
      if (inp && inp.value !== val) inp.value = val;
      commit();
    };
    inp?.addEventListener('input', () => handler(inp.value));
    sl?.addEventListener('input', () => handler(sl.value));
  };
  const bindBool = (key: keyof ShaderConfig, name: string): void => {
    const inp = q<HTMLInputElement>(`[data-${name}]`);
    inp?.addEventListener('change', () => {
      (cfg[key] as boolean) = inp.checked;
      commit();
    });
  };
  const bindColor = (key: keyof ShaderConfig, name: string): void => {
    const inp = q<HTMLInputElement>(`[data-${name}]`);
    inp?.addEventListener('input', () => {
      (cfg[key] as string) = inp.value;
      commit();
    });
  };

  bindBool('toonEnabled', 'toon');
  bindBool('outlineEnabled', 'outline');
  bindNum('toneExposure', 'expo', 'expo-slider');
  bindNum('keyIntensity', 'key', 'key-slider');
  bindNum('rimIntensity', 'rim', 'rim-slider');
  bindNum('hemiIntensity', 'hemi', 'hemi-slider');
  bindNum('fillIntensity', 'fill', 'fill-slider');
  bindNum('keyDirX', 'kx');
  bindNum('keyDirY', 'ky');
  bindNum('keyDirZ', 'kz');
  bindNum('outlineThickness', 'thick', 'thick-slider');
  bindNum('outlineAlpha', 'alpha');
  bindNum('toonBand0', 'band0');
  bindNum('toonBand1', 'band1');
  bindNum('toonBand2', 'band2');
  bindColor('keyColor', 'key-color');
  bindColor('rimColor', 'rim-color');
  bindColor('hemiSkyColor', 'hemi-sky');
  bindColor('hemiGroundColor', 'hemi-gr');
  bindColor('fillColor', 'fill-color');
  bindColor('outlineColor', 'outline-color');

  q<HTMLSelectElement>('[data-model]')?.addEventListener('change', (e) => {
    const next = (e.target as HTMLSelectElement).value;
    activeId = next;
    cfg = loadShaderConfig(activeId);
    refresh();
    commit();
    opts.onModelChange?.(activeId);
    setHint(`modelo: ${activeId}`);
  });

  q<HTMLButtonElement>('[data-reset]')?.addEventListener('click', () => {
    cfg = { ...DEFAULT_SHADER_CONFIG };
    refresh();
    commit();
    setHint(`reset · ${activeId}`);
  });

  q<HTMLButtonElement>('[data-mat-pull]')?.addEventListener('click', () => {
    const url = q<HTMLInputElement>('[data-mat-url]')?.value.trim() || '';
    if (!url) {
      setHint('preencha o URL');
      return;
    }
    opts.onPullMats?.(activeId, url);
    setHint(`pull mats · ${url}`);
  });

  q<HTMLButtonElement>('[data-preset-copy]')?.addEventListener('click', () => {
    const json = JSON.stringify({ modelId: activeId, config: cfg }, null, 2);
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(json).then(
        () => setHint(`copiado · ${json.length} chars`),
        () => {
          console.log('[ShaderDev] preset:\n', json);
          setHint('clipboard bloqueado — console');
        },
      );
    } else {
      console.log('[ShaderDev] preset:\n', json);
      setHint('console (clipboard indisponível)');
    }
  });

  q<HTMLButtonElement>('[data-preset-paste]')?.addEventListener('click', () => {
    const raw = window.prompt('cola JSON do preset:');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { config?: Partial<ShaderConfig>; modelId?: string };
      const fromCfg = parsed.config ?? (parsed as Partial<ShaderConfig>);
      cfg = { ...DEFAULT_SHADER_CONFIG, ...fromCfg };
      refresh();
      commit();
      setHint('preset aplicado');
    } catch {
      setHint('JSON inválido');
    }
  });

  refresh();
  // Apply initial config immediately
  opts.onConfigChange(activeId, cfg);

  return {
    element: root,
    toggle: () => {
      root.style.display = root.style.display === 'none' ? 'block' : 'none';
    },
    show: () => {
      root.style.display = 'block';
    },
    hide: () => {
      root.style.display = 'none';
    },
    loadModel: (modelId: string) => {
      activeId = modelId;
      cfg = loadShaderConfig(activeId);
      refresh();
      commit();
    },
  };
}
