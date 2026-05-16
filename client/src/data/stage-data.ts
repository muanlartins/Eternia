import type { MobType } from './stages.js';
import { STAGES } from './stages.js';

export type ShapeKind = 'solid' | 'oneway' | 'trigger' | 'slope';

export interface Shape {
  readonly kind: ShapeKind;
  readonly id?: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly image?: string;
  readonly dir?: 'left' | 'right';
}

export interface SpawnEntry {
  readonly type: MobType;
  readonly x: number;
  readonly y?: number;
}

export interface GroundSpec {
  readonly image: string;
  readonly y: number;
  readonly h: number;
}

export interface StageData {
  readonly id: string;
  readonly name: string;
  readonly biome: 'forest' | 'swamp';
  readonly width: number;
  readonly height: number;
  readonly playerStart: { readonly x: number; readonly y: number };
  readonly ground?: GroundSpec;
  readonly loadingImage?: string;
  readonly shapes: readonly Shape[];
  readonly spawns: readonly SpawnEntry[];
}

const STAGE_JSON_GLOB = import.meta.glob('./stages/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, StageData>;

const STAGE_JSON_BY_ID: Record<string, StageData> = (() => {
  const out: Record<string, StageData> = {};
  for (const [path, data] of Object.entries(STAGE_JSON_GLOB)) {
    const match = path.match(/([^/]+)\.json$/);
    if (match) out[match[1]!] = data;
  }
  return out;
})();

const DEFAULT_GROUND_Y = 480;
const DEFAULT_HEIGHT = 720;
const PORTAL_WIDTH = 88;
const PORTAL_HEIGHT = 80;

function biomeFor(id: string): 'forest' | 'swamp' {
  return id.startsWith('swamp') ? 'swamp' : 'forest';
}

function isLastInMission(id: string): boolean {
  return id === 'forest-1-4' || id === 'swamp-1-2';
}

function legacyToStageData(id: string): StageData | null {
  const legacy = STAGES.find((s) => s.id === id);
  if (!legacy) return null;

  const shapes: Shape[] = [
    { kind: 'solid', x: -24, y: 0, w: 24, h: DEFAULT_HEIGHT },
    { kind: 'solid', x: legacy.width, y: 0, w: 24, h: DEFAULT_HEIGHT },
    { kind: 'solid', x: 0, y: DEFAULT_GROUND_Y, w: legacy.width, h: DEFAULT_HEIGHT - DEFAULT_GROUND_Y },
  ];

  for (const p of legacy.platforms ?? []) {
    shapes.push({ kind: 'oneway', x: p.x, y: p.y, w: p.w, h: p.h });
  }

  if (!isLastInMission(id)) {
    shapes.push({
      kind: 'trigger',
      id: 'portal',
      x: legacy.width - 100 - PORTAL_WIDTH / 2,
      y: DEFAULT_GROUND_Y - PORTAL_HEIGHT,
      w: PORTAL_WIDTH,
      h: PORTAL_HEIGHT,
    });
  }

  return {
    id: legacy.id,
    name: legacy.name,
    biome: biomeFor(legacy.id),
    width: legacy.width,
    height: DEFAULT_HEIGHT,
    playerStart: { x: 80, y: DEFAULT_GROUND_Y - 64 },
    shapes,
    spawns: legacy.spawns,
  };
}

export function getStageData(id: string): StageData | null {
  const fromJson = STAGE_JSON_BY_ID[id];
  if (fromJson) return fromJson;
  return legacyToStageData(id);
}
