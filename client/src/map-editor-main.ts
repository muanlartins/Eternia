import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { getStageData } from './data/stage-data.js';
import type { Shape, ShapeKind, SpawnEntry, StageData } from './data/stage-data.js';

type Tool = 'solid' | 'oneway' | 'trigger' | 'spawn' | 'start' | 'select';

interface EditorState {
  stage: StageData;
  shapes: Shape[];
  spawns: SpawnEntry[];
  playerStart: { x: number; y: number };
  selectedIdx: number | null;
  tool: Tool;
  spawnType: string;
  snap: number;
  dirty: boolean;
}

const URL_PARAMS = new URLSearchParams(location.search);
const STAGE_ID = URL_PARAMS.get('stage') ?? 'forest-1-1';

const KIND_COLOR: Record<ShapeKind, number> = {
  solid: 0x22c55e,
  oneway: 0xfacc15,
  trigger: 0x3b82f6,
};

const SPAWN_TYPES = [
  'slim',
  'racoon',
  'archer',
  'brute',
  'wisp',
  'bog-frog',
  'mire-wraith',
  'insectivorous',
  'drowned-king',
] as const;

async function main() {
  const initial = getStageData(STAGE_ID);
  if (!initial) {
    document.body.innerHTML = `<pre style="color:#f88;padding:24px">stage not found: ${STAGE_ID}</pre>`;
    return;
  }

  const state: EditorState = {
    stage: initial,
    shapes: [...initial.shapes],
    spawns: [...initial.spawns],
    playerStart: { ...initial.playerStart },
    selectedIdx: null,
    tool: 'select',
    spawnType: 'slim',
    snap: 8,
    dirty: false,
  };

  const wrap = document.getElementById('editor-canvas-wrap')!;
  const toolbar = document.getElementById('editor-toolbar')!;
  const sideList = document.getElementById('shapes-list')!;
  const statusBar = document.getElementById('status-bar')!;

  const app = new Application();
  await app.init({
    width: state.stage.width,
    height: state.stage.height,
    background: 0x0d1614,
    antialias: true,
  });
  app.canvas.style.width = `${state.stage.width}px`;
  app.canvas.style.height = `${state.stage.height}px`;
  wrap.appendChild(app.canvas);

  const layers = {
    image: new Container(),
    shapes: new Container(),
    spawns: new Container(),
    selection: new Container(),
    drag: new Container(),
  };
  app.stage.addChild(layers.image);
  app.stage.addChild(layers.shapes);
  app.stage.addChild(layers.spawns);
  app.stage.addChild(layers.selection);
  app.stage.addChild(layers.drag);

  const placeholder = new Graphics();
  placeholder
    .rect(0, 0, state.stage.width, state.stage.height)
    .fill({ color: 0x152018, alpha: 1 });
  layers.image.addChild(placeholder);

  if (state.stage.ground) {
    try {
      const tex = (await Assets.load(state.stage.ground.image)) as Texture;
      const sprite = new Sprite(tex);
      sprite.x = 0;
      sprite.y = state.stage.ground.y;
      sprite.width = state.stage.width;
      sprite.height = state.stage.ground.h;
      sprite.alpha = 0.9;
      layers.image.addChild(sprite);
    } catch (err) {
      const note = new Text({
        text: `(ground not at ${state.stage.ground.image})`,
        style: { fill: 0xff8888, fontSize: 12, fontFamily: 'monospace' },
      });
      note.x = 20;
      note.y = state.stage.ground.y + 8;
      layers.image.addChild(note);
    }
  }

  for (const sh of state.shapes) {
    if (!sh.image) continue;
    try {
      const tex = (await Assets.load(sh.image)) as Texture;
      const sprite = new Sprite(tex);
      sprite.x = sh.x;
      sprite.y = sh.y;
      sprite.width = sh.w;
      sprite.height = sh.h;
      sprite.alpha = 0.85;
      layers.image.addChild(sprite);
    } catch {
      // shape sprite missing — fine, AABB still drawn by overlay
    }
  }

  function buildToolbar() {
    toolbar.innerHTML = '';
    const stageEl = document.createElement('span');
    stageEl.className = 'stage-id';
    stageEl.textContent = state.stage.id;
    toolbar.appendChild(stageEl);

    const sep1 = document.createElement('div');
    sep1.className = 'sep';
    toolbar.appendChild(sep1);

    const toolGroup = document.createElement('div');
    toolGroup.className = 'group';
    const tools: { id: Tool; label: string; key: string }[] = [
      { id: 'select', label: 'Select', key: 'V' },
      { id: 'solid', label: 'Solid', key: 'S' },
      { id: 'oneway', label: 'OneWay', key: 'O' },
      { id: 'trigger', label: 'Trigger', key: 'T' },
      { id: 'spawn', label: 'Spawn', key: 'M' },
      { id: 'start', label: 'Start', key: 'P' },
    ];
    for (const t of tools) {
      const btn = document.createElement('button');
      btn.dataset.active = t.id === state.tool ? 'true' : 'false';
      btn.textContent = `${t.label} (${t.key})`;
      btn.onclick = () => setTool(t.id);
      toolGroup.appendChild(btn);
    }
    toolbar.appendChild(toolGroup);

    if (state.tool === 'spawn') {
      const sep = document.createElement('div');
      sep.className = 'sep';
      toolbar.appendChild(sep);
      const select = document.createElement('select');
      select.style.cssText = 'background:rgba(0,0,0,0.4);color:#e8ede9;border:1px solid rgba(106,191,149,0.2);padding:6px 10px;border-radius:4px;font-family:inherit;font-size:inherit;';
      for (const t of SPAWN_TYPES) {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (t === state.spawnType) opt.selected = true;
        select.appendChild(opt);
      }
      select.onchange = () => {
        state.spawnType = select.value;
      };
      toolbar.appendChild(select);
    }

    const sep2 = document.createElement('div');
    sep2.className = 'sep';
    toolbar.appendChild(sep2);

    const snapBtn = document.createElement('button');
    snapBtn.textContent = `Snap ${state.snap}px (G)`;
    snapBtn.dataset.active = state.snap > 1 ? 'true' : 'false';
    snapBtn.onclick = toggleSnap;
    toolbar.appendChild(snapBtn);

    const grow = document.createElement('div');
    grow.className = 'grow';
    toolbar.appendChild(grow);

    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test ▶';
    testBtn.onclick = () => window.open(`/?stage=${state.stage.id}`, '_blank');
    toolbar.appendChild(testBtn);

    const debugBtn = document.createElement('button');
    debugBtn.textContent = 'Test +debug ▶';
    debugBtn.onclick = () => window.open(`/?stage=${state.stage.id}&debug=physics`, '_blank');
    toolbar.appendChild(debugBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = state.dirty ? 'Save * (Ctrl+S)' : 'Save (Ctrl+S)';
    saveBtn.onclick = save;
    toolbar.appendChild(saveBtn);
  }

  function setTool(t: Tool) {
    state.tool = t;
    state.selectedIdx = null;
    buildToolbar();
    renderSide();
    renderSelection();
  }

  function toggleSnap() {
    state.snap = state.snap === 8 ? 1 : 8;
    buildToolbar();
  }

  function renderShapes() {
    const g = new Graphics();
    for (let i = 0; i < state.shapes.length; i++) {
      const s = state.shapes[i]!;
      const color = KIND_COLOR[s.kind];
      const alpha = s.kind === 'oneway' ? 0.45 : 0.32;
      g.rect(s.x, s.y, s.w, s.h)
        .fill({ color, alpha })
        .stroke({ color, width: 2, alpha: 0.95 });
    }
    layers.shapes.removeChildren();
    layers.shapes.addChild(g);
  }

  function renderSpawns() {
    layers.spawns.removeChildren();
    const r = 14;
    for (let i = 0; i < state.spawns.length; i++) {
      const s = state.spawns[i]!;
      const cx = s.x;
      const cy = s.y ?? state.stage.height - 64;
      const dot = new Graphics();
      dot.circle(cx, cy, r)
        .fill({ color: 0xef4444, alpha: 0.55 })
        .stroke({ color: 0xff8888, width: 2, alpha: 0.95 });
      layers.spawns.addChild(dot);

      const label = new Text({
        text: s.type,
        style: { fill: 0xffffff, fontSize: 10, fontFamily: 'monospace', stroke: { color: 0x000, width: 3 } },
      });
      label.anchor.set(0.5, 0.5);
      label.x = cx;
      label.y = cy + r + 8;
      layers.spawns.addChild(label);
    }

    const ps = state.playerStart;
    const star = new Graphics();
    const sr = 16;
    star.star(ps.x, ps.y, 5, sr, sr * 0.5)
      .fill({ color: 0xfff066, alpha: 0.6 })
      .stroke({ color: 0xffffff, width: 2, alpha: 0.95 });
    layers.spawns.addChild(star);

    const startLabel = new Text({
      text: 'start',
      style: { fill: 0xfff066, fontSize: 10, fontFamily: 'monospace', stroke: { color: 0x000, width: 3 } },
    });
    startLabel.anchor.set(0.5, 0.5);
    startLabel.x = ps.x;
    startLabel.y = ps.y + sr + 8;
    layers.spawns.addChild(startLabel);
  }

  function renderSelection() {
    layers.selection.removeChildren();
    if (state.selectedIdx === null) return;
    const s = state.shapes[state.selectedIdx];
    if (!s) return;
    const g = new Graphics();
    g.rect(s.x - 2, s.y - 2, s.w + 4, s.h + 4)
      .stroke({ color: 0xffffff, width: 2, alpha: 1 });
    g.rect(s.x - 5, s.y - 5, s.w + 10, s.h + 10)
      .stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
    layers.selection.addChild(g);
  }

  function renderSide() {
    sideList.innerHTML = '';
    for (let i = 0; i < state.shapes.length; i++) {
      const s = state.shapes[i]!;
      const row = document.createElement('div');
      row.className = 'shape-row';
      row.dataset.selected = state.selectedIdx === i ? 'true' : 'false';
      row.onclick = () => {
        state.selectedIdx = i;
        renderSelection();
        renderSide();
      };
      const swatch = document.createElement('span');
      swatch.className = `swatch ${s.kind}`;
      row.appendChild(swatch);
      const text = document.createElement('span');
      text.innerHTML = `<strong>${s.kind}</strong>${s.id ? `:${s.id}` : ''}<br><span class="meta">${s.x},${s.y} · ${s.w}×${s.h}</span>`;
      row.appendChild(text);
      sideList.appendChild(row);
    }

    if (state.shapes.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:24px;text-align:center;color:rgba(232,237,233,0.4);font-size:11px;';
      empty.textContent = '(no shapes — click+drag canvas to draw)';
      sideList.appendChild(empty);
    }
  }

  function setStatus(msg: string, kind: 'ok' | 'err' | 'plain' = 'plain') {
    statusBar.textContent = msg;
    statusBar.className = kind === 'plain' ? '' : kind;
  }

  function markDirty() {
    state.dirty = true;
    buildToolbar();
  }

  function snap(n: number): number {
    return Math.round(n / state.snap) * state.snap;
  }

  let dragStart: { x: number; y: number } | null = null;
  const dragGfx = new Graphics();
  layers.drag.addChild(dragGfx);

  app.canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const rect = app.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (state.stage.width / rect.width);
    const sy = (e.clientY - rect.top) * (state.stage.height / rect.height);
    const x = snap(sx);
    const y = snap(sy);

    if (state.tool === 'select') {
      let hit: number | null = null;
      for (let i = state.shapes.length - 1; i >= 0; i--) {
        const s = state.shapes[i]!;
        if (sx >= s.x && sx <= s.x + s.w && sy >= s.y && sy <= s.y + s.h) {
          hit = i;
          break;
        }
      }
      state.selectedIdx = hit;
      renderSelection();
      renderSide();
      return;
    }

    if (state.tool === 'spawn') {
      state.spawns.push({ type: state.spawnType as SpawnEntry['type'], x, y });
      renderSpawns();
      markDirty();
      return;
    }

    if (state.tool === 'start') {
      state.playerStart = { x, y };
      renderSpawns();
      markDirty();
      return;
    }

    dragStart = { x, y };
  });

  app.canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (!dragStart) return;
    const rect = app.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (state.stage.width / rect.width);
    const sy = (e.clientY - rect.top) * (state.stage.height / rect.height);
    const x = snap(sx);
    const y = snap(sy);
    const minX = Math.min(dragStart.x, x);
    const minY = Math.min(dragStart.y, y);
    const w = Math.abs(x - dragStart.x);
    const h = Math.abs(y - dragStart.y);
    const color = state.tool === 'solid' || state.tool === 'oneway' || state.tool === 'trigger'
      ? KIND_COLOR[state.tool]
      : 0xffffff;
    dragGfx.clear();
    if (w > 0 && h > 0) {
      dragGfx.rect(minX, minY, w, h)
        .fill({ color, alpha: 0.25 })
        .stroke({ color, width: 2, alpha: 0.95 });
    }
  });

  app.canvas.addEventListener('mouseup', (e: MouseEvent) => {
    if (!dragStart) return;
    const rect = app.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (state.stage.width / rect.width);
    const sy = (e.clientY - rect.top) * (state.stage.height / rect.height);
    const x = snap(sx);
    const y = snap(sy);
    const minX = Math.min(dragStart.x, x);
    const minY = Math.min(dragStart.y, y);
    const w = Math.abs(x - dragStart.x);
    const h = Math.abs(y - dragStart.y);
    dragGfx.clear();
    dragStart = null;
    if (w < 4 || h < 4) return;
    if (state.tool === 'solid' || state.tool === 'oneway' || state.tool === 'trigger') {
      state.shapes.push({ kind: state.tool, x: minX, y: minY, w, h });
      renderShapes();
      renderSide();
      markDirty();
    }
  });

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return;

    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      void save();
      return;
    }

    const map: Record<string, Tool> = {
      v: 'select', V: 'select',
      s: 'solid', S: 'solid',
      o: 'oneway', O: 'oneway',
      t: 'trigger', T: 'trigger',
      m: 'spawn', M: 'spawn',
      p: 'start', P: 'start',
    };
    if (map[e.key]) {
      setTool(map[e.key]!);
      return;
    }
    if (e.key === 'g' || e.key === 'G') {
      toggleSnap();
      return;
    }
    if (state.selectedIdx !== null) {
      const step = e.shiftKey ? state.snap * 2 : state.snap;
      const s = state.shapes[state.selectedIdx];
      if (!s) return;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        state.shapes.splice(state.selectedIdx, 1);
        state.selectedIdx = null;
        renderShapes();
        renderSelection();
        renderSide();
        markDirty();
        e.preventDefault();
        return;
      }
      if (dx !== 0 || dy !== 0) {
        state.shapes[state.selectedIdx] = { ...s, x: s.x + dx, y: s.y + dy };
        renderShapes();
        renderSelection();
        renderSide();
        markDirty();
        e.preventDefault();
      }
    }
  });

  async function save() {
    const payload = {
      id: state.stage.id,
      name: state.stage.name,
      biome: state.stage.biome,
      width: state.stage.width,
      height: state.stage.height,
      playerStart: state.playerStart,
      ground: state.stage.ground,
      loadingImage: state.stage.loadingImage,
      shapes: state.shapes,
      spawns: state.spawns,
    };
    try {
      const res = await fetch('/__dev/save-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => `HTTP ${res.status}`);
        setStatus(`save failed: ${txt}`, 'err');
        return;
      }
      state.dirty = false;
      buildToolbar();
      setStatus(`saved → src/data/stages/${state.stage.id}.json`, 'ok');
    } catch (err) {
      setStatus(`save error: ${(err as Error).message}`, 'err');
    }
  }

  buildToolbar();
  renderShapes();
  renderSpawns();
  renderSide();
  setStatus(`loaded ${state.shapes.length} shapes, ${state.spawns.length} spawns. Tools: V S O T M P · Drag to draw · Ctrl+S to save`);
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#f88;padding:24px">${err.stack ?? err}</pre>`;
});
