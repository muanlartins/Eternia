export interface RemoteStatePayload {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: -1 | 1;
  state: string;
  hp: number;
  maxHp: number;
}

export interface RemoteRosterEntry {
  userId: number;
  username: string;
}

export interface RoomMember {
  userId: number;
  username: string;
  ready: boolean;
  isHost: boolean;
}

export interface RoomStatus {
  code: string;
  matchStarted: boolean;
  members: readonly RoomMember[];
}

export interface MobStateUpdate {
  idx: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  state: string;
  facing: -1 | 1;
  phase: 1 | 2;
  stateTimeMs: number;
  currentAttackIdx: number;
  alive: boolean;
}

export interface PlayerHitPayload {
  mobIdx: number;
  attackId: number;
  damage: number;
  knockback: number;
  facing: -1 | 1;
  isCombo: boolean;
  parryBuff: boolean;
  aerial: boolean;
  backstab: boolean;
}

export interface ProjectileSpawnPayload {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: -1 | 1;
  damage: number;
  knockback: number;
  lifetimeMs: number;
  gravity: number;
  visual: 'arrow' | 'rect';
  owner: 'player' | 'mob';
  pierce: number;
}

export interface NetworkHandlers {
  onHello?: (v: string) => void;
  onRoster?: (others: readonly RemoteRosterEntry[]) => void;
  onRemoteJoin?: (entry: RemoteRosterEntry) => void;
  onRemoteLeave?: (userId: number) => void;
  onRemoteState?: (
    entry: RemoteRosterEntry,
    state: RemoteStatePayload,
  ) => void;
  onRoomStatus?: (status: RoomStatus) => void;
  onMatchStart?: (code: string) => void;
  onMobStates?: (mobs: readonly MobStateUpdate[]) => void;
  onMobEvent?: (payload: unknown) => void;
  onPlayerHit?: (hit: PlayerHitPayload) => void;
  onStagePhase?: (phase: string, payload: unknown) => void;
  onProjectileSpawn?: (sourceUserId: number, proj: ProjectileSpawnPayload) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'closed' | 'error') => void;
}

export class Network {
  private ws: WebSocket | null = null;
  private handlers: NetworkHandlers = {};
  private wantsHello = true;
  private currentRoomCode: string | null = null;
  private currentToken: string | null = null;
  private connectAttempts = 0;
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  setHandlers(h: NetworkHandlers) {
    this.handlers = h;
  }

  isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  enterRoom(code: string, token: string) {
    this.currentRoomCode = code;
    this.currentToken = token;
    this.send({ t: 'enter_room', code, token });
  }

  leaveRoom() {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'leave_room' });
    this.currentRoomCode = null;
    this.currentToken = null;
  }

  sendPlayerState(state: RemoteStatePayload) {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'player_state', state });
  }

  sendReady(ready: boolean) {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'set_ready', ready });
  }

  sendStartMatch() {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'start_match' });
  }

  sendMobStates(mobs: readonly MobStateUpdate[]) {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'mob_states', mobs });
  }

  sendMobEvent(payload: unknown) {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'mob_event', payload });
  }

  sendPlayerHit(hit: PlayerHitPayload) {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'player_hit', hit });
  }

  sendStagePhase(phase: string, payload?: unknown) {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'stage_phase', phase, payload: payload ?? null });
  }

  sendProjectileSpawn(proj: ProjectileSpawnPayload) {
    if (this.currentRoomCode === null) return;
    this.send({ t: 'projectile_spawn', proj });
  }

  private send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch {}
  }

  private connect() {
    this.handlers.onStatusChange?.('connecting');
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.addEventListener('open', () => {
      this.connectAttempts = 0;
      this.handlers.onStatusChange?.('connected');
      if (this.wantsHello) {
        this.send({ t: 'hello', v: '0.0.1' });
      }
      if (this.currentRoomCode && this.currentToken) {
        this.send({ t: 'enter_room', code: this.currentRoomCode, token: this.currentToken });
      }
    });
    ws.addEventListener('message', (e) => this.dispatch(e.data));
    ws.addEventListener('close', () => {
      this.handlers.onStatusChange?.('closed');
      this.scheduleReconnect();
    });
    ws.addEventListener('error', () => {
      this.handlers.onStatusChange?.('error');
    });
  }

  private scheduleReconnect() {
    this.connectAttempts++;
    const backoff = Math.min(8000, 500 * 2 ** Math.min(4, this.connectAttempts - 1));
    setTimeout(() => this.connect(), backoff);
  }

  private dispatch(raw: unknown) {
    if (typeof raw !== 'string') return;
    let msg: { t?: string;[k: string]: unknown };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.t) {
      case 'hello':
        this.handlers.onHello?.(typeof msg.v === 'string' ? msg.v : '');
        break;
      case 'room_roster':
        if (Array.isArray(msg.others)) {
          this.handlers.onRoster?.(msg.others as RemoteRosterEntry[]);
        }
        break;
      case 'remote_join':
        if (typeof msg.userId === 'number' && typeof msg.username === 'string') {
          this.handlers.onRemoteJoin?.({ userId: msg.userId, username: msg.username });
        }
        break;
      case 'remote_leave':
        if (typeof msg.userId === 'number') {
          this.handlers.onRemoteLeave?.(msg.userId);
        }
        break;
      case 'remote_state': {
        const userId = typeof msg.userId === 'number' ? msg.userId : null;
        const username = typeof msg.username === 'string' ? msg.username : '';
        const state = msg.state as RemoteStatePayload | undefined;
        if (userId !== null && state) {
          this.handlers.onRemoteState?.({ userId, username }, state);
        }
        break;
      }
      case 'room_status': {
        const code = typeof msg.code === 'string' ? msg.code : '';
        const matchStarted = msg.matchStarted === true;
        const members = Array.isArray(msg.members) ? (msg.members as RoomMember[]) : [];
        this.handlers.onRoomStatus?.({ code, matchStarted, members });
        break;
      }
      case 'match_start': {
        const code = typeof msg.code === 'string' ? msg.code : '';
        this.handlers.onMatchStart?.(code);
        break;
      }
      case 'mob_states': {
        const mobs = Array.isArray(msg.mobs) ? (msg.mobs as MobStateUpdate[]) : [];
        this.handlers.onMobStates?.(mobs);
        break;
      }
      case 'mob_event':
        this.handlers.onMobEvent?.(msg.payload);
        break;
      case 'player_hit':
        if (msg.hit) this.handlers.onPlayerHit?.(msg.hit as PlayerHitPayload);
        break;
      case 'stage_phase':
        if (typeof msg.phase === 'string') {
          this.handlers.onStagePhase?.(msg.phase, msg.payload);
        }
        break;
      case 'projectile_spawn':
        if (typeof msg.userId === 'number' && msg.proj) {
          this.handlers.onProjectileSpawn?.(msg.userId, msg.proj as ProjectileSpawnPayload);
        }
        break;
    }
  }
}
