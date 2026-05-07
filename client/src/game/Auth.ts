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
  } catch {
    /* ignore */
  }
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
    if (!this.state) {
      console.warn('[auth] saveRun skipped: not authenticated (playing as guest)');
      return;
    }
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        console.warn('[auth] saveRun got 401 — token invalid; logging out');
        this.logout();
        return;
      }
      if (!res.ok) {
        console.warn(`[auth] saveRun failed: HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { records: ServerRecords };
      this.serverRecords = data.records;
      console.log('[auth] run saved', data.records);
    } catch (e) {
      console.warn('[auth] saveRun network error', e);
    }
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
    } catch {
      /* ignore */
    }
  }
}
