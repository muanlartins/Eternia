// Phase 8.C: WS layer for room presence + position broadcast.
//
// The same WS connection used for the Phase-0 hello is now repurposed
// for multiplayer presence. Once joined to a room, the client streams
// its player state at ~10 Hz; the server fans the message out to
// everyone else in the same room. Mob/world state is NOT shared yet.

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

export interface NetworkHandlers {
  onHello?: (v: string) => void;
  onRoster?: (others: readonly RemoteRosterEntry[]) => void;
  onRemoteJoin?: (entry: RemoteRosterEntry) => void;
  onRemoteLeave?: (userId: number) => void;
  onRemoteState?: (
    entry: RemoteRosterEntry,
    state: RemoteStatePayload,
  ) => void;
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

  private send(payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (e) {
      console.warn('[net] send failed', e);
    }
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
      // If we were in a room before reconnecting, rejoin it.
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
    }
  }
}
