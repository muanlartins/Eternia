import { Container, Graphics } from 'pixi.js';
import { MOB_SPECS, type StageSpec } from '../data/stages.js';
import { Mob } from './Mob.js';
import type { AABB } from './types.js';

const GROUND_Y = 480;

export class Stage {
  readonly spec: StageSpec;
  private readonly worldStage: Container;
  private mobs: Mob[] = [];
  private platformGfx: Graphics[] = [];
  private platformBoxes: AABB[] = [];

  constructor(spec: StageSpec, worldStage: Container) {
    this.spec = spec;
    this.worldStage = worldStage;
  }

  spawn() {
    for (const p of this.spec.platforms ?? []) {
      const g = new Graphics();
      g.rect(p.x, p.y, p.w, p.h)
        .fill({ color: 0x4b5563, alpha: 0.95 })
        .stroke({ color: 0x9ca3af, width: 1, alpha: 0.7 });
      this.worldStage.addChild(g);
      this.platformGfx.push(g);
      this.platformBoxes.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    }

    for (const s of this.spec.spawns) {
      const spec = MOB_SPECS[s.type];
      const mob = new Mob(spec, s.x, GROUND_Y - spec.height, { autoRespawn: false });
      this.mobs.push(mob);
      this.worldStage.addChild(mob.view);
    }
  }

  update(dtMs: number, playerCenterX: number) {
    for (const m of this.mobs) m.update(dtMs, playerCenterX);
  }

  getMobs(): readonly Mob[] {
    return this.mobs;
  }

  getPlatforms(): readonly AABB[] {
    return this.platformBoxes;
  }

  isCleared(): boolean {
    return this.mobs.every((m) => !m.alive);
  }

  destroy() {
    for (const m of this.mobs) {
      this.worldStage.removeChild(m.view);
      m.view.destroy({ children: true });
    }
    this.mobs = [];
    for (const g of this.platformGfx) {
      this.worldStage.removeChild(g);
      g.destroy();
    }
    this.platformGfx = [];
    this.platformBoxes = [];
  }
}
