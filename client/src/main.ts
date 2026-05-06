import { Application, Container, Graphics, Text } from 'pixi.js';
import type { ClientMessage, ServerMessage } from '@eternia/shared';
import { ELESIS } from './data/elesis.js';
import { Input } from './game/Input.js';
import { Player } from './game/Player.js';
import { Camera } from './game/Camera.js';
import { Stage } from './game/Stage.js';
import { STAGES } from './data/stages.js';
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

  if (minV < minH && overlapT < overlapB) {
    const playerCenterX = p.x + p.w / 2;
    const boxCenterX = box.x + box.w / 2;
    if (playerCenterX < boxCenterX) {
      player.x -= overlapL;
    } else {
      player.x += overlapR;
    }
    return;
  }

  if (minH < minV) {
    if (overlapL < overlapR) {
      player.x -= overlapL;
      if (player.vx > 0) player.vx = 0;
    } else {
      player.x += overlapR;
      if (player.vx < 0) player.vx = 0;
    }
  } else {
    player.y += overlapB;
    if (player.vy < 0) player.vy = 0;
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

  let currentStageIdx = 0;
  let stage = new Stage(STAGES[currentStageIdx]!, worldStage);
  stage.spawn();

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

  const stageBanner = new Text({
    text: '',
    style: {
      fontFamily: 'monospace',
      fontSize: 32,
      fill: 0xfff066,
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 4 },
    },
  });
  stageBanner.anchor.set(0.5, 0.5);
  stageBanner.x = GAME_W / 2;
  stageBanner.y = GAME_H / 2 - 40;
  stageBanner.visible = false;
  uiStage.addChild(stageBanner);

  const controls = new Text({
    text:
      'controls: ← → = move (hold = run), ↑ = jump, double-tap ← / → = dash. ' +
      'Z = attack (combo Z→Z→Z; ground dash + Z = dash-atk; air + Z = jump-atk 1×/cycle). ' +
      'A = S1 (25 MP), S = S2 (50 MP), D = S3 (80 MP). Alt/⌥ = dodge stand (then double-tap ←/→ to roll, iframes throughout). ' +
      'Space = parry (150ms active window — time the orange telegraph to stun the mob). ' +
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

  type StagePhase = 'playing' | 'clearAnnounce' | 'nextAnnounce' | 'gameOver';
  let stagePhase: StagePhase = 'nextAnnounce';
  let stageTransitionTimerMs = 1500;
  stageBanner.text = `STAGE 1: ${STAGES[currentStageIdx]!.name}`;
  stageBanner.visible = true;
  let prevPlayerState: PlayerState = player.state;

  const MAX_LIVES = 3;
  let lives = MAX_LIVES;

  app.ticker.add(() => {
    const dtMs = app.ticker.deltaMS;

    player.update(dtMs, input, stage.getPlatforms());

    const stageMobs = stage.getMobs();

    if (!player.isInvincible()) {
      for (const m of stageMobs) {
        if (!m.alive) continue;
        resolvePlayerVsBox(player, m.hurtbox());
      }
    }

    const hit = player.getActiveHit();
    if (hit !== null) {
      for (const m of stageMobs) {
        if (!m.alive) continue;
        const hb = m.hurtbox();
        if (rectsOverlap(hit.bbox, hb)) {
          const result = m.receiveHit(hit.attackId, hit.damage, hit.knockback * hit.facing);
          if (result !== null) {
            const c = intersectionCenter(hit.bbox, hb);
            hitFx.popup(c.x, c.y, result.applied);
            hitFx.spark(c.x, c.y);
            if (result.bonus) {
              hitFx.spark(c.x + 10, c.y - 4);
              hitFx.spark(c.x - 10, c.y + 4);
            }
            player.giveMp(ELESIS.mpPerHit);
          }
        }
      }
    }

    stage.update(dtMs, player.x + ELESIS.width / 2);

    for (const m of stageMobs) {
      if (!m.alive) continue;
      const mobHit = m.getActiveHit();
      if (mobHit) {
        const playerBox = player.aabb();
        if (rectsOverlap(mobHit.bbox, playerBox)) {
          const c = intersectionCenter(mobHit.bbox, playerBox);
          if (player.isParryActive()) {
            m.parried(-mobHit.facing * 240);
            hitFx.spark(c.x, c.y);
            hitFx.spark(c.x + 8, c.y - 4);
            hitFx.spark(c.x - 8, c.y + 4);
          } else if (!player.isInvincible()) {
            player.takeDamage(mobHit.damage, mobHit.knockback * mobHit.facing);
            hitFx.popup(c.x, c.y, mobHit.damage);
            hitFx.spark(c.x, c.y);
          }
        }
      }
    }

    if (prevPlayerState === PlayerState.Dead && player.state !== PlayerState.Dead) {
      lives -= 1;
      if (lives <= 0) {
        lives = MAX_LIVES;
        currentStageIdx = 0;
        stage.destroy();
        stage = new Stage(STAGES[currentStageIdx]!, worldStage);
        stage.spawn();
        stagePhase = 'gameOver';
        stageTransitionTimerMs = 2000;
        stageBanner.text = 'GAME OVER';
      } else {
        stage.destroy();
        stage = new Stage(STAGES[currentStageIdx]!, worldStage);
        stage.spawn();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = `STAGE ${currentStageIdx + 1}: ${STAGES[currentStageIdx]!.name}`;
      }
      stageBanner.visible = true;
    }
    prevPlayerState = player.state;

    if (stagePhase === 'playing' && stage.isCleared()) {
      stagePhase = 'clearAnnounce';
      stageTransitionTimerMs = 1500;
      stageBanner.text = `STAGE ${currentStageIdx + 1} CLEAR!`;
      stageBanner.visible = true;
    } else if (stagePhase === 'clearAnnounce') {
      stageTransitionTimerMs -= dtMs;
      if (stageTransitionTimerMs <= 0) {
        currentStageIdx = (currentStageIdx + 1) % STAGES.length;
        stage.destroy();
        stage = new Stage(STAGES[currentStageIdx]!, worldStage);
        stage.spawn();
        player.teleportToStart();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = `STAGE ${currentStageIdx + 1}: ${STAGES[currentStageIdx]!.name}`;
      }
    } else if (stagePhase === 'nextAnnounce') {
      stageTransitionTimerMs -= dtMs;
      if (stageTransitionTimerMs <= 0) {
        stageBanner.visible = false;
        stagePhase = 'playing';
      }
    } else if (stagePhase === 'gameOver') {
      stageTransitionTimerMs -= dtMs;
      if (stageTransitionTimerMs <= 0) {
        player.teleportToStart();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = `STAGE ${currentStageIdx + 1}: ${STAGES[currentStageIdx]!.name}`;
      }
    }

    hitFx.update(dtMs);

    camera.follow(player.x + ELESIS.width / 2, player.y + ELESIS.height / 2);
    camera.update(dtMs);

    const dodgeSegments =
      '['.padEnd(1, '') +
      '█'.repeat(Math.floor(player.dodgeBar)) +
      '·'.repeat(ELESIS.dodgeBarMax - Math.floor(player.dodgeBar)) +
      ']';
    const aliveCount = stage.getMobs().filter((m) => m.alive).length;
    const livesDisplay = '♥'.repeat(lives) + '·'.repeat(MAX_LIVES - lives);
    hud.text =
      `stage ${currentStageIdx + 1}/${STAGES.length}  ` +
      `lives: ${livesDisplay}  ` +
      `mobs: ${aliveCount}  ` +
      `state: ${player.state.padEnd(12, ' ')}  ` +
      `hp: ${player.hp.toFixed(0).padStart(3, ' ')}/${ELESIS.maxHp}  ` +
      `mp: ${player.mp.toFixed(0).padStart(3, ' ')}/${ELESIS.maxMp}  ` +
      `dodge: ${dodgeSegments}  ` +
      `${serverInfo}`;

    input.endFrame();
  });
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#f88">${err.stack ?? err}</pre>`;
});

void PlayerState;
