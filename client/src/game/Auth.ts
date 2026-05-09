const STORAGE_KEY = 'eternia.auth.v1';

export interface ServerRecords {
  bestTimeMs: number | null;
  bestDamageDealt: number;
  fewestDeathsInVictory: number | null;
  totalVictories: number;
  totalAttempts: number;
}

export type LeaderboardMetric = 'time' | 'damage' | 'deaths';

export interface LeaderboardEntry {
  username: string;
  durationMs: number;
  damageDealt: number;
  deaths: number;
  victory: boolean;
  completedAt: number;
}

export interface Room {
  id: number;
  code: string;
  hostUserId: number;
  mission: string;
  difficulty: string;
  mode: 'solo' | 'multiplayer';
  members: number[];
  status: string;
  createdAt: number;
  updatedAt: number;
}

export async function fetchLeaderboard(
  metric: LeaderboardMetric,
  limit = 10,
): Promise<readonly LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard?metric=${metric}&limit=${limit}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: LeaderboardEntry[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

interface AuthState {
  token: string;
  userId: number;
  username: string;
}

interface RunPayload {
  durationMs: number;
  damageDealt: number;
  deaths: number;
  victory: boolean;
}

function loadState(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AuthState>;
    if (
      typeof p.token === 'string' &&
      typeof p.userId === 'number' &&
      typeof p.username === 'string'
    ) {
      return { token: p.token, userId: p.userId, username: p.username };
    }
    return null;
  } catch {
    return null;
  }
}

function saveState(s: AuthState | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export class Auth {
  private state: AuthState | null;
  private serverRecords: ServerRecords | null = null;

  constructor() {
    this.state = loadState();
  }

  isAuthenticated(): boolean {
    return this.state !== null;
  }

  getUsername(): string | null {
    return this.state?.username ?? null;
  }

  getUserId(): number | null {
    return this.state?.userId ?? null;
  }

  getServerRecords(): ServerRecords | null {
    return this.serverRecords;
  }

  async login(username: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error ?? `http ${res.status}` };
      }
      const data = (await res.json()) as {
        token: string;
        userId: number;
        username: string;
        records: ServerRecords;
      };
      this.state = { token: data.token, userId: data.userId, username: data.username };
      this.serverRecords = data.records;
      saveState(this.state);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'network error' };
    }
  }

  logout() {
    this.state = null;
    this.serverRecords = null;
    saveState(null);
  }

  async saveRun(payload: RunPayload): Promise<void> {
    if (!this.state) return;
    const safe = {
      durationMs: Math.round(payload.durationMs),
      damageDealt: Math.round(payload.damageDealt),
      deaths: Math.round(payload.deaths),
      victory: payload.victory,
    };
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify(safe),
      });
      if (res.status === 401) {
        this.logout();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { records: ServerRecords };
      this.serverRecords = data.records;
    } catch {}
  }

  private authHeader(): Record<string, string> | null {
    if (!this.state) return null;
    return { Authorization: `Bearer ${this.state.token}` };
  }

  async createRoom(
    mission: string,
    difficulty: string,
    mode: 'solo' | 'multiplayer' = 'solo',
  ): Promise<Room | null> {
    const auth = this.authHeader();
    if (!auth) return null;
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ mission, difficulty, mode }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { room: Room };
      return data.room;
    } catch {
      return null;
    }
  }

  async listRooms(): Promise<Room[]> {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) return [];
      const data = (await res.json()) as { rooms: Room[] } | Room[];
      return Array.isArray(data) ? data : (data.rooms ?? []);
    } catch {
      return [];
    }
  }

  async roomByCode(code: string): Promise<Room | null> {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code.toUpperCase())}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { room: Room };
      return data.room;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.state?.token ?? null;
  }

  async joinRoom(code: string): Promise<Room | null> {
    const auth = this.authHeader();
    if (!auth) return null;
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code.toUpperCase())}/join`, {
        method: 'POST',
        headers: auth,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { room: Room };
      return data.room;
    } catch {
      return null;
    }
  }

  async leaveRoom(code: string): Promise<void> {
    const auth = this.authHeader();
    if (!auth) return;
    try {
      await fetch(`/api/rooms/${encodeURIComponent(code.toUpperCase())}/leave`, {
        method: 'POST',
        headers: auth,
      });
    } catch {}
  }

  async refreshRecords(): Promise<void> {
    if (!this.state) return;
    try {
      const res = await fetch('/api/runs/me', {
        headers: { Authorization: `Bearer ${this.state.token}` },
      });
      if (res.status === 401) {
        this.logout();
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { records: ServerRecords };
      this.serverRecords = data.records;
    } catch {}
  }
}
