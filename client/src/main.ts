import { Application, Container, Graphics, Text } from 'pixi.js';
import type { ClientMessage, ServerMessage } from '@eternia/shared';
import { ELESIS } from './data/elesis.js';
import { BUFFS, pickRandomBuffs } from './data/buffs.js';
import { Input } from './game/Input.js';
import { Player } from './game/Player.js';
import { Camera } from './game/Camera.js';
import { Stage } from './game/Stage.js';
import { STAGES } from './data/stages.js';
import { HitFx } from './game/HitFx.js';
import { BuffOffer } from './game/BuffOffer.js';
import { GameAudio, type HitIntensity } from './game/Audio.js';
import { VictoryStats, type RunStatsView } from './game/VictoryStats.js';
import { Hud } from './game/Hud.js';
import { Background } from './game/Background.js';
import {
  applyGameOverToRecords,
  applyVictoryToRecords,
  loadRecords,
  saveRecords,
  type NewRecordFlags,
} from './game/Records.js';
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

  const bgStage = new Container();
  const worldStage = new Container();
  const uiStage = new Container();
  app.stage.addChild(bgStage);
  app.stage.addChild(worldStage);
  app.stage.addChild(uiStage);

  const background = new Background(GAME_W, GAME_H);
  bgStage.addChild(background.container);

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
  background.setStage(STAGES[currentStageIdx]!.id);

  worldStage.addChild(player.view);

  const hitFx = new HitFx();
  worldStage.addChild(hitFx.container);

  const camera = new Camera(worldStage, GAME_W, GAME_H);

  const hud = new Hud(GAME_W);
  uiStage.addChild(hud.container);

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

  const buffOffer = new BuffOffer(GAME_W, GAME_H);
  uiStage.addChild(buffOffer.container);

  const victoryStats = new VictoryStats(GAME_W, GAME_H);
  uiStage.addChild(victoryStats.container);

  const controls = new Text({
    text:
      'controls: ← → = move (hold = run), ↑ = jump, double-tap ← / → = dash. ' +
      'Z = attack (tap = combo). HOLD Z after Attack1 = charge while moving; release on ground = cast S1/S2/S3 by tier (no cd). Release in air = cancel. ' +
      'A/S/D = direct cast (faster but adds cooldown; ground only). Hold Z bypasses cooldown. ' +
      'Alt = dodge. Space = parry (×1.5 dmg buff 3s on success). M = mute.',
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

  type StagePhase =
    | 'playing'
    | 'clearAnnounce'
    | 'buffOffer'
    | 'nextAnnounce'
    | 'gameOver'
    | 'victoryAnnounce'
    | 'victoryStats';
  let stagePhase: StagePhase = 'nextAnnounce';
  let stageTransitionTimerMs = 1500;
  stageBanner.text = `STAGE 1: ${STAGES[currentStageIdx]!.name}`;
  stageBanner.visible = true;
  let prevPlayerState: PlayerState = player.state;

  const MAX_LIVES = 3;
  let lives = MAX_LIVES;

  interface RunStats {
    startedAtMs: number;
    endedAtMs: number | null;
    damageDealt: number;
    damageTaken: number;
    killCounts: Record<string, { name: string; count: number }>;
    buffsPicked: string[];
    deaths: number;
  }

  function makeStats(): RunStats {
    return {
      startedAtMs: performance.now(),
      endedAtMs: null,
      damageDealt: 0,
      damageTaken: 0,
      killCounts: {},
      buffsPicked: [],
      deaths: 0,
    };
  }

  let runStats = makeStats();
  let records = loadRecords();
  let pendingFlags: NewRecordFlags = {
    newBestTime: false,
    newBestDamage: false,
    newFewestDeaths: false,
  };

  function statsView(): RunStatsView {
    const ended = runStats.endedAtMs ?? performance.now();
    return {
      durationMs: ended - runStats.startedAtMs,
      damageDealt: Math.round(runStats.damageDealt),
      damageTaken: Math.round(runStats.damageTaken),
      killCounts: runStats.killCounts,
      buffsPicked: runStats.buffsPicked,
      deaths: runStats.deaths,
      records,
      flags: pendingFlags,
    };
  }

  function startNewRun() {
    lives = MAX_LIVES;
    currentStageIdx = 0;
    player.resetBuffs();
    stage.destroy();
    stage = new Stage(STAGES[currentStageIdx]!, worldStage);
    stage.spawn();
    background.setStage(STAGES[currentStageIdx]!.id);
    player.teleportToStart();
    runStats = makeStats();
    pendingFlags = { newBestTime: false, newBestDamage: false, newFewestDeaths: false };
    victoryStats.hide();
    buffOffer.hide();
    stagePhase = 'nextAnnounce';
    stageTransitionTimerMs = 1500;
    stageBanner.text = `STAGE ${currentStageIdx + 1}: ${STAGES[currentStageIdx]!.name}`;
    stageBanner.visible = true;
  }

  let hitPauseMs = 0;
  let bossSparkCooldownMs = 0;

  const audio = new GameAudio();

  function impactFromDamage(applied: number): { shake: number; shakeDur: number; pause: number; intensity: HitIntensity } {
    if (applied >= 50) return { shake: 14, shakeDur: 260, pause: 90, intensity: 'massive' };
    if (applied >= 30) return { shake: 10, shakeDur: 200, pause: 60, intensity: 'heavy' };
    if (applied >= 18) return { shake: 6, shakeDur: 140, pause: 30, intensity: 'medium' };
    if (applied >= 10) return { shake: 4, shakeDur: 100, pause: 12, intensity: 'light' };
    return { shake: 2, shakeDur: 60, pause: 0, intensity: 'light' };
  }

  app.ticker.add(() => {
    const realDtMs = app.ticker.deltaMS;
    const dtMs = hitPauseMs > 0 ? 0 : realDtMs;
    hitPauseMs = Math.max(0, hitPauseMs - realDtMs);

    if (input.justPressed('mute')) {
      audio.setMuted(!audio.isMuted());
    }

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
            runStats.damageDealt += result.applied;
            hitFx.popup(c.x, c.y, result.applied, { parryBuff: player.hasParryBuff() });
            hitFx.spark(c.x, c.y);
            if (player.hasParryBuff()) {
              hitFx.spark(c.x + 10, c.y - 4);
              hitFx.spark(c.x - 10, c.y + 4);
            }
            player.giveMp(ELESIS.mpPerHit);
            if (hit.isCombo && player.modifiers.comboLifestealPct > 0) {
              player.heal(result.applied * player.modifiers.comboLifestealPct);
            }

            const impact = impactFromDamage(result.applied);
            camera.shake(impact.shake, impact.shakeDur);
            hitPauseMs = Math.max(hitPauseMs, impact.pause);
            audio.playHit(impact.intensity);

            if (!m.alive) {
              const isBoss = m.isBoss();
              const id = m.getId();
              const name = m.getDisplayName();
              const entry = runStats.killCounts[id];
              if (entry) entry.count += 1;
              else runStats.killCounts[id] = { name, count: 1 };
              camera.shake(isBoss ? 26 : 8, isBoss ? 700 : 200);
              hitPauseMs = Math.max(hitPauseMs, isBoss ? 220 : 50);
              audio.playMobDeath(isBoss);
              if (isBoss) {
                const bb = m.hurtbox();
                const bcx = bb.x + bb.w / 2;
                const bcy = bb.y + bb.h / 2;
                const ringR = 60;
                for (let i = 0; i < 14; i++) {
                  const ang = (i / 14) * Math.PI * 2;
                  hitFx.spark(bcx + Math.cos(ang) * ringR, bcy + Math.sin(ang) * ringR);
                }
                for (let i = 0; i < 8; i++) {
                  const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
                  hitFx.spark(bcx + Math.cos(ang) * 28, bcy + Math.sin(ang) * 28);
                }
              }
            }
          }
        }
      }
    }

    stage.update(dtMs, player.x + ELESIS.width / 2);

    for (const proj of stage.getProjectiles()) {
      if (!proj.alive) continue;
      const playerBox = player.aabb();
      const projBox = proj.hurtbox();
      if (rectsOverlap(projBox, playerBox)) {
        const c = intersectionCenter(projBox, playerBox);
        if (player.isParryActive()) {
          proj.alive = false;
          player.activateParryBuff();
          if (proj.onParried) proj.onParried();
          hitFx.spark(c.x, c.y);
          hitFx.spark(c.x + 8, c.y - 4);
          hitFx.spark(c.x - 8, c.y + 4);
          const playerBoxCenter = player.aabb();
          const pcx2 = playerBoxCenter.x + playerBoxCenter.w / 2;
          const pcy2 = playerBoxCenter.y + playerBoxCenter.h / 2;
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            hitFx.spark(pcx2 + Math.cos(ang) * 28, pcy2 + Math.sin(ang) * 28);
          }
          camera.shake(14, 280);
          hitPauseMs = Math.max(hitPauseMs, 90);
          audio.playParrySuccess();
        } else if (!player.isInvincible()) {
          player.takeDamage(proj.damage, proj.facing * proj.knockback);
          runStats.damageTaken += proj.damage;
          hitFx.popup(c.x, c.y, proj.damage);
          hitFx.spark(c.x, c.y);
          camera.shake(6, 140);
          hitPauseMs = Math.max(hitPauseMs, 30);
          audio.playPlayerHurt();
          proj.alive = false;
        }
      }
    }

    for (const m of stageMobs) {
      if (!m.alive) continue;
      const mobHit = m.getActiveHit();
      if (mobHit) {
        const playerBox = player.aabb();
        if (rectsOverlap(mobHit.bbox, playerBox)) {
          const c = intersectionCenter(mobHit.bbox, playerBox);
          if (player.isParryActive()) {
            m.parried(-mobHit.facing * 240);
            player.activateParryBuff();
            hitFx.spark(c.x, c.y);
            hitFx.spark(c.x + 8, c.y - 4);
            hitFx.spark(c.x - 8, c.y + 4);
            const playerBox = player.aabb();
            const pcx = playerBox.x + playerBox.w / 2;
            const pcy = playerBox.y + playerBox.h / 2;
            for (let i = 0; i < 8; i++) {
              const ang = (i / 8) * Math.PI * 2;
              hitFx.spark(pcx + Math.cos(ang) * 28, pcy + Math.sin(ang) * 28);
            }
            camera.shake(14, 280);
            hitPauseMs = Math.max(hitPauseMs, 90);
            audio.playParrySuccess();
          } else if (!player.isInvincible()) {
            player.takeDamage(mobHit.damage, mobHit.knockback * mobHit.facing);
            runStats.damageTaken += mobHit.damage;
            hitFx.popup(c.x, c.y, mobHit.damage);
            hitFx.spark(c.x, c.y);
            camera.shake(6, 140);
            hitPauseMs = Math.max(hitPauseMs, 30);
            audio.playPlayerHurt();
          }
        }
      }
    }

    const skillIdxOf = (s: PlayerState): number | null =>
      s === PlayerState.Skill1 ? 0 : s === PlayerState.Skill2 ? 1 : s === PlayerState.Skill3 ? 2 : null;
    const curSkillIdx = skillIdxOf(player.state);
    const prevSkillIdx = skillIdxOf(prevPlayerState);
    if (curSkillIdx !== null) {
      if (prevSkillIdx === null || prevSkillIdx !== curSkillIdx) {
        audio.playSkillCast(curSkillIdx);
      } else if (player.stateTimeMs < dtMs * 1.5) {
        audio.playSkillCast(curSkillIdx);
      }
    }
    if (player.state === PlayerState.JumpRise && prevPlayerState !== PlayerState.JumpRise) {
      audio.playJump();
    }
    if (player.state === PlayerState.DoubleJump && prevPlayerState !== PlayerState.DoubleJump) {
      audio.playJump();
    }
    if (player.state === PlayerState.Dash && prevPlayerState !== PlayerState.Dash) {
      audio.playDash();
    }
    if (player.state === PlayerState.AirDash && prevPlayerState !== PlayerState.AirDash) {
      audio.playDash();
    }

    if (prevPlayerState === PlayerState.Dead && player.state !== PlayerState.Dead) {
      runStats.deaths += 1;
      lives -= 1;
      if (lives <= 0) {
        lives = MAX_LIVES;
        currentStageIdx = 0;
        player.resetBuffs();
        records = applyGameOverToRecords(records);
        saveRecords(records);
        runStats = makeStats();
        stage.destroy();
        stage = new Stage(STAGES[currentStageIdx]!, worldStage);
        stage.spawn();
        background.setStage(STAGES[currentStageIdx]!.id);
        stagePhase = 'gameOver';
        stageTransitionTimerMs = 2000;
        stageBanner.text = 'GAME OVER';
      } else {
        for (const m of stage.getMobs()) m.resetTransientBuffs();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = `STAGE ${currentStageIdx + 1}: ${STAGES[currentStageIdx]!.name}`;
      }
      stageBanner.visible = true;
    }
    prevPlayerState = player.state;

    if (stagePhase === 'playing' && stage.isCleared()) {
      if (currentStageIdx === STAGES.length - 1) {
        runStats.endedAtMs = performance.now();
        const durationMs = runStats.endedAtMs - runStats.startedAtMs;
        const result = applyVictoryToRecords(
          records,
          durationMs,
          Math.round(runStats.damageDealt),
          runStats.deaths,
        );
        records = result.records;
        pendingFlags = result.flags;
        saveRecords(records);
        stagePhase = 'victoryAnnounce';
        stageTransitionTimerMs = 2500;
        stageBanner.text = 'VICTORY!';
        stageBanner.visible = true;
      } else {
        stagePhase = 'clearAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = `STAGE ${currentStageIdx + 1} CLEAR!`;
        stageBanner.visible = true;
      }
    } else if (stagePhase === 'clearAnnounce') {
      stageTransitionTimerMs -= dtMs;
      if (stageTransitionTimerMs <= 0) {
        stageBanner.visible = false;
        buffOffer.show(pickRandomBuffs(BUFFS, 3));
        stagePhase = 'buffOffer';
      }
    } else if (stagePhase === 'buffOffer') {
      let pickIdx = -1;
      if (input.justPressed('pick1')) pickIdx = 0;
      else if (input.justPressed('pick2')) pickIdx = 1;
      else if (input.justPressed('pick3')) pickIdx = 2;
      if (pickIdx >= 0) {
        const offers = buffOffer.getOffers();
        const buff = offers[pickIdx];
        if (buff) {
          player.applyBuff(buff);
          runStats.buffsPicked.push(buff.name);
        }
        buffOffer.hide();
        currentStageIdx = (currentStageIdx + 1) % STAGES.length;
        stage.destroy();
        stage = new Stage(STAGES[currentStageIdx]!, worldStage);
        stage.spawn();
        background.setStage(STAGES[currentStageIdx]!.id);
        player.teleportToStart();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = `STAGE ${currentStageIdx + 1}: ${STAGES[currentStageIdx]!.name}`;
        stageBanner.visible = true;
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
    } else if (stagePhase === 'victoryAnnounce') {
      stageTransitionTimerMs -= dtMs;
      if (stageTransitionTimerMs <= 0) {
        stageBanner.visible = false;
        victoryStats.show(statsView());
        stagePhase = 'victoryStats';
      }
    } else if (stagePhase === 'victoryStats') {
      const anyAction =
        input.justPressed('attack') ||
        input.justPressed('skill1') ||
        input.justPressed('skill2') ||
        input.justPressed('skill3') ||
        input.justPressed('parry') ||
        input.justPressed('dodge') ||
        input.justPressed('pick1') ||
        input.justPressed('pick2') ||
        input.justPressed('pick3') ||
        input.justPressed('up');
      if (anyAction) {
        startNewRun();
      }
    }

    bossSparkCooldownMs -= realDtMs;
    if (bossSparkCooldownMs <= 0) {
      for (const m of stage.getMobs()) {
        if (m.isFading() && m.isBoss()) {
          const hb = m.hurtbox();
          hitFx.spark(
            hb.x + Math.random() * hb.w,
            hb.y + Math.random() * hb.h * 0.7,
          );
        }
      }
      bossSparkCooldownMs = 160;
    }

    hitFx.update(dtMs);

    camera.follow(player.x + ELESIS.width / 2, player.y + ELESIS.height / 2);
    camera.update(realDtMs);

    background.update(camera.getOffsetX(), camera.getOffsetY());

    const aliveCount = stage.getMobs().filter((m) => m.alive).length;
    const elapsedMs =
      runStats.endedAtMs !== null
        ? runStats.endedAtMs - runStats.startedAtMs
        : performance.now() - runStats.startedAtMs;
    hud.update({
      player,
      lives,
      maxLives: MAX_LIVES,
      stageIdx: currentStageIdx,
      stageName: STAGES[currentStageIdx]!.name,
      totalStages: STAGES.length,
      aliveCount,
      serverInfo,
      runMs: elapsedMs,
    });

    input.endFrame();
  });
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#f88">${err.stack ?? err}</pre>`;
});

void PlayerState;
