import { Application, Container, Graphics, Text } from 'pixi.js';
import type { ClientMessage, ServerMessage } from '@eternia/shared';
import { ELESIS } from './data/elesis.js';
import { Input } from './game/Input.js';
import { Player } from './game/Player.js';
import { Camera } from './game/Camera.js';
import { TargetDummy } from './game/TargetDummy.js';
import { HitFx } from './game/HitFx.js';
import { PlayerState, type AABB } from './game/types.js';

function rectsOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function intersectionCenter(a: AABB, b: AABB): { x: number; y: number } {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

function resolvePlayerVsBox(player: Player, box: AABB) {
  const p = player.aabb();
  if (!rectsOverlap(p, box)) return;

  const overlapL = p.x + p.w - box.x;
  const overlapR = box.x + box.w - p.x;
  const overlapT = p.y + p.h - box.y;
  const overlapB = box.y + box.h - p.y;

  const minH = Math.min(overlapL, overlapR);
  const minV = Math.min(overlapT, overlapB);

  if (minH < minV) {
    if (overlapL < overlapR) {
      player.x -= overlapL;
      if (player.vx > 0) player.vx = 0;
    } else {
      player.x += overlapR;
      if (player.vx < 0) player.vx = 0;
    }
  } else {
    if (overlapT < overlapB) {
      player.y -= overlapT;
      if (player.vy > 0) player.vy = 0;
    } else {
      player.y += overlapB;
      if (player.vy < 0) player.vy = 0;
    }
  }
}

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

  const worldStage = new Container();
  const uiStage = new Container();
  app.stage.addChild(worldStage);
  app.stage.addChild(uiStage);

  const ground = new Graphics();
  ground
    .rect(-5000, GROUND_Y, 10000, 200)
    .fill({ color: 0x1f2937 });
  worldStage.addChild(ground);

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

  const input = new Input({ doubleTapWindowMs: ELESIS.doubleTapWindowMs });
  const player = new Player(ELESIS);

  const dummies = [
    new TargetDummy(220, GROUND_Y - 64),
    new TargetDummy(-260, GROUND_Y - 64),
  ];
  for (const d of dummies) worldStage.addChild(d.view);

  worldStage.addChild(player.view);

  const hitFx = new HitFx();
  worldStage.addChild(hitFx.container);

  const camera = new Camera(worldStage, GAME_W, GAME_H);

  const hud = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 13, fill: 0xddddee },
  });
  hud.x = 12;
  hud.y = 12;
  uiStage.addChild(hud);

  const controls = new Text({
    text:
      'controls: ← → = move (hold = run), ↑ = jump, double-tap ← / → = dash. ' +
      'Z = attack (combo Z→Z→Z; ground dash + Z = dash-atk; air + Z = jump-atk 1×/cycle). ' +
      'A = S1 (25 MP), S = S2 (50 MP), D = S3 (80 MP). Alt/⌥ = dodge stand (then double-tap ←/→ to roll, iframes throughout). ' +
      '↑ during ground dash = jump out, ↓ during air dash = drop, opposite hold mid-dash = decelerate.',
    style: { fontFamily: 'monospace', fontSize: 11, fill: 0x6b7280 },
  });
  controls.x = 12;
  controls.y = GAME_H - 24;
  uiStage.addChild(controls);

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

  app.ticker.add(() => {
    const dtMs = app.ticker.deltaMS;

    player.update(dtMs, input);

    if (!player.isInvincible()) {
      for (const d of dummies) {
        if (!d.alive) continue;
        resolvePlayerVsBox(player, d.hurtbox());
      }
    }

    const hit = player.getActiveHit();
    if (hit !== null) {
      for (const d of dummies) {
        if (!d.alive) continue;
        const hb = d.hurtbox();
        if (rectsOverlap(hit.bbox, hb)) {
          const accepted = d.receiveHit(hit.attackId, hit.damage, hit.knockback * hit.facing);
          if (accepted) {
            const c = intersectionCenter(hit.bbox, hb);
            hitFx.popup(c.x, c.y, hit.damage);
            hitFx.spark(c.x, c.y);
            player.giveMp(ELESIS.mpPerHit);
          }
        }
      }
    }

    for (const d of dummies) d.update(dtMs);
    hitFx.update(dtMs);

    camera.follow(player.x + ELESIS.width / 2, player.y + ELESIS.height / 2);
    camera.update(dtMs);

    hud.text =
      `state: ${player.state.padEnd(12, ' ')}  ` +
      `mp: ${player.mp.toFixed(0).padStart(3, ' ')}/${ELESIS.maxMp}  ` +
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

void PlayerState;
