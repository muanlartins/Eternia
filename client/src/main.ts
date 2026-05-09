import { Application, Container, Graphics, Text } from 'pixi.js';
import { ELESIS } from './data/elesis.js';
import { BUFFS, pickRandomBuffs, type BuffSpec } from './data/buffs.js';
import { Input } from './game/Input.js';
import { Player } from './game/Player.js';
import { Camera } from './game/Camera.js';
import { Stage } from './game/Stage.js';
import { Projectile } from './game/Projectile.js';
import { ARCHER } from './data/archer.js';
import { HitFx } from './game/HitFx.js';
import { GameAudio, type BgmId, type HitIntensity } from './game/Audio.js';
import { HtmlHud } from './ui/screens/Hud/Hud.js';
import { CardPick, type CardPickEntry } from './ui/screens/CardPick/CardPick.js';
import {
  VictoryStats as HtmlVictoryStats,
  type RunStatsView,
} from './ui/screens/VictoryStats/VictoryStats.js';
import { MenuScreen as HtmlMenuScreen } from './ui/screens/MenuScreen/MenuScreen.js';
import { BossHpBar as HtmlBossHpBar } from './ui/screens/BossHpBar/BossHpBar.js';
import { MiniMap as HtmlMiniMap } from './ui/screens/MiniMap/MiniMap.js';
import { ThreePilot } from './three/ThreePilot.js';
import { GameThreeLayer } from './three/GameThreeLayer.js';
import { Background } from './game/Background.js';
import { loadForestArt } from './game/Forest.js';
import { pickRandomModifiers, type RunModifier } from './data/modifiers.js';
import { Auth, fetchLeaderboard, type Room } from './game/Auth.js';
import './ui/tokens.css';
import { Login } from './ui/screens/Login/Login.js';
import { CharacterSelect as HtmlCharacterSelect } from './ui/screens/CharacterSelect/CharacterSelect.js';
import { MissionSelect as HtmlMissionSelect } from './ui/screens/MissionSelect/MissionSelect.js';
import { RoomList as HtmlRoomList } from './ui/screens/RoomList/RoomList.js';
import { Lobby as HtmlLobby } from './ui/screens/Lobby/Lobby.js';
import { RoomLobby as HtmlRoomLobby } from './ui/screens/RoomLobby/RoomLobby.js';
import { Network, type RoomStatus } from './game/Network.js';
import { RemotePlayer } from './game/RemotePlayer.js';
import { findMission } from './data/missions.js';
import { MOB_SPECS } from './data/stages.js';
import { getStageData, type StageData } from './data/stage-data.js';
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

function stageBannerText(spec: StageData, displayIdx: number): string {
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

  const stageEl = document.getElementById('stage');
  if (stageEl) {
    const fitStage = () => {
      const sx = window.innerWidth / GAME_W;
      const sy = window.innerHeight / GAME_H;
      const scale = Math.min(sx, sy);
      const tx = Math.round((window.innerWidth - GAME_W * scale) / 2);
      const ty = Math.round((window.innerHeight - GAME_H * scale) / 2);
      stageEl.style.setProperty('--scale', String(scale));
      stageEl.style.setProperty('--tx', `${tx}px`);
      stageEl.style.setProperty('--ty', `${ty}px`);
    };
    window.addEventListener('resize', fitStage);
    fitStage();
  }

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

  const input = new Input({ doubleTapWindowMs: ELESIS.doubleTapWindowMs });
  const player = new Player(ELESIS);

  let activeCharacterId = 'astrid';

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

  function currentStageSpec(): StageData {
    return getStageData(currentMission.stageIds[currentStageIdx]!)!;
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

  void loadForestArt().then(() => {
    background.setStage(currentStageSpec().id);
  });

  let stage = newStage();
  stage.spawn();
  background.setStage(currentStageSpec().id);

  worldStage.addChild(player.view);

  const hitFx = new HitFx();
  worldStage.addChild(hitFx.container);

  const camera = new Camera(worldStage, GAME_W, GAME_H);

  const htmlHud = new HtmlHud();

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

  const htmlVictoryStats = new HtmlVictoryStats();
  const htmlMiniMap = new HtmlMiniMap();
  const htmlMenuScreen = new HtmlMenuScreen();
  const htmlBossHpBar = new HtmlBossHpBar();

  function refreshMiniMap() {
    const stages = currentMission.stageIds.map((id) => {
      const s = getStageData(id)!;
      return { id: s.id, name: s.name };
    });
    htmlMiniMap.setStages(stages, currentMission.name);
  }
  refreshMiniMap();

  const auth = new Auth();

  const uiOverlay = document.getElementById('ui-overlay');
  const htmlLogin = new Login();
  uiOverlay?.appendChild(htmlLogin.element);

  const htmlCharacterSelect = new HtmlCharacterSelect();
  uiOverlay?.appendChild(htmlCharacterSelect.element);

  const htmlMissionSelect = new HtmlMissionSelect();
  uiOverlay?.appendChild(htmlMissionSelect.element);

  const htmlRoomList = new HtmlRoomList();
  uiOverlay?.appendChild(htmlRoomList.element);

  const htmlLobby = new HtmlLobby();
  uiOverlay?.appendChild(htmlLobby.element);

  const htmlRoomLobby = new HtmlRoomLobby();
  uiOverlay?.appendChild(htmlRoomLobby.element);

  uiOverlay?.appendChild(htmlHud.element);

  const htmlCardPick = new CardPick();
  uiOverlay?.appendChild(htmlCardPick.element);

  uiOverlay?.appendChild(htmlVictoryStats.element);
  uiOverlay?.appendChild(htmlMenuScreen.element);
  uiOverlay?.appendChild(htmlBossHpBar.element);
  uiOverlay?.appendChild(htmlMiniMap.element);

  const threePilot = new ThreePilot();
  document.body.appendChild(threePilot.element);
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
    if (e.code === 'F9') {
      e.preventDefault();
      threePilot.toggle();
    }
  });
  if (new URLSearchParams(location.search).has('pilot')) {
    threePilot.show();
  }

  const audio = new GameAudio();
  void audio.preloadSfxLibrary();

  function playMobHitSfx(mobId: string, fallbackIntensity: HitIntensity) {
    if (mobId === 'slim') audio.playSpriteHit();
    else if (mobId === 'racoon') audio.playBeastHit();
    else audio.playHit(fallbackIntensity);
  }
  function playMobDeathSfx(mobId: string, isBoss: boolean) {
    if (isBoss) audio.playMobDeath(true);
    else if (mobId === 'slim') audio.playSpriteDeath();
    else if (mobId === 'racoon') audio.playBeastDeath();
    else audio.playMobDeath(false);
  }

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
      if (htmlRoomLobby.element.dataset.visible === 'true') {
        htmlRoomLobby.applyStatus(status.members);
      }
      if (status.matchStarted && !isMatchHost && pendingMission && pendingDifficulty) {
        htmlRoomLobby.hide();
        startCoOpJoinerRun();
      }
    },
    onMatchStart: () => {
      htmlRoomLobby.hide();
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
    onProjectileSpawn: (sourceUserId, p) => {
      if (sourceUserId === auth.getUserId()) return;
      const isGhost = p.owner === 'player';
      const ghost = new Projectile(
        p.x,
        p.y,
        p.vx,
        p.damage,
        p.knockback,
        p.width,
        p.height,
        p.lifetimeMs,
        p.facing,
        undefined,
        {
          vy: p.vy,
          gravity: p.gravity,
          owner: p.owner,
          visual: p.visual,
          pierce: p.pierce,
          isGhost,
        },
      );
      stage.addRemoteProjectile(ghost);
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

    showModifierPick(pickRandomModifiers(3));
    stagePhase = 'modifierPick';
    stageTransitionTimerMs = 0;
    stageBanner.visible = false;
  }

  function buffToCard(b: BuffSpec): CardPickEntry {
    return {
      name: b.name,
      description: b.description,
      rarity: b.rarity === 'rare' ? 'rare' : 'common',
      glyph: b.name.charAt(0).toUpperCase(),
    };
  }

  function modifierToCard(m: RunModifier): CardPickEntry {
    return {
      name: m.name,
      description: m.description,
      rarity: 'modifier',
      glyph: '★',
    };
  }

  function showBuffPick(offers: readonly BuffSpec[]) {
    htmlCardPick.show({
      eyebrow: 'Recompensa de stage',
      title: 'Escolha uma bênção',
      subtitle: 'Cada caminho deixa uma marca — leve uma para o próximo trecho.',
      cards: offers.map(buffToCard),
      hintLabel: 'aplicar bênção',
      onPick: (i) => {
        const buff = offers[i];
        if (buff) {
          player.applyBuff(buff);
          runStats.buffsPicked.push(buff.name);
        }
        htmlCardPick.hide();
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
      },
    });
  }

  function showModifierPick(offers: readonly RunModifier[]) {
    htmlCardPick.show({
      eyebrow: 'Antes da partida',
      title: 'Sele um caminho',
      subtitle: 'Cada caminho cobra um preço — escolha aquele que melhor se afina com seu instinto.',
      cards: offers.map(modifierToCard),
      hintLabel: 'selar caminho',
      onPick: (i) => {
        const mod = offers[i];
        if (mod) player.applyModifier(mod);
        htmlCardPick.hide();
        stagePhase = 'nextAnnounce';
        stageTransitionTimerMs = 1500;
        stageBanner.text = stageBannerText(currentStageSpec(), currentStageIdx);
        stageBanner.visible = true;
        runStats.startedAtMs = performance.now();
        audio.playBgm(bgmIdForStage(currentStageSpec().id));
      },
    });
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
    htmlMissionSelect.hide();
    htmlRoomList.hide();
    htmlRoomLobby.show({
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
        htmlRoomLobby.hide();
        leaveCurrentRoom();
        startMissionSelect();
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

  function startMissionSelect() {
    htmlVictoryStats.hide();
    htmlRoomList.hide();
    stageBanner.visible = false;
    audio.playBgm('mission');
    stagePhase = 'modifierPick';
    stageTransitionTimerMs = 0;
    leaveCurrentRoom();
    htmlMissionSelect.show({
      onBack: () => {
        htmlMissionSelect.hide();
        startCharacterSelect();
      },
      onSelectMission: (mission) => {
        startRoomList(mission);
      },
    });
  }

  function startRoomList(mission: MissionSpec) {
    const difficulty = findDifficulty('normal');
    htmlRoomList.show({
      mission,
      username: auth.getUsername(),
      fetchRooms: async (missionId) => {
        const all = await auth.listRooms();
        return all.filter((r) => r.mission === missionId && r.status === 'lobby');
      },
      onCreateRoom: () => {
        htmlRoomList.hide();
        pendingMission = mission;
        pendingDifficulty = difficulty;
        isMatchHost = true;
        void auth.createRoom(mission.id, difficulty.id, 'multiplayer').then((room) => {
          if (!room) {
            isMatchHost = false;
            pendingMission = null;
            pendingDifficulty = null;
            startRoomList(mission);
            return;
          }
          currentRoom = room;
          joinWsRoom(room);
          showRoomLobbyForRoom(room);
        });
      },
      onJoinRoom: (room) => {
        htmlRoomList.hide();
        const m = findMission(room.mission);
        if (!m) return;
        const diff = findDifficulty(room.difficulty as 'easy' | 'normal' | 'hard');
        pendingMission = m;
        pendingDifficulty = diff;
        isMatchHost = false;
        void auth.joinRoom(room.code).then((joined) => {
          if (!joined) {
            startRoomList(mission);
            return;
          }
          currentRoom = joined;
          joinWsRoom(joined);
          showRoomLobbyForRoom(joined);
        });
      },
      onBack: () => {
        htmlRoomList.hide();
      },
    });
  }

  function startCharacterSelect() {
    htmlVictoryStats.hide();
    audio.playBgm('menu');
    htmlCharacterSelect.show({
      username: auth.getUsername(),
      onConfirm: (char) => {
        htmlCharacterSelect.hide();
        onCharacterSelected(char);
      },
    });
  }

  function onCharacterSelected(char: { id: string; name: string }) {
    activeCharacterId = char.id;
    if (char.id === 'naia') {
      player.switchSpec(ARCHER);
      void initNaia3DLayer();
    } else {
      player.switchSpec(ELESIS);
    }
    startMissionSelect();
  }

  let gameThreeLayer: GameThreeLayer | null = null;
  let naia3DReady = false;
  async function initNaia3DLayer(): Promise<void> {
    if (gameThreeLayer) return;
    if (!container) return;
    gameThreeLayer = new GameThreeLayer(container, GAME_W, GAME_H);
    try {
      await gameThreeLayer.loadNaia('/models/naia.glb');
      naia3DReady = true;
      player.setRenderingHidden(true);
    } catch (err) {
      console.error('[main] failed to init Naia 3D layer:', err);
    }
  }

  if (!auth.isAuthenticated()) {
    htmlLogin.show({
      onSubmit: async (username) => {
        const result = await auth.login(username);
        if (result.ok) {
          htmlLogin.hide();
          startCharacterSelect();
        } else {
          htmlLogin.setError(result.error);
        }
      },
      onGuest: () => {
        htmlLogin.hide();
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

    if (htmlLogin.element.dataset.visible === 'true') {
      input.endFrame();
      return;
    }

    if (htmlCharacterSelect.element.dataset.visible === 'true') {
      input.endFrame();
      return;
    }

    if (htmlLobby.element.dataset.visible === 'true') {
      input.endFrame();
      return;
    }

    if (htmlRoomLobby.element.dataset.visible === 'true') {
      input.endFrame();
      return;
    }

    if (htmlMissionSelect.element.dataset.visible === 'true') {
      input.endFrame();
      return;
    }

    if (htmlMenuScreen.isOpen()) {
      htmlMenuScreen.refresh();
      input.endFrame();
      return;
    }

    if (input.justPressed('options')) {
      htmlMenuScreen.open(audio, {
        username: auth.getUsername(),
        onLogout: () => {
          leaveCurrentRoom();
          auth.logout();
          htmlMenuScreen.close();
          htmlLogin.show({
            onSubmit: async (username) => {
              const result = await auth.login(username);
              if (result.ok) {
                htmlLogin.hide();
                startCharacterSelect();
              } else {
                htmlLogin.setError(result.error);
              }
            },
            onGuest: () => {
              htmlLogin.hide();
              startCharacterSelect();
            },
          });
        },
      });
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
    const newArrows = player.flushPendingArrows();
    if (newArrows.length > 0) {
      stage.addPlayerProjectiles(newArrows);
      for (let i = 0; i < newArrows.length; i++) audio.playBowShoot();
    }

    const stageMobs = stage.getMobs();

    if (currentRoom !== null) {
      const justSpawned = stage.consumeRecentlySpawned();
      for (const p of justSpawned) {
        net.sendProjectileSpawn({
          x: p.x,
          y: p.y,
          vx: p.vx,
          vy: p.vy,
          width: p.width,
          height: p.height,
          facing: p.facing,
          damage: p.damage,
          knockback: p.knockback,
          lifetimeMs: p.lifetimeMs,
          gravity: p.gravity,
          visual: p.visual,
          owner: p.owner,
          pierce: p.pierce,
        });
      }
    }

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
            playMobHitSfx(m.getId(), impact.intensity);
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
            playMobHitSfx(m.getId(), impact.intensity);

            if (!m.alive) {
              const isBoss = m.isBoss();
              const id = m.getId();
              const name = m.getDisplayName();
              const entry = runStats.killCounts[id];
              if (entry) entry.count += 1;
              else runStats.killCounts[id] = { name, count: 1 };
              camera.shake(isBoss ? 26 : 8, isBoss ? 700 : 200);
              hitPauseMs = Math.max(hitPauseMs, isBoss ? 220 : 50);
              playMobDeathSfx(id, isBoss);
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
      const projBox = proj.hurtbox();

      if (proj.owner === 'player') {
        if (proj.isGhost) continue;
        for (let mobIdx = 0; mobIdx < stageMobs.length; mobIdx++) {
          const m = stageMobs[mobIdx]!;
          if (!m.alive) continue;
          const mobIdStr = String(mobIdx);
          if (proj.hasHit(mobIdStr)) continue;
          const hb = m.hurtbox();
          if (!rectsOverlap(projBox, hb)) continue;
          const c = intersectionCenter(projBox, hb);
          const aerial = !m.onGround;
          let dmg = proj.damage;
          if (aerial) dmg *= 1.3;
          const knockback = proj.facing * proj.knockback;
          if (isCoOpJoiner) {
            const dedupeKey = `arrow-${mobIdx}-${proj.attackId}`;
            if (!joinerSentHits.has(dedupeKey)) {
              joinerSentHits.add(dedupeKey);
              net.sendPlayerHit({
                mobIdx,
                attackId: proj.attackId,
                damage: dmg,
                knockback,
                facing: proj.facing,
                isCombo: true,
                parryBuff: false,
                aerial,
                backstab: false,
              });
            }
            runStats.damageDealt += dmg;
            hitFx.popup(c.x, c.y, Math.round(dmg), { aerial });
            hitFx.spark(c.x, c.y);
            player.giveMp(player.spec.mpPerHit);
          } else {
            const result = m.receiveHit(proj.attackId, dmg, knockback);
            if (result !== null) {
              runStats.damageDealt += result.applied;
              hitFx.popup(c.x, c.y, Math.round(result.applied), { aerial });
              hitFx.spark(c.x, c.y);
              player.giveMp(player.spec.mpPerHit);
            }
          }
          proj.markHit(mobIdStr);
          if (proj.hitCount() >= proj.pierce) proj.alive = false;
          camera.shake(3, 80);
          playMobHitSfx(m.getId(), 'light');
          if (!proj.alive) break;
        }
        continue;
      }

      const playerBox = player.aabb();
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
        audio.playNaiaDeath();
        audio.playDefeatSting();
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
        audio.playVictorySting();
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
        showBuffPick(pickRandomBuffs(BUFFS, 3));
        stagePhase = 'buffOffer';
      }
    } else if (stagePhase === 'nextAnnounce') {
      stageTransitionTimerMs -= realDtMs;
      if (stageTransitionTimerMs <= 0) {
        stageBanner.visible = false;
        stagePhase = 'playing';
        audio.playStageIntro();
      }
    } else if (stagePhase === 'gameOver') {
      stageTransitionTimerMs -= realDtMs;
      if (stageTransitionTimerMs <= 0) {
        startMissionSelect();
      }
    } else if (stagePhase === 'victoryAnnounce') {
      stageTransitionTimerMs -= realDtMs;
      if (stageTransitionTimerMs <= 0) {
        stageBanner.visible = false;
        htmlVictoryStats.show(statsView(), auth.getUsername());
        const pending = lastSaveRun;
        void (async () => {
          if (pending) await pending.catch(() => undefined);
          const entries = await fetchLeaderboard('time', 5);
          htmlVictoryStats.setLeaderboard(entries, auth.getUsername());
        })();
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
        startMissionSelect();
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
      0,
      stage.spec.height,
    );
    camera.update(realDtMs);

    background.update(camera.getOffsetX(), camera.getOffsetY());

    if (gameThreeLayer && naia3DReady) {
      gameThreeLayer.sync(
        player.x + player.spec.width / 2,
        player.y + player.spec.height,
        player.vx,
        player.facing,
        player.onGround,
        camera.getOffsetX(),
        camera.getOffsetY(),
      );
      gameThreeLayer.syncMobs(stage.getMobs());
      for (const m of stage.getMobs()) {
        if (m.spec.model3DUrl) m.setRenderingHidden(true);
      }
      gameThreeLayer.render();
    }

    if (input.isHeld('minimap')) {
      htmlMiniMap.show(currentStageIdx);
    } else {
      htmlMiniMap.hide();
    }

    const boss = stage.getBoss();
    if (boss && stagePhase === 'playing') {
      htmlBossHpBar.show(boss.getBossName() ?? 'BOSS');
      htmlBossHpBar.update(boss.hp, boss.getMaxHp(), boss.getPhase());
    } else {
      htmlBossHpBar.hide();
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
    if (!htmlHud.isVisible()) htmlHud.show();
    htmlHud.update({
      player,
      characterName: activeCharacterId === 'naia' ? 'NAIA' : 'ASTRID',
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
