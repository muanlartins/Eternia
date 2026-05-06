import { Container, Graphics } from 'pixi.js';
import { MOB_SPECS, type StageSpec } from '../data/stages.js';
import { Mob } from './Mob.js';
import { Projectile } from './Projectile.js';
import type { AABB } from './types.js';

const GROUND_Y = 480;
const PORTAL_W = 56;
const PORTAL_H = 90;

export class Stage {
  readonly spec: StageSpec;
  private readonly worldStage: Container;
  private mobs: Mob[] = [];
  private platformGfx: Graphics[] = [];
  private platformBoxes: AABB[] = [];
  private projectiles: Projectile[] = [];
  private wallLeft: Graphics | null = null;
  private wallRight: Graphics | null = null;
  private portal: Graphics | null = null;
  private portalTimeMs = 0;

  constructor(spec: StageSpec, worldStage: Container) {
    this.spec = spec;
    this.worldStage = worldStage;
  }

  spawn() {
    const wallH = 600;
    const wallW = 24;
    this.wallLeft = new Graphics();
    this.wallLeft
      .rect(-wallW, GROUND_Y - wallH, wallW, wallH + 200)
      .fill({ color: 0x2a3340, alpha: 0.95 })
      .stroke({ color: 0x5a6678, width: 2, alpha: 0.7 });
    this.worldStage.addChild(this.wallLeft);

    this.wallRight = new Graphics();
    this.wallRight
      .rect(this.spec.width, GROUND_Y - wallH, wallW, wallH + 200)
      .fill({ color: 0x2a3340, alpha: 0.95 })
      .stroke({ color: 0x5a6678, width: 2, alpha: 0.7 });
    this.worldStage.addChild(this.wallRight);

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

    this.portal = new Graphics();
    this.portal.visible = false;
    this.worldStage.addChild(this.portal);
  }

  update(dtMs: number, playerCenterX: number) {
    for (const m of this.mobs) {
      m.update(dtMs, playerCenterX);
      const newProjectiles = m.flushPendingProjectiles();
      for (const p of newProjectiles) {
        this.projectiles.push(p);
        this.worldStage.addChild(p.view);
      }
    }
    for (const p of this.projectiles) p.update(dtMs);
    this.projectiles = this.projectiles.filter((p) => {
      if (!p.alive) {
        p.destroy();
        return false;
      }
      return true;
    });

    if (this.portal && this.isCleared() && !this.hasBoss()) {
      this.portal.visible = true;
      this.portalTimeMs += dtMs;
      this.portal.clear();
      const px = this.spec.width - PORTAL_W - 16;
      const py = GROUND_Y - PORTAL_H;
      const t = this.portalTimeMs / 1000;
      const pulse = 0.7 + 0.25 * Math.sin(t * 4);
      this.portal
        .ellipse(px + PORTAL_W / 2, py + PORTAL_H / 2, PORTAL_W / 2 + 4, PORTAL_H / 2 + 4)
        .fill({ color: 0xfff066, alpha: 0.18 * pulse });
      this.portal
        .ellipse(px + PORTAL_W / 2, py + PORTAL_H / 2, PORTAL_W / 2, PORTAL_H / 2)
        .fill({ color: 0xffd700, alpha: 0.6 * pulse })
        .stroke({ color: 0xffffff, width: 2, alpha: 0.95 });
      this.portal
        .ellipse(px + PORTAL_W / 2, py + PORTAL_H / 2, PORTAL_W / 2 - 8, PORTAL_H / 2 - 12)
        .fill({ color: 0xffffff, alpha: 0.4 * pulse });
    } else if (this.portal) {
      this.portal.visible = false;
    }
  }

  getMobs(): readonly Mob[] {
    return this.mobs;
  }

  getProjectiles(): readonly Projectile[] {
    return this.projectiles;
  }

  getPlatforms(): readonly AABB[] {
    return this.platformBoxes;
  }

  isCleared(): boolean {
    return this.mobs.every((m) => !m.alive);
  }

  hasBoss(): boolean {
    return this.mobs.some((m) => m.isBoss());
  }

  bossKilled(): boolean {
    return this.hasBoss() && this.mobs.every((m) => !m.isBoss() || !m.alive);
  }

  killNonBossMobs() {
    for (const m of this.mobs) {
      if (m.alive && !m.isBoss()) {
        m.instakill();
      }
    }
  }

  getPortalBox(): AABB | null {
    if (!this.isCleared() || !this.portal || this.hasBoss()) return null;
    const px = this.spec.width - PORTAL_W - 16;
    const py = GROUND_Y - PORTAL_H;
    return { x: px, y: py, w: PORTAL_W, h: PORTAL_H };
  }

  destroy() {
    for (const m of this.mobs) {
      this.worldStage.removeChild(m.view);
      m.view.destroy({ children: true });
    }
    this.mobs = [];
    for (const p of this.projectiles) {
      p.destroy();
    }
    this.projectiles = [];
    for (const g of this.platformGfx) {
      this.worldStage.removeChild(g);
      g.destroy();
    }
    this.platformGfx = [];
    this.platformBoxes = [];
    if (this.wallLeft) {
      this.worldStage.removeChild(this.wallLeft);
      this.wallLeft.destroy();
      this.wallLeft = null;
    }
    if (this.wallRight) {
      this.worldStage.removeChild(this.wallRight);
      this.wallRight.destroy();
      this.wallRight = null;
    }
    if (this.portal) {
      this.worldStage.removeChild(this.portal);
      this.portal.destroy();
      this.portal = null;
    }
    this.portalTimeMs = 0;
  }
}
