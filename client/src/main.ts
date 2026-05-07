import { Application, Container, Graphics, Text } from 'pixi.js';
import { ELESIS } from './data/elesis.js';
import { BUFFS, pickRandomBuffs } from './data/buffs.js';
import { Input } from './game/Input.js';
import { Player } from './game/Player.js';
import { Camera } from './game/Camera.js';
import { Stage } from './game/Stage.js';
import { HitFx } from './game/HitFx.js';
import { BuffOffer } from './game/BuffOffer.js';
import { GameAudio, type BgmId, type HitIntensity } from './game/Audio.js';
import { VictoryStats, type RunStatsView } from './game/VictoryStats.js';
import { Hud } from './game/Hud.js';
import { Background } from './game/Background.js';
import { RunModifierOffer } from './game/RunModifierOffer.js';
import { pickRandomModifiers } from './data/modifiers.js';
import { MiniMap } from './game/MiniMap.js';
import { MenuScreen } from './game/MenuScreen.js';
import { BossHpBar } from './game/BossHpBar.js';
import { Auth, fetchLeaderboard, type Room } from './game/Auth.js';
import { LoginScreen } from './game/LoginScreen.js';
import { CharacterSelect } from './game/CharacterSelect.js';
import { MissionSelect } from './game/MissionSelect.js';
import { LobbyScreen } from './game/LobbyScreen.js';
import { RoomLobby } from './game/RoomLobby.js';
import { Network, type RoomStatus } from './game/Network.js';
import { RemotePlayer } from './game/RemotePlayer.js';
import { findMission } from './data/missions.js';
import { MOB_SPECS, stageById, type StageSpec } from './data/stages.js';
import { MISSIONS, type MissionSpec } from './data/missions.js';
import {
  findDifficulty,
  loadDifficulty,
  type DifficultySpec,
} from './data/difficulty.js';
import {
  applyGameOverToRecords,
  applyVictoryToRecords,
  loadRecords,
  saveRecords,
  type NewRecordFlags,
} from './game/Records.js';
import { PlayerState, type AABB } from './game/types.js';

function bgmIdForStage(stageId: string): BgmId {
  if (stageId === 'forest-1-4' || stageId === 'swamp-1-2') return 'boss';
  if (stageId === 'forest-1-3') return 'deep';
  if (stageId.startsWith('swamp')) return 'swamp';
  return 'forest';
}

function stageBannerText(spec: StageSpec, displayIdx: number): string {
  for (const sp of spec.spawns) {
    const m = MOB_SPECS[sp.type];
    if (m.isBoss && m.bossName) {
      return `★ BOSS ★  ${m.bossName.toUpperCase()}`;
    }
  }
  return `STAGE ${displayIdx + 1}: ${spec.name}`;
}

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

  let currentMission: MissionSpec = MISSIONS[0]!;
  let currentStageIdx = 0;
  let currentDifficulty: DifficultySpec = findDifficulty(loadDifficulty());
  let currentRoom: Room | null = null;
  let isMatchHost = false;
  let isCoOpJoiner = false;
  let pendingMission: MissionSpec | null = null;
  let pendingDifficulty: DifficultySpec | null = null;
  const joinerSentHits = new Set<string>();
  let mobBroadcastAccumMs = 0;
  const MOB_BROADCAST_INTERVAL_MS = 50;

  function currentStageSpec() {
    return stageById(currentMission.stageIds[currentStageIdx]!)!;
  }
  function isLastStageInMission(idx: number = currentStageIdx) {
    return idx === currentMission.stageIds.length - 1;
  }
  function newStage() {
    return new Stage(currentStageSpec(), worldStage, {
      isLastStage: isLastStageInMission(),
      hpMul: currentDifficulty.hpMul,
      dmgMul: currentDifficulty.dmgMul,
      remoteControlled: isCoOpJoiner,
    });
  }

  let stage = newStage();
  stage.spawn();
  background.setStage(currentStageSpec().id);

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

  const modifierOffer = new RunModifierOffer(GAME_W, GAME_H);
  uiStage.addChild(modifierOffer.container);

  const miniMap = new MiniMap(GAME_W, GAME_H);
  uiStage.addChild(miniMap.container);
  function refreshMiniMap() {
    miniMap.setStages(
      currentMission.stageIds.map((id) => {
        const s = stageById(id)!;
        return { id: s.id, name: s.name };
      }),
    );
  }
  refreshMiniMap();

  const menuScreen = new MenuScreen(GAME_W, GAME_H);
  uiStage.addChild(menuScreen.container);

  const bossHpBar = new BossHpBar(GAME_W);
  uiStage.addChild(bossHpBar.container);

  const auth = new Auth();
  const loginScreen = new LoginScreen(GAME_W, GAME_H);
  uiStage.addChild(loginScreen.container);

  const characterSelect = new CharacterSelect(GAME_W, GAME_H);
  uiStage.addChild(characterSelect.container);

  const missionSelect = new MissionSelect(GAME_W, GAME_H);
  uiStage.addChild(missionSelect.container);

  const lobbyScreen = new LobbyScreen(GAME_W, GAME_H);
  uiStage.addChild(lobbyScreen.container);

  const roomLobby = new RoomLobby(GAME_W, GAME_H);
  uiStage.addChild(roomLobby.container);

  const audio = new GameAudio();

  const remotePlayers = new Map<number, RemotePlayer>();
  function clearRemotePlayers() {
    for (const r of remotePlayers.values()) r.destroy();
    remotePlayers.clear();
  }
  function addRemotePlayer(userId: number, username: string) {
    if (remotePlayers.has(userId)) return;
    const rp = new RemotePlayer(userId, username);
    remotePlayers.set(userId, rp);
    worldStage.addChild(rp.view);
  }
  function removeRemotePlayer(userId: number) {
    const rp = remotePlayers.get(userId);
    if (!rp) return;
    rp.destroy();
    remotePlayers.delete(userId);
  }

  const controls = new Text({
    text:
      'controls: ← → = move (hold = run), ↑ = jump, ↓ = drop through platform / enter portal. double-tap ← / → = dash. ' +
      'Z = attack (tap = combo, hold = charge). A/S/D = direct cast skill. ' +
      'Alt = dodge. Space = parry. Tab = stages map. M = mute. O / Esc = menu.',
    style: { fontFamily: 'monospace', fontSize: 11, fill: 0x6b7280 },
  });
  controls.x = 12;
  controls.y = GAME_H - 24;
  uiStage.addChild(controls);

  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  let serverInfo = 'connecting…';
  let lastRoomStatus: RoomStatus | null = null;
  const net = new Network(wsUrl);
  net.setHandlers({
    onHello: (v) => {
      serverInfo = `server ${v}`;
    },
    onStatusChange: (status) => {
      if (status === 'connecting') serverInfo = 'connecting…';
      else if (status === 'closed') serverInfo = 'disconnected';
      else if (status === 'error') serverInfo = 'ws error';
    },
    onRoster: (others) => {
      for (const o of others) addRemotePlayer(o.userId, o.username);
    },
    onRemoteJoin: (entry) => {
      addRemotePlayer(entry.userId, entry.username);
    },
    onRemoteLeave: (userId) => {
      removeRemotePlayer(userId);
    },
    onRemoteState: (entry, state) => {
      let rp = remotePlayers.get(entry.userId);
      if (!rp) {
        addRemotePlayer(entry.userId, entry.username);
        rp = remotePlayers.get(entry.userId);
      }
      rp?.applyState(state);
    },
    onRoomStatus: (status) => {
      lastRoomStatus = status;
      if (roomLobby.isOpen()) {
        roomLobby.applyStatus(status.members);
      }
      if (status.matchStarted && !isMatchHost && pendingMission && pendingDifficulty) {
        // Joiner: server says match started; switch into co-op gameplay.
        if (roomLobby.isOpen()) roomLobby.hide();
        startCoOpJoinerRun();
      }
    },
    onMatchStart: () => {
      if (roomLobby.isOpen()) roomLobby.hide();
      if (isMatchHost) startCoOpHostRun();
      else if (pendingMission && pendingDifficulty) startCoOpJoinerRun();
    },
    onMobStates: (mobs) => {
      if (!isCoOpJoiner) return;
      const localMobs = stage.getMobs();
      for (const ms of mobs) {
        const m = localMobs[ms.idx];
        if (!m) continue;
        m.applyRemoteState(ms);
      }
    },
    onPlayerHit: (hit) => {
      if (!isMatchHost) return;
      const m = stage.getMobs()[hit.mobIdx];
      if (!m || !m.alive) return;
      const result = m.applyRemoteHit(hit.damage, hit.knockback);
      if (result === null) return;
      // Visual feedback on host for the joiner's hit:
      const hb = m.hurtbox();
      const cx = hb.x + hb.w / 2;
      const cy = hb.y + hb.h / 2;
      hitFx.popup(cx, cy, Math.round(result.applied), {
        parryBuff: hit.parryBuff,
        aerial: hit.aerial,
        backstab: hit.backstab,
      });
      hitFx.spark(cx, cy);
      audio.playHit('medium');
      runStats.damageDealt += result.applied;
    },
  });

  type StagePhase =
    | 'playing'
    | 'awaitingPortal'
    | 'bossDeathDrama'
    | 'clearAnnounce'
    | 'buffOffer'
    | 'nextAnnounce'
    | 'gameOver'
    | 'victoryAnnounce'
    | 'victoryStats'
    | 'modifierPick';
  let stagePhase: StagePhase = 'modifierPick';
  let stageTransitionTimerMs = 0;
  stageBanner.visible = false;
  let prevPlayerState: PlayerState = player.state;

  let MAX_LIVES = currentDifficulty.lives;
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

  function applyRunStart(mission: MissionSpec, difficulty: DifficultySpec) {
    currentMission = mission;
    currentStageIdx = 0;
    currentDifficulty = difficulty;

    MAX_LIVES = currentDifficulty.lives;
    lives = MAX_LIVES;
    player.resetBuffs();
    runStats = makeStats();
    pendingFlags = { newBestTime: false, newBestDamage: false, newFewestDeaths: false };

    stage.destroy();
    stage = newStage();
    stage.spawn();
    background.setStage(currentStageSpec().id);
    refreshMiniMap();
    player.teleportToStart();

    modifierOffer.show(pickRandomModifiers(3));
    stagePhase = 'modifierPick';
    stageTransitionTimerMs = 0;
    stageBanner.visible = false;
  }

  function joinWsRoom(room: Room) {
    const token = auth.getToken();
    if (token && room.mode === 'multiplayer') {
      net.enterRoom(room.code, token);
    }
  }

  function leaveCurrentRoom() {
    if (currentRoom) {
      void auth.leaveRoom(currentRoom.code);
      net.leaveRoom();
      currentRoom = null;
    }
    clearRemotePlayers();
    isMatchHost = false;
    isCoOpJoiner = false;
    pendingMission = null;
    pendingDifficulty = null;
    joinerSentHits.clear();
    lastRoomStatus = null;
  }

  function showRoomLobbyForRoom(room: Room) {
    roomLobby.show({
      code: room.code,
      youUserId: auth.getUserId(),
      onReadyToggle: () => {
        const me = lastRoomStatus?.members.find((m) => m.userId === auth.getUserId());
        net.sendReady(!(me?.ready ?? false));
      },
      onStartMatch: () => {
        net.sendStartMatch();
      },
      onLeave: () => {
        roomLobby.hide();
        leaveCurrentRoom();
        startLobby();
      },
    });
  }

  function startCoOpHostRun() {
    if (!pendingMission || !pendingDifficulty) return;
    isCoOpJoiner = false;
    applyRunStart(pendingMission, pendingDifficulty);
    pendingMission = null;
    pendingDifficulty = null;
  }

  function startCoOpJoinerRun() {
    if (!pendingMission || !pendingDifficulty) return;
    isCoOpJoiner = true;
    applyRunStart(pendingMission, pendingDifficulty);
    pendingMission = null;
    pendingDifficulty = null;
  }

  function startMissionSelect(statusText: string | undefined, mode: 'solo' | 'multiplayer') {
    victoryStats.hide();
    buffOffer.hide();
    modifierOffer.hide();
    stageBanner.visible = false;
    audio.stopBgm();
    stagePhase = 'modifierPick';
    stageTransitionTimerMs = 0;
    leaveCurrentRoom();
    missionSelect.show({
      ...(statusText !== undefined ? { statusText } : {}),
      onConfirm: (mission, difficulty) => {
        missionSelect.hide();
        if (mode === 'solo') {
          applyRunStart(mission, difficulty);
          void auth.createRoom(mission.id, difficulty.id, 'solo').then((room) => {
            if (!room) return;
            currentRoom = room;
            joinWsRoom(room);
          });
        } else {
          // Multiplayer host: create room + show RoomLobby; defer match start
          // until host clicks "Start Match" in the lobby.
          pendingMission = mission;
          pendingDifficulty = difficulty;
          isMatchHost = true;
          void auth.createRoom(mission.id, difficulty.id, 'multiplayer').then((room) => {
            if (!room) {
              isMatchHost = false;
              pendingMission = null;
              pendingDifficulty = null;
              startLobby('failed to create room');
              return;
            }
            currentRoom = room;
            joinWsRoom(room);
            showRoomLobbyForRoom(room);
          });
        }
      },
    });
  }

  function startLobby(statusText?: string) {
    victoryStats.hide();
    buffOffer.hide();
    modifierOffer.hide();
    stageBanner.visible = false;
    audio.stopBgm();
    leaveCurrentRoom();
    lobbyScreen.show({
      onSolo: () => {
        lobbyScreen.hide();
        startMissionSelect(statusText, 'solo');
      },
      onCreatePublic: () => {
        lobbyScreen.hide();
        startMissionSelect(statusText, 'multiplayer');
      },
      onJoinByCode: async (code) => {
        const room = await auth.joinRoom(code);
        if (!room) return { ok: false, error: 'room not found' };
        const mission = findMission(room.mission);
        if (!mission) return { ok: false, error: 'invalid mission in room' };
        const difficulty = findDifficulty(room.difficulty as 'easy' | 'normal' | 'hard');
        currentRoom = room;
        lobbyScreen.hide();
        if (room.mode === 'multiplayer') {
          // Joiner: stash mission/diff, enter WS room, wait in RoomLobby until host starts.
          pendingMission = mission;
          pendingDifficulty = difficulty;
          isMatchHost = false;
          joinWsRoom(room);
          showRoomLobbyForRoom(room);
        } else {
          applyRunStart(mission, difficulty);
          joinWsRoom(room);
        }
        return { ok: true };
      },
    });
  }

  function startCharacterSelect() {
    victoryStats.hide();
    buffOffer.hide();
    modifierOffer.hide();
    audio.stopBgm();
    characterSelect.show(() => {
      characterSelect.hide();
      startLobby();
    });
  }

  if (!auth.isAuthenticated()) {
    loginScreen.show({
      onSubmit: async (username) => {
        const result = await auth.login(username);
        if (result.ok) {
          loginScreen.hide();
          startCharacterSelect();
        } else {
          loginScreen.setError(result.error);
        }
      },
      onGuest: () => {
        loginScreen.hide();
        startCharacterSelect();
      },
    });
  } else {
    void auth.refreshRecords();
    startCharacterSelect();
  }

  let hitPauseMs = 0;
  let bossSparkCooldownMs = 0;
  let bossDramaTimerMs = 0;
  let lastSaveRun: Promise<void> | null = null;
  let netSendAccumMs = 0;
  const NET_SEND_INTERVAL_MS = 50;

  function impactFromDamage(applied: number): { shake: number; shakeDur: number; pause: number; intensity: HitIntensity } {
    if (applied >= 50) return { shake: 14, shakeDur: 260, pause: 90, intensity: 'massive' };
    if (applied >= 30) return { shake: 10, shakeDur: 200, pause: 60, intensity: 'heavy' };
    if (applied >= 18) return { shake: 6, shakeDur: 140, pause: 30, intensity: 'medium' };
    if (applied >= 10) return { shake: 4, shakeDur: 100, pause: 12, intensity: 'light' };
    return { shake: 2, shakeDur: 60, pause: 0, intensity: 'light' };
  }

  app.ticker.add(() => {
    const realDtMs = app.ticker.deltaMS;

    if (loginScreen.isOpen()) {
      loginScreen.tick(realDtMs);
      input.endFrame();
      return;
    }

    if (characterSelect.isOpen()) {
      characterSelect.update(input);
      input.endFrame();
      return;
    }

    if (lobbyScreen.isOpen()) {
      lobbyScreen.tick(realDtMs);
      lobbyScreen.update(input);
      input.endFrame();
      return;
    }

    if (roomLobby.isOpen()) {
      roomLobby.update(input);
      input.endFrame();
      return;
    }

    if (missionSelect.isOpen()) {
      missionSelect.update(input);
      input.endFrame();
      return;
    }

    if (menuScreen.isOpen()) {
      menuScreen.update(audio, input, {
        username: auth.getUsername(),
        onLogout: () => {
          leaveCurrentRoom();
          auth.logout();
          menuScreen.close();
          loginScreen.show({
            onSubmit: async (username) => {
              const result = await auth.login(username);
              if (result.ok) {
                loginScreen.hide();
                startCharacterSelect();
              } else {
                loginScreen.setError(result.error);
              }
            },
            onGuest: () => {
              loginScreen.hide();
              startCharacterSelect();
            },
          });
        },
      });
      input.endFrame();
      return;
    }

    if (input.justPressed('options')) {
      menuScreen.open();
      input.endFrame();
      return;
    }
    if (input.justPressed('mute')) {
      audio.setMuted(!audio.isMuted());
    }

    const isCinematic =
      stagePhase === 'modifierPick' ||
      stagePhase === 'clearAnnounce' ||
      stagePhase === 'buffOffer' ||
      stagePhase === 'victoryAnnounce' ||
      stagePhase === 'victoryStats' ||
      stagePhase === 'gameOver';
    const gameDtMs = isCinematic ? 0 : realDtMs;
    const dtMs = hitPauseMs > 0 ? 0 : gameDtMs;
    hitPauseMs = Math.max(0, hitPauseMs - realDtMs);

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
      for (let mobIdx = 0; mobIdx < stageMobs.length; mobIdx++) {
        const m = stageMobs[mobIdx]!;
        if (!m.alive) continue;
        const hb = m.hurtbox();
        if (rectsOverlap(hit.bbox, hb)) {
          const aerial = !m.onGround;
          const backstab = hit.facing === m.facing;
          let dmg = hit.damage;
          if (aerial) dmg *= 1.3;
          if (backstab) dmg *= 1.3;

          if (isCoOpJoiner) {
            const dedupeKey = `${mobIdx}-${hit.attackId}`;
            if (joinerSentHits.has(dedupeKey)) continue;
            joinerSentHits.add(dedupeKey);
            net.sendPlayerHit({
              mobIdx,
              attackId: hit.attackId,
              damage: dmg,
              knockback: hit.knockback * hit.facing,
              facing: hit.facing,
              isCombo: hit.isCombo,
              parryBuff: player.hasParryBuff(),
              aerial,
              backstab,
            });
            // Optimistic local visuals; mob HP will catch up via mob_states.
            const c = intersectionCenter(hit.bbox, hb);
            runStats.damageDealt += dmg;
            hitFx.popup(c.x, c.y, Math.round(dmg), {
              parryBuff: player.hasParryBuff(),
              aerial,
              backstab,
            });
            hitFx.spark(c.x, c.y);
            player.giveMp(ELESIS.mpPerHit);
            if (hit.isCombo && player.modifiers.comboLifestealPct > 0) {
              player.heal(dmg * player.modifiers.comboLifestealPct);
            }
            const impact = impactFromDamage(dmg);
            camera.shake(impact.shake, impact.shakeDur);
            hitPauseMs = Math.max(hitPauseMs, impact.pause);
            audio.playHit(impact.intensity);
            continue;
          }

          const result = m.receiveHit(hit.attackId, dmg, hit.knockback * hit.facing);
          if (result !== null) {
            const c = intersectionCenter(hit.bbox, hb);
            runStats.damageDealt += result.applied;
            hitFx.popup(c.x, c.y, Math.round(result.applied), {
              parryBuff: player.hasParryBuff(),
              aerial,
              backstab,
            });
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
              if (isBoss && bossDramaTimerMs <= 0) {
                bossDramaTimerMs = 1000;
              }
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

    for (const m of stageMobs) {
      if (m.consumePhaseChange()) {
        const bb = m.hurtbox();
        const bcx = bb.x + bb.w / 2;
        const bcy = bb.y + bb.h / 2;
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          hitFx.spark(bcx + Math.cos(ang) * 70, bcy + Math.sin(ang) * 70);
        }
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
          hitFx.spark(bcx + Math.cos(ang) * 36, bcy + Math.sin(ang) * 36);
        }
        hitFx.textPopup(bcx, bcy - 50, 'PHASE 2!', { color: 0xff3344, fontSize: 28 });
        camera.shake(20, 500);
        hitPauseMs = Math.max(hitPauseMs, 180);
        audio.playBossPhase2();
        if (m.isBoss()) {
          audio.playBgm('bossRage');
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
        const durationMs = performance.now() - runStats.startedAtMs;
        lastSaveRun = auth.saveRun({
          durationMs,
          damageDealt: Math.round(runStats.damageDealt),
          deaths: runStats.deaths,
          victory: false,
        });
        lives = MAX_LIVES;
        currentStageIdx = 0;
        player.resetBuffs();
        records = applyGameOverToRecords(records);
        saveRecords(records);
        runStats = makeStats();
        stage.destroy();
        stage = newStage();
        stage.spawn();
        background.setStage(currentStageSpec().id);
        stagePhase = 'gameOver';
        stageTransitionTimerMs = 2000;
        stageBanner.text = 'GAME OVER';
        audio.stopBgm();
      } else {
        for (const m of stage.getMobs()) m.resetTransientBuffs();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = stageBannerText(currentStageSpec(), currentStageIdx);
      }
      stageBanner.visible = true;
    }
    prevPlayerState = player.state;

    if (stagePhase === 'playing' && stage.isCleared()) {
      if (isLastStageInMission()) {
        runStats.endedAtMs = performance.now();
        stagePhase = 'bossDeathDrama';
        stageTransitionTimerMs = 2500;
        audio.stopBgm();
      } else {
        stagePhase = 'awaitingPortal';
        stageBanner.text = `STAGE ${currentStageIdx + 1} CLEAR! → portal open`;
        stageBanner.visible = true;
        stageTransitionTimerMs = 1200;
      }
    } else if (stagePhase === 'bossDeathDrama') {
      stageTransitionTimerMs -= realDtMs;
      if (stageTransitionTimerMs <= 0) {
        const durationMs = (runStats.endedAtMs ?? performance.now()) - runStats.startedAtMs;
        const result = applyVictoryToRecords(
          records,
          durationMs,
          Math.round(runStats.damageDealt),
          runStats.deaths,
        );
        records = result.records;
        pendingFlags = result.flags;
        saveRecords(records);
        lastSaveRun = auth.saveRun({
          durationMs,
          damageDealt: Math.round(runStats.damageDealt),
          deaths: runStats.deaths,
          victory: true,
        });
        stagePhase = 'victoryAnnounce';
        stageTransitionTimerMs = 2500;
        stageBanner.text = 'VICTORY!';
        stageBanner.visible = true;
      }
    } else if (stagePhase === 'awaitingPortal') {
      if (stageTransitionTimerMs > 0) {
        stageTransitionTimerMs -= realDtMs;
        if (stageTransitionTimerMs <= 0) {
          stageBanner.visible = false;
        }
      }
      const portalBox = stage.getPortalBox();
      if (portalBox && player.onGround) {
        const playerBox = player.aabb();
        if (rectsOverlap(playerBox, portalBox) && input.justPressed('down')) {
          stagePhase = 'clearAnnounce';
          stageTransitionTimerMs = 800;
          stageBanner.text = `STAGE ${currentStageIdx + 1} CLEAR!`;
          stageBanner.visible = true;
        }
      }
    } else if (stagePhase === 'clearAnnounce') {
      stageTransitionTimerMs -= realDtMs;
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
        currentStageIdx = currentStageIdx + 1;
        stage.destroy();
        stage = newStage();
        stage.spawn();
        background.setStage(currentStageSpec().id);
        player.teleportToStart();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = stageBannerText(currentStageSpec(), currentStageIdx);
        stageBanner.visible = true;
        audio.playBgm(bgmIdForStage(currentStageSpec().id));
      }
    } else if (stagePhase === 'nextAnnounce') {
      stageTransitionTimerMs -= realDtMs;
      if (stageTransitionTimerMs <= 0) {
        stageBanner.visible = false;
        stagePhase = 'playing';
      }
    } else if (stagePhase === 'gameOver') {
      stageTransitionTimerMs -= realDtMs;
      if (stageTransitionTimerMs <= 0) {
        startLobby('GAME OVER  ·  pick a mission to retry');
      }
    } else if (stagePhase === 'victoryAnnounce') {
      stageTransitionTimerMs -= realDtMs;
      if (stageTransitionTimerMs <= 0) {
        stageBanner.visible = false;
        victoryStats.show(statsView(), auth.getUsername());
        const pending = lastSaveRun;
        void (async () => {
          if (pending) await pending.catch(() => undefined);
          const entries = await fetchLeaderboard('time', 5);
          victoryStats.setLeaderboard(entries, auth.getUsername());
        })();
        stagePhase = 'victoryStats';
      }
    } else if (stagePhase === 'modifierPick') {
      let pickIdx = -1;
      if (input.justPressed('pick1')) pickIdx = 0;
      else if (input.justPressed('pick2')) pickIdx = 1;
      else if (input.justPressed('pick3')) pickIdx = 2;
      if (pickIdx >= 0) {
        const offers = modifierOffer.getOffers();
        const mod = offers[pickIdx];
        if (mod) player.applyModifier(mod);
        modifierOffer.hide();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = stageBannerText(currentStageSpec(), currentStageIdx);
        stageBanner.visible = true;
        runStats.startedAtMs = performance.now();
        audio.playBgm(bgmIdForStage(currentStageSpec().id));
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
        startLobby();
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

    if (bossDramaTimerMs > 0) {
      bossDramaTimerMs -= dtMs;
      if (bossDramaTimerMs <= 0) {
        stage.killNonBossMobs();
      }
    }

    {
      const stageW = stage.spec.width;
      if (player.x < 0) {
        player.x = 0;
        if (player.vx < 0) player.vx = 0;
      }
      const maxX = stageW - ELESIS.width;
      if (player.x > maxX) {
        player.x = maxX;
        if (player.vx > 0) player.vx = 0;
      }
    }

    hitFx.update(dtMs);

    for (const rp of remotePlayers.values()) rp.update(realDtMs);

    if (currentRoom && currentRoom.mode === 'multiplayer') {
      netSendAccumMs += realDtMs;
      if (netSendAccumMs >= NET_SEND_INTERVAL_MS) {
        netSendAccumMs = 0;
        net.sendPlayerState({
          x: player.x,
          y: player.y,
          vx: player.vx,
          vy: player.vy,
          facing: player.facing,
          state: player.state,
          hp: player.hp,
          maxHp: player.getMaxHp(),
        });
      }
      if (isMatchHost) {
        mobBroadcastAccumMs += realDtMs;
        if (mobBroadcastAccumMs >= MOB_BROADCAST_INTERVAL_MS) {
          mobBroadcastAccumMs = 0;
          const mobs = stage.getMobs().map((m, idx) => m.serializeForNetwork(idx));
          net.sendMobStates(mobs);
        }
      }
    }

    camera.follow(
      player.x + ELESIS.width / 2,
      player.y + ELESIS.height / 2,
      0,
      stage.spec.width,
    );
    camera.update(realDtMs);

    background.update(camera.getOffsetX(), camera.getOffsetY());

    if (input.isHeld('minimap')) {
      miniMap.show(currentStageIdx);
    } else {
      miniMap.hide();
    }

    const boss = stage.getBoss();
    if (boss && stagePhase === 'playing') {
      bossHpBar.show(boss.getBossName() ?? 'BOSS');
      bossHpBar.update(boss.hp, boss.getMaxHp(), boss.getPhase());
    } else {
      bossHpBar.hide();
    }

    const aliveCount = stage.getMobs().filter((m) => m.alive).length;
    const elapsedMs =
      runStats.endedAtMs !== null
        ? runStats.endedAtMs - runStats.startedAtMs
        : performance.now() - runStats.startedAtMs;
    const username = auth.getUsername();
    let infoLine: string;
    if (username) {
      infoLine = currentRoom ? `@${username} · ${currentRoom.code}` : `@${username}`;
    } else {
      infoLine = serverInfo;
    }
    hud.update({
      player,
      lives,
      maxLives: MAX_LIVES,
      stageIdx: currentStageIdx,
      stageName: currentStageSpec().name,
      totalStages: currentMission.stageIds.length,
      aliveCount,
      serverInfo: infoLine,
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
