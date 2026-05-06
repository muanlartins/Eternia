import type { Container } from 'pixi.js';
import { MOB_SPECS, type StageSpec } from '../data/stages.js';
import { Mob } from './Mob.js';

const GROUND_Y = 480;

export class Stage {
  readonly spec: StageSpec;
  private readonly worldStage: Container;
  private mobs: Mob[] = [];

  constructor(spec: StageSpec, worldStage: Container) {
    this.spec = spec;
    this.worldStage = worldStage;
  }

  spawn() {
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

  isCleared(): boolean {
    return this.mobs.every((m) => !m.alive);
  }

  destroy() {
    for (const m of this.mobs) {
      this.worldStage.removeChild(m.view);
      m.view.destroy({ children: true });
    }
    this.mobs = [];
  }
}
