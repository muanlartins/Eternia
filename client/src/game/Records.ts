const RECORD_KEY = 'eternia.records.v1';

export interface PersonalRecords {
  bestTimeMs: number | null;
  bestDamageDealt: number;
  fewestDeathsInVictory: number | null;
  totalVictories: number;
  totalAttempts: number;
}

export interface NewRecordFlags {
  newBestTime: boolean;
  newBestDamage: boolean;
  newFewestDeaths: boolean;
}

export function makeFreshRecords(): PersonalRecords {
  return {
    bestTimeMs: null,
    bestDamageDealt: 0,
    fewestDeathsInVictory: null,
    totalVictories: 0,
    totalAttempts: 0,
  };
}

export function loadRecords(): PersonalRecords {
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    if (!raw) return makeFreshRecords();
    const parsed = JSON.parse(raw) as Partial<PersonalRecords>;
    return {
      bestTimeMs: typeof parsed.bestTimeMs === 'number' ? parsed.bestTimeMs : null,
      bestDamageDealt: typeof parsed.bestDamageDealt === 'number' ? parsed.bestDamageDealt : 0,
      fewestDeathsInVictory:
        typeof parsed.fewestDeathsInVictory === 'number' ? parsed.fewestDeathsInVictory : null,
      totalVictories: typeof parsed.totalVictories === 'number' ? parsed.totalVictories : 0,
      totalAttempts: typeof parsed.totalAttempts === 'number' ? parsed.totalAttempts : 0,
    };
  } catch {
    return makeFreshRecords();
  }
}

export function saveRecords(r: PersonalRecords): void {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(r));
  } catch {}
}

export function applyVictoryToRecords(
  current: PersonalRecords,
  durationMs: number,
  damageDealt: number,
  deaths: number,
): { records: PersonalRecords; flags: NewRecordFlags } {
  const newBestTime = current.bestTimeMs === null || durationMs < current.bestTimeMs;
  const newBestDamage = damageDealt > current.bestDamageDealt;
  const newFewestDeaths =
    current.fewestDeathsInVictory === null || deaths < current.fewestDeathsInVictory;

  return {
    records: {
      bestTimeMs: newBestTime ? durationMs : current.bestTimeMs,
      bestDamageDealt: newBestDamage ? damageDealt : current.bestDamageDealt,
      fewestDeathsInVictory: newFewestDeaths ? deaths : current.fewestDeathsInVictory,
      totalVictories: current.totalVictories + 1,
      totalAttempts: current.totalAttempts + 1,
    },
    flags: { newBestTime, newBestDamage, newFewestDeaths },
  };
}

export function applyGameOverToRecords(current: PersonalRecords): PersonalRecords {
  return {
    ...current,
    totalAttempts: current.totalAttempts + 1,
  };
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
