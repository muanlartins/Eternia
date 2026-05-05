// Phase 1 — Movement: Elesis state machine + input + camera.
// No combat, no mobs, no networked game logic yet.

import { Application, Container, Graphics, Text } from 'pixi.js';
import type { ClientMessage, ServerMessage } from '@eternia/shared';
import { ELESIS } from './data/elesis.js';
import { Input } from './game/Input.js';
import { Player } from './game/Player.js';
import { Camera } from './game/Camera.js';
import { PlayerState } from './game/types.js';

const GAME_W = 1024;
const GAME_H = 576;
const GROUND_Y = 480;

async function main() {
  const app = new Application();
  await app.init({
    width: GAME_W,
    height: GAME_H,
    background: 0x0d1018,
    antialias: true,
  });

  const container = document.getElementById('game-container');
  if (!container) throw new Error('#game-container missing');
  container.appendChild(app.canvas);

  // ─── Layers ─────────────────────────────────────────────────────
  // World stage moves with camera. UI stage stays fixed.
  const worldStage = new Container();
  const uiStage = new Container();
  app.stage.addChild(worldStage);
  app.stage.addChild(uiStage);

  // ─── World: ground + parallax markers (so motion is visible) ───
  const ground = new Graphics();
  ground
    .rect(-5000, GROUND_Y, 10000, 200)
    .fill({ color: 0x1f2937 });
  worldStage.addChild(ground);

  // Vertical reference lines every 200px so we can SEE motion.
  for (let x = -4000; x <= 4000; x += 200) {
    const line = new Graphics();
    const isMajor = x % 1000 === 0;
    line
      .rect(x, GROUND_Y - 20, 2, 20)
      .fill({ color: isMajor ? 0x6b7280 : 0x374151 });
    worldStage.addChild(line);
    if (isMajor) {
      const label = new Text({
        text: `${x}`,
        style: { fontFamily: 'monospace', fontSize: 10, fill: 0x6b7280 },
      });
      label.x = x + 4;
      label.y = GROUND_Y - 18;
      worldStage.addChild(label);
    }
  }

  // ─── Player + Input + Camera ───────────────────────────────────
  const input = new Input({ doubleTapWindowMs: ELESIS.doubleTapWindowMs });
  const player = new Player(ELESIS);
  worldStage.addChild(player.view);

  const camera = new Camera(worldStage, GAME_W, GAME_H);

  // ─── UI: state HUD ──────────────────────────────────────────────
  const hud = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 13, fill: 0xddddee },
  });
  hud.x = 12;
  hud.y = 12;
  uiStage.addChild(hud);

  const controls = new Text({
    text:
      'controls: ← → = move (hold = run), ↑ = jump (hold = higher, again = double jump), ' +
      'double-tap ← / → = dash. In air after first jump: dash again (1x) — hold ↑ or ↓ for diagonal.',
    style: { fontFamily: 'monospace', fontSize: 11, fill: 0x6b7280 },
  });
  controls.x = 12;
  controls.y = GAME_H - 24;
  uiStage.addChild(controls);

  // ─── WebSocket (kept from Phase 0) ─────────────────────────────
  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  const ws = new WebSocket(wsUrl);
  let serverInfo = 'connecting…';
  ws.addEventListener('open', () => {
    const hello: ClientMessage = { t: 'hello', v: '0.0.1' };
    ws.send(JSON.stringify(hello));
  });
  ws.addEventListener('message', (e) => {
    try {
      const msg: ServerMessage = JSON.parse(e.data);
      if (msg.t === 'hello') serverInfo = `server ${msg.v}`;
    } catch {
      /* ignore */
    }
  });
  ws.addEventListener('close', () => (serverInfo = 'disconnected'));
  ws.addEventListener('error', () => (serverInfo = 'ws error'));

  // ─── Game loop ──────────────────────────────────────────────────
  app.ticker.add(() => {
    const dtMs = app.ticker.deltaMS;

    player.update(dtMs, input);
    camera.follow(player.x + ELESIS.width / 2, player.y + ELESIS.height / 2);
    camera.update(dtMs);

    // HUD: state + position + velocity
    hud.text =
      `state: ${player.state.padEnd(12, ' ')}  ` +
      `pos: (${player.x.toFixed(0)}, ${player.y.toFixed(0)})  ` +
      `vel: (${player.vx.toFixed(0)}, ${player.vy.toFixed(0)})  ` +
      `face: ${player.facing > 0 ? '→' : '←'}  ` +
      `${serverInfo}`;

    input.endFrame();
  });
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#f88">${err.stack ?? err}</pre>`;
});

// Help TS that PlayerState is referenced (for tree-shake hints during dev).
void PlayerState;
