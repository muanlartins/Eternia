import type { ProceduralAnimSpec } from './procedural-anims.js';

const seedFiles = import.meta.glob<{ default: ProceduralAnimSpec }>(
  '../data/anim/naia/*.json',
  { eager: true },
);

const LS_PREFIX = 'eternia.anim.naia.';
const LS_INDEX = 'eternia.anim.naia.__index';
const SAVE_ENDPOINT = '/__dev/save-anim';
const DELETE_ENDPOINT = '/__dev/delete-anim';
const NAME_RE = /^[a-z0-9_-]+$/i;

export type AnimSaveStatus = 'disk' | 'local' | 'failed';

export interface AnimSaveResult {
  status: AnimSaveStatus;
  message: string;
}

export class AnimStore {
  private map = new Map<string, ProceduralAnimSpec>();

  constructor() {
    for (const [path, mod] of Object.entries(seedFiles)) {
      const name = nameFromPath(path);
      if (name && mod.default) {
        this.map.set(name, normalize(mod.default, name));
      }
    }
    for (const localName of this.readLocalIndex()) {
      const raw = localStorage.getItem(LS_PREFIX + localName);
      if (!raw) continue;
      try {
        const spec = JSON.parse(raw) as ProceduralAnimSpec;
        if (!this.map.has(localName)) {
          this.map.set(localName, normalize(spec, localName));
        }
      } catch {
        /* ignore corrupted entry */
      }
    }
  }

  list(): ProceduralAnimSpec[] {
    return Array.from(this.map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  get(name: string): ProceduralAnimSpec | null {
    return this.map.get(name) ?? null;
  }

  has(name: string): boolean {
    return this.map.has(name);
  }

  validateName(name: string): string | null {
    if (!NAME_RE.test(name)) return 'use letras, numeros, hyphen ou underscore';
    if (name.length > 40) return 'no maximo 40 caracteres';
    return null;
  }

  createBlank(name: string): ProceduralAnimSpec | null {
    if (this.validateName(name) !== null) return null;
    if (this.map.has(name)) return null;
    const spec: ProceduralAnimSpec = {
      name,
      duration: 1,
      loop: true,
      poses: [],
    };
    this.map.set(name, spec);
    this.writeLocal(name, spec);
    return spec;
  }

  rename(oldName: string, newName: string): ProceduralAnimSpec | null {
    if (!this.map.has(oldName)) return null;
    if (this.validateName(newName) !== null) return null;
    if (oldName === newName) return this.map.get(oldName) ?? null;
    if (this.map.has(newName)) return null;
    const spec = this.map.get(oldName)!;
    const renamed = { ...spec, name: newName };
    this.map.delete(oldName);
    this.map.set(newName, renamed);
    this.removeLocal(oldName);
    this.writeLocal(newName, renamed);
    return renamed;
  }

  upsertLocal(spec: ProceduralAnimSpec): void {
    this.map.set(spec.name, spec);
    this.writeLocal(spec.name, spec);
  }

  async saveToDisk(spec: ProceduralAnimSpec): Promise<AnimSaveResult> {
    this.upsertLocal(spec);
    try {
      const res = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec, null, 2),
      });
      if (res.ok) {
        return { status: 'disk', message: 'salvo em disco' };
      }
      const text = await res.text().catch(() => `${res.status}`);
      return {
        status: 'local',
        message: `disk save falhou (${text}) — backup local OK`,
      };
    } catch (err) {
      return {
        status: 'local',
        message: `disk offline (${(err as Error).message}) — backup local OK`,
      };
    }
  }

  async deleteAnim(name: string): Promise<AnimSaveResult> {
    this.map.delete(name);
    this.removeLocal(name);
    try {
      const res = await fetch(`${DELETE_ENDPOINT}?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 404) {
        return { status: 'disk', message: `deletado: ${name}` };
      }
      return {
        status: 'local',
        message: `disk delete falhou (${res.status}) — local OK`,
      };
    } catch (err) {
      return {
        status: 'local',
        message: `disk offline (${(err as Error).message}) — local OK`,
      };
    }
  }

  private writeLocal(name: string, spec: ProceduralAnimSpec): void {
    try {
      localStorage.setItem(LS_PREFIX + name, JSON.stringify(spec));
      const idx = new Set(this.readLocalIndex());
      idx.add(name);
      localStorage.setItem(LS_INDEX, JSON.stringify(Array.from(idx)));
    } catch {
      /* localStorage full or unavailable — caller stays in-memory */
    }
  }

  private removeLocal(name: string): void {
    try {
      localStorage.removeItem(LS_PREFIX + name);
      const idx = this.readLocalIndex().filter((n) => n !== name);
      localStorage.setItem(LS_INDEX, JSON.stringify(idx));
    } catch {
      /* ignore */
    }
  }

  private readLocalIndex(): string[] {
    try {
      const raw = localStorage.getItem(LS_INDEX);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }
}

function nameFromPath(p: string): string | null {
  const m = p.match(/([^/]+)\.json$/);
  return m ? m[1]! : null;
}

function normalize(spec: ProceduralAnimSpec, fallbackName: string): ProceduralAnimSpec {
  const out: ProceduralAnimSpec = {
    name: spec.name || fallbackName,
    duration: typeof spec.duration === 'number' && spec.duration > 0 ? spec.duration : 1,
    loop: spec.loop ?? true,
    poses: Array.isArray(spec.poses) ? spec.poses : [],
  };
  if (Array.isArray(spec.markers)) out.markers = spec.markers;
  return out;
}
