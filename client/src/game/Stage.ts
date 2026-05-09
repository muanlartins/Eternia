import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Shape, StageData } from '../data/stage-data.js';
import { MOB_SPECS } from '../data/stages.js';
import { Mob } from './Mob.js';
import { Projectile } from './Projectile.js';
import type { AABB } from './types.js';

export class Stage {
  readonly spec: StageData;
  private readonly worldStage: Container;
  private readonly isLastStage: boolean;
  private readonly hpMul: number;
  private readonly dmgMul: number;
  private mobs: Mob[] = [];
  private solidBoxes: AABB[] = [];
  private onewayBoxes: AABB[] = [];
  private platformGfx: Graphics[] = [];
  private platformSprites: Sprite[] = [];
  private groundSprite: Sprite | null = null;
  private projectiles: Projectile[] = [];
  private recentlySpawned: Projectile[] = [];
  private portal: Graphics | null = null;
  private portalShape: Shape | null = null;
  private portalTimeMs = 0;
  private debugOverlay: Graphics | null = null;

  private readonly remoteControlled: boolean;

  constructor(
    spec: StageData,
    worldStage: Container,
    opts: {
      isLastStage?: boolean;
      hpMul?: number;
      dmgMul?: number;
      remoteControlled?: boolean;
    } = {},
  ) {
    this.spec = spec;
    this.worldStage = worldStage;
    this.isLastStage = opts.isLastStage ?? false;
    this.hpMul = opts.hpMul ?? 1;
    this.dmgMul = opts.dmgMul ?? 1;
    this.remoteControlled = opts.remoteControlled ?? false;
  }

  spawn() {
    if (this.spec.ground) {
      void this.loadGround(this.spec.ground.image, this.spec.ground.y, this.spec.ground.h);
    }

    for (const s of this.spec.shapes) {
      if (s.kind === 'solid') {
        this.solidBoxes.push({ x: s.x, y: s.y, w: s.w, h: s.h });
      } else if (s.kind === 'oneway') {
        this.onewayBoxes.push({ x: s.x, y: s.y, w: s.w, h: s.h });
      } else if (s.kind === 'trigger' && s.id === 'portal') {
        this.portalShape = s;
      }

      if (s.image && (s.kind === 'solid' || s.kind === 'oneway')) {
        void this.loadShapeSprite(s);
      } else if (!s.image && s.kind === 'oneway') {
        const gfx = new Graphics();
        gfx.rect(s.x, s.y, s.w, s.h)
          .fill({ color: 0x4b5563, alpha: 0.95 })
          .stroke({ color: 0x9ca3af, width: 1, alpha: 0.7 });
        this.worldStage.addChild(gfx);
        this.platformGfx.push(gfx);
      }
    }

    for (const sp of this.spec.spawns) {
      const spec = MOB_SPECS[sp.type];
      const defaultY =
        spec.hasGravity === false && spec.hoverY !== undefined
          ? spec.hoverY
          : findGroundUnder(sp.x, this.spec.shapes) - spec.height;
      const y = sp.y ?? defaultY;
      const mob = new Mob(spec, sp.x, y, {
        autoRespawn: false,
        hpMul: this.hpMul,
        dmgMul: this.dmgMul,
        remoteControlled: this.remoteControlled,
      });
      this.mobs.push(mob);
      this.worldStage.addChild(mob.view);
    }

    this.portal = new Graphics();
    this.portal.visible = false;
    this.worldStage.addChild(this.portal);

    if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')) {
      this.debugOverlay = new Graphics();
      this.worldStage.addChild(this.debugOverlay);
      this.drawDebugOverlay();
    }
  }

  private async loadGround(url: string, y: number, h: number): Promise<void> {
    try {
      const tex = (await Assets.load(url)) as Texture;
      const sprite = new Sprite(tex);
      sprite.x = 0;
      sprite.y = y;
      sprite.width = this.spec.width;
      sprite.height = h;
      this.worldStage.addChildAt(sprite, 0);
      this.groundSprite = sprite;
    } catch (err) {
      console.warn(`[Stage] failed to load ground ${url}:`, err);
    }
  }

  private async loadShapeSprite(s: Shape): Promise<void> {
    if (!s.image) return;
    try {
      const tex = (await Assets.load(s.image)) as Texture;
      const sprite = new Sprite(tex);
      sprite.x = s.x;
      sprite.y = s.y;
      sprite.width = s.w;
      sprite.height = s.h;
      this.worldStage.addChildAt(sprite, this.groundSprite ? 1 : 0);
      this.platformSprites.push(sprite);
    } catch (err) {
      console.warn(`[Stage] failed to load shape sprite ${s.image}:`, err);
    }
  }

  private drawDebugOverlay(): void {
    if (!this.debugOverlay) return;
    this.debugOverlay.clear();
    for (const s of this.spec.shapes) {
      const color = s.kind === 'solid' ? 0x22c55e : s.kind === 'oneway' ? 0xfacc15 : 0x3b82f6;
      this.debugOverlay
        .rect(s.x, s.y, s.w, s.h)
        .fill({ color, alpha: 0.18 })
        .stroke({ color, width: 2, alpha: 0.85 });
    }
  }

  update(dtMs: number, playerCenterX: number) {
    for (const m of this.mobs) {
      m.update(dtMs, playerCenterX, this.onewayBoxes);
      const newProjectiles = m.flushPendingProjectiles();
      for (const p of newProjectiles) {
        this.projectiles.push(p);
        this.worldStage.addChild(p.view);
        this.recentlySpawned.push(p);
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

    if (this.portal && this.portalShape && this.isCleared() && !this.isLastStage) {
      this.portal.visible = true;
      this.portalTimeMs += dtMs;
      this.portal.clear();
      const cx = this.portalShape.x + this.portalShape.w / 2;
      const cy = this.portalShape.y + this.portalShape.h - 4;
      const t = this.portalTimeMs / 1000;
      const pulse = 0.7 + 0.25 * Math.sin(t * 4);
      const rx = 44;
      const ry = 12;
      this.portal
        .ellipse(cx, cy, rx + 10, ry + 4)
        .fill({ color: 0xfff066, alpha: 0.16 * pulse });
      this.portal
        .ellipse(cx, cy, rx, ry)
        .fill({ color: 0xffd700, alpha: 0.65 * pulse })
        .stroke({ color: 0xffffff, width: 2, alpha: 0.95 });
      this.portal
        .ellipse(cx, cy, rx - 14, ry - 4)
        .fill({ color: 0xffffff, alpha: 0.5 * pulse });
      const arrowAlpha = 0.5 + 0.4 * Math.sin(t * 5);
      this.portal
        .moveTo(cx - 6, cy - 28)
        .lineTo(cx + 6, cy - 28)
        .lineTo(cx, cy - 18)
        .fill({ color: 0xffffff, alpha: arrowAlpha });
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

  addPlayerProjectiles(projs: readonly Projectile[]) {
    for (const p of projs) {
      this.projectiles.push(p);
      this.worldStage.addChild(p.view);
      if (!p.isGhost) this.recentlySpawned.push(p);
    }
  }

  addRemoteProjectile(p: Projectile) {
    this.projectiles.push(p);
    this.worldStage.addChild(p.view);
  }

  consumeRecentlySpawned(): Projectile[] {
    const out = this.recentlySpawned;
    this.recentlySpawned = [];
    return out;
  }

  getOnewayBoxes(): readonly AABB[] {
    return this.onewayBoxes;
  }

  getSolidBoxes(): readonly AABB[] {
    return this.solidBoxes;
  }

  isCleared(): boolean {
    return this.mobs.every((m) => !m.alive);
  }

  hasBoss(): boolean {
    return this.mobs.some((m) => m.isBoss());
  }

  getBoss(): Mob | null {
    return this.mobs.find((m) => m.isBoss() && m.alive) ?? null;
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
    if (!this.isCleared() || !this.portal || !this.portalShape || this.isLastStage) return null;
    return {
      x: this.portalShape.x,
      y: this.portalShape.y,
      w: this.portalShape.w,
      h: this.portalShape.h,
    };
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
    for (const s of this.platformSprites) {
      this.worldStage.removeChild(s);
      s.destroy();
    }
    this.platformSprites = [];
    if (this.groundSprite) {
      this.worldStage.removeChild(this.groundSprite);
      this.groundSprite.destroy();
      this.groundSprite = null;
    }
    this.solidBoxes = [];
    this.onewayBoxes = [];
    if (this.portal) {
      this.worldStage.removeChild(this.portal);
      this.portal.destroy();
      this.portal = null;
    }
    this.portalShape = null;
    if (this.debugOverlay) {
      this.worldStage.removeChild(this.debugOverlay);
      this.debugOverlay.destroy();
      this.debugOverlay = null;
    }
    this.portalTimeMs = 0;
  }
}

function findGroundUnder(x: number, shapes: readonly Shape[]): number {
  let bestY = 480;
  for (const s of shapes) {
    if (s.kind !== 'solid' && s.kind !== 'oneway') continue;
    if (x < s.x || x > s.x + s.w) continue;
    if (s.y < bestY && s.y >= 0) bestY = s.y;
  }
  return bestY;
}
