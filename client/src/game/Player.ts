import { Container, Graphics } from 'pixi.js';
import type { CharacterSpec } from '../data/naia.js';
import type { BuffSpec, PlayerModifiers } from '../data/buffs.js';
import { DEFAULT_MODIFIERS } from '../data/buffs.js';
import type { RunModifier } from '../data/modifiers.js';
import type { Input } from './Input.js';
import { Projectile } from './Projectile.js';
import { PlayerState, STATE_COLOR, type AABB, type ActiveHit, type Facing, type SlopeBox } from './types.js';

const DEFAULT_GROUND_Y = 480;

interface HitPhase {
  readonly active: readonly [number, number];
  readonly damage: number;
  readonly knockback: number;
  readonly hitbox: {
    readonly cx: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

const SKILL_KEYS = ['skill1', 'skill2', 'skill3'] as const;

interface PendingArrowDrop {
  remainingMs: number;
  spawnX: number;
  spawnY: number;
  count: number;
  pattern: 'vertical-rain' | 'horizontal-rain';
  damage: number;
  knockback: number;
  facing: -1 | 1;
}

interface PendingPlayerArrow {
  remainingMs: number;
  damage: number;
  knockback: number;
  facing: -1 | 1;
  vyBias?: number;
  gravityMul?: number;
  lifetimeMs?: number;
  spawnYOffset?: number;
}

export class Player {
  x = 0;
  y = DEFAULT_GROUND_Y - 64;
  vx = 0;
  vy = 0;
  worldFloorY = DEFAULT_GROUND_Y;
  spawnX = 80;
  spawnY = DEFAULT_GROUND_Y - 64;

  facing: Facing = 1;
  state: PlayerState = PlayerState.Idle;
  stateTimeMs = 0;

  mp: number;
  hp: number;
  dodgeBar: number;

  onGround = true;
  private jumpsUsed = 0;
  private airDashUsed = false;

  private coyoteMs = 0;
  private jumpBufferMs = 0;

  private dirHoldMs = 0;
  private holdDir: -1 | 0 | 1 = 0;

  private dashCooldownMs = 0;
  private dashDir: -1 | 1 = 1;

  private airDashBufferedDir: -1 | 0 | 1 = 0;
  private airDashBufferedMs = 0;

  private skillBufferIdx = -1;
  private skillBufferMs = 0;

  skillCooldowns: [number, number, number] = [0, 0, 0];

  chargingActive = false;
  chargingMs = 0;
  private attackHeldMs = 0;
  private dropThroughMs = 0;

  private currentAttackId = 0;
  private lastActiveHitIdx = -1;
  private activeHit: ActiveHit | null = null;

  private airAtkUsed = false;
  private respawnTimerMs = 0;
  private parryCooldownMs = 0;
  parryBuffMs = 0;
  private counterHurtMs = 0;
  spawnInvincibleMs = 0;

  modifiers: PlayerModifiers = { ...DEFAULT_MODIFIERS };
  acquiredBuffs: BuffSpec[] = [];
  acquiredModifier: RunModifier | null = null;

  readonly view = new Container();
  private body: Graphics;
  private facingMarker: Graphics;
  private hitboxMarker: Graphics;

  spec: CharacterSpec;
  private pendingArrows: Projectile[] = [];
  private pendingArrowDrops: PendingArrowDrop[] = [];
  private pendingPlayerArrows: PendingPlayerArrow[] = [];

  constructor(spec: CharacterSpec) {
    this.spec = spec;
    this.mp = spec.maxMp;
    this.hp = spec.maxHp;
    this.dodgeBar = spec.dodgeBarMax;
    this.body = new Graphics();
    this.facingMarker = new Graphics();
    this.hitboxMarker = new Graphics();
    this.view.addChild(this.body);
    this.view.addChild(this.facingMarker);
    this.view.addChild(this.hitboxMarker);
    this.redraw();
  }

  switchSpec(newSpec: CharacterSpec) {
    this.spec = newSpec;
    this.maxHpRefresh();
  }

  private maxHpRefresh() {
    this.hp = Math.min(this.hp, this.spec.maxHp);
    this.mp = Math.min(this.mp, this.spec.maxMp);
    this.dodgeBar = Math.min(this.dodgeBar, this.spec.dodgeBarMax);
  }

  flushPendingArrows(): Projectile[] {
    const out = this.pendingArrows;
    this.pendingArrows = [];
    return out;
  }

  private spawnArrowsForState(damage: number, knockback: number) {
    if (this.spec.kind !== 'archer') return;
    if (this.state === PlayerState.JumpAtk) {
      this.spawnArrow(damage, knockback, { angleDeg: 18 });
      return;
    }
    if (this.state === PlayerState.Skill1) {
      // A · Rajada de Flechas — 5 arrows in rapid SEQUENCE (one after another),
      // same direction as basic shot. Direction locked to cast moment.
      const N = 5;
      const intervalMs = 55;
      for (let i = 0; i < N; i++) {
        this.pendingPlayerArrows.push({
          remainingMs: i * intervalMs,
          damage,
          knockback,
          facing: this.facing,
        });
      }
      return;
    }
    if (this.state === PlayerState.Skill2) {
      // S · Flecha-Tempestade — main "charged" arrow flies in upward arc,
      // expires EXACTLY at the rain spawn point. No visual gap.
      const rainDelayMs = 360;
      const apexDx = 200;       // horizontal distance to rain spawn
      const apexDy = -220;      // negative = above player
      const t = rainDelayMs / 1000;
      const g = this.spec.arrowGravity;
      // Solve trajectory: x(t) = vx*t, y(t) = vy*t + 0.5*g*t²
      const requiredVx = (this.facing * apexDx) / t;
      const requiredVy = (apexDy - 0.5 * g * t * t) / t;
      const cx = this.x + this.spec.width / 2 + this.facing * this.spec.arrowSpawnDx;
      const cy = this.y + this.spec.height / 2 + this.spec.arrowSpawnDy;
      const charged = new Projectile(
        cx, cy,
        requiredVx,
        Math.round(damage * 0.4),
        knockback * 0.4,
        this.spec.arrowWidth + 6,
        this.spec.arrowHeight + 4,
        rainDelayMs,
        this.facing,
        undefined,
        {
          vy: requiredVy,
          gravity: g,
          owner: 'player',
          visual: 'arrow',
        },
      );
      this.pendingArrows.push(charged);
      this.pendingArrowDrops.push({
        remainingMs: rainDelayMs,
        spawnX: cx + this.facing * apexDx,
        spawnY: cy + apexDy,
        count: 9,
        pattern: 'vertical-rain',
        damage: Math.round(damage * 0.55),
        knockback: knockback * 0.5,
        facing: this.facing,
      });
      return;
    }
    if (this.state === PlayerState.Skill3) {
      // D · Tríplice Tempestade — 5 tight parallel lines, 8 volleys × 2 arrows.
      // Each volley picks 2 of 5 lines (random). With basic-arrow gravity,
      // all arrows trace identical parabolic arcs offset vertically — visually
      // parallel curves, not flat horizontals. Total: 16 arrows.
      const lineOffsets = [-30, -15, 0, 15, 30];
      const volleys = 8;
      const volleyIntervalMs = 80;
      const linesPerVolley = 2;
      const perArrowDmg = Math.round(damage * 0.22);
      const perArrowKb = knockback * 0.22;
      for (let v = 0; v < volleys; v++) {
        const shuffled = [...lineOffsets].sort(() => Math.random() - 0.5);
        const picks = shuffled.slice(0, linesPerVolley);
        for (const offset of picks) {
          this.pendingPlayerArrows.push({
            remainingMs: v * volleyIntervalMs,
            damage: perArrowDmg,
            knockback: perArrowKb,
            facing: this.facing,
            spawnYOffset: offset,
            vyBias: 0,
            gravityMul: 1,
            lifetimeMs: this.spec.arrowLifetimeMs,
          });
        }
      }
      return;
    }
    this.spawnArrow(damage, knockback);
  }

  private executeArrowDrop(drop: PendingArrowDrop): void {
    if (this.spec.kind !== 'archer') return;
    const aw = this.spec.arrowWidth;
    const ah = this.spec.arrowHeight;
    const baseSpeed = this.spec.arrowSpeed;
    if (drop.pattern === 'vertical-rain') {
      const spread = 90;
      for (let i = 0; i < drop.count; i++) {
        const xOffset = (i - (drop.count - 1) / 2) * (spread / drop.count) * 1.4;
        const cx = drop.spawnX + xOffset + (Math.random() - 0.5) * 18;
        const cy = drop.spawnY + (Math.random() - 0.5) * 22;
        const arrow = new Projectile(
          cx,
          cy,
          (Math.random() - 0.5) * 40,
          drop.damage,
          drop.knockback,
          aw,
          ah,
          1100,
          drop.facing,
          undefined,
          {
            vy: 280,
            gravity: this.spec.arrowGravity * 1.6,
            owner: 'player',
            visual: 'arrow',
          },
        );
        this.pendingArrows.push(arrow);
      }
      return;
    }
    // horizontal-rain: continuing forward, tight vertical spread
    for (let i = 0; i < drop.count; i++) {
      const vyOff = (i - (drop.count - 1) / 2) * 18;
      const arrow = new Projectile(
        drop.spawnX,
        drop.spawnY,
        drop.facing * baseSpeed * 0.85,
        drop.damage,
        drop.knockback,
        aw,
        ah,
        700,
        drop.facing,
        undefined,
        {
          vy: vyOff,
          gravity: this.spec.arrowGravity * 0.85,
          owner: 'player',
          visual: 'arrow',
        },
      );
      this.pendingArrows.push(arrow);
    }
  }

  private spawnArrow(
    damage: number,
    knockback: number,
    opts?: {
      vyBias?: number;
      vxMul?: number;
      angleDeg?: number;
      pierce?: number;
      lifetimeMs?: number;
      facingOverride?: -1 | 1;
      gravityMul?: number;
      spawnYOffset?: number;
    },
  ) {
    if (this.spec.kind !== 'archer') return;
    const facing = opts?.facingOverride ?? this.facing;
    const cx = this.x + this.spec.width / 2 + facing * this.spec.arrowSpawnDx;
    const cy =
      this.y + this.spec.height / 2 + this.spec.arrowSpawnDy + (opts?.spawnYOffset ?? 0);
    const speed = this.spec.arrowSpeed * (opts?.vxMul ?? 1);
    const angleRad = ((opts?.angleDeg ?? 0) * Math.PI) / 180;
    const vx = facing * speed * Math.cos(angleRad);
    const vy = (opts?.vyBias ?? 0) + speed * Math.sin(angleRad);
    const projOpts: import('./Projectile.js').ProjectileOptions = {
      vy,
      gravity: this.spec.arrowGravity * (opts?.gravityMul ?? 1),
      owner: 'player',
      visual: 'arrow',
    };
    if (opts?.pierce !== undefined) projOpts.pierce = opts.pierce;
    const arrow = new Projectile(
      cx,
      cy,
      vx,
      damage,
      knockback,
      this.spec.arrowWidth,
      this.spec.arrowHeight,
      opts?.lifetimeMs ?? this.spec.arrowLifetimeMs,
      facing,
      undefined,
      projOpts,
    );
    this.pendingArrows.push(arrow);
  }

  setRenderingHidden(hidden: boolean) {
    this.body.visible = !hidden;
    this.facingMarker.visible = !hidden;
  }

  update(
    dtMs: number,
    input: Input,
    onewayBoxes: readonly AABB[] = [],
    solidBoxes: readonly AABB[] = [],
    slopeBoxes: readonly SlopeBox[] = [],
  ) {
    this.stateTimeMs += dtMs;
    this.coyoteMs = Math.max(0, this.coyoteMs - dtMs);
    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - dtMs);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - dtMs);
    this.airDashBufferedMs = Math.max(0, this.airDashBufferedMs - dtMs);
    this.parryCooldownMs = Math.max(0, this.parryCooldownMs - dtMs);
    this.parryBuffMs = Math.max(0, this.parryBuffMs - dtMs);
    this.spawnInvincibleMs = Math.max(0, this.spawnInvincibleMs - dtMs);
    this.skillBufferMs = Math.max(0, this.skillBufferMs - dtMs);
    this.dropThroughMs = Math.max(0, this.dropThroughMs - dtMs);

    for (let i = 0; i < this.skillCooldowns.length; i++) {
      this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i]! - dtMs);
    }

    for (let i = this.pendingArrowDrops.length - 1; i >= 0; i--) {
      const d = this.pendingArrowDrops[i]!;
      d.remainingMs -= dtMs;
      if (d.remainingMs <= 0) {
        this.executeArrowDrop(d);
        this.pendingArrowDrops.splice(i, 1);
      }
    }
    for (let i = this.pendingPlayerArrows.length - 1; i >= 0; i--) {
      const a = this.pendingPlayerArrows[i]!;
      a.remainingMs -= dtMs;
      if (a.remainingMs <= 0) {
        const opts: {
          vyBias?: number;
          facingOverride: -1 | 1;
          gravityMul?: number;
          lifetimeMs?: number;
          spawnYOffset?: number;
        } = { facingOverride: a.facing };
        if (a.vyBias !== undefined) opts.vyBias = a.vyBias;
        if (a.gravityMul !== undefined) opts.gravityMul = a.gravityMul;
        if (a.lifetimeMs !== undefined) opts.lifetimeMs = a.lifetimeMs;
        if (a.spawnYOffset !== undefined) opts.spawnYOffset = a.spawnYOffset;
        this.spawnArrow(a.damage, a.knockback, opts);
        this.pendingPlayerArrows.splice(i, 1);
      }
    }

    if (this.onGround && input.justPressed('down') && this.chargingAllowed()) {
      this.dropThroughMs = 200;
    }

    for (let i = 0; i < SKILL_KEYS.length; i++) {
      if (input.justPressed(SKILL_KEYS[i]!)) {
        this.skillBufferIdx = i;
        this.skillBufferMs = this.spec.skillBufferMs;
      }
    }

    if (input.isHeld('attack')) {
      this.attackHeldMs += dtMs;
    } else {
      this.attackHeldMs = 0;
    }

    if (
      input.isHeld('attack') &&
      this.attackHeldMs >= this.spec.chargeMinHoldMs &&
      !this.chargingActive &&
      this.chargingAllowed()
    ) {
      this.chargingActive = true;
      this.chargingMs = 0;
    }

    this.mp = Math.min(
      this.spec.maxMp,
      this.mp + (this.spec.mpRegenPerSec * this.modifiers.mpRegenMul * dtMs) / 1000,
    );
    this.dodgeBar = Math.min(
      this.spec.dodgeBarMax,
      this.dodgeBar + (this.spec.dodgeBarRegenPerSec * this.modifiers.dodgeRegenMul * dtMs) / 1000,
    );
    if (this.modifiers.hpRegenPerSec > 0 && this.state !== PlayerState.Dead && this.hp > 0) {
      this.hp = Math.min(this.getMaxHp(), this.hp + (this.modifiers.hpRegenPerSec * dtMs) / 1000);
    }

    const ax = input.axisX();

    if (ax !== 0) {
      if (ax === this.holdDir) {
        this.dirHoldMs += dtMs;
      } else {
        this.holdDir = ax;
        this.dirHoldMs = 0;
      }
    } else {
      this.holdDir = 0;
      this.dirHoldMs = 0;
    }

    if (input.justPressed('up')) {
      this.jumpBufferMs = this.spec.jumpBufferMs;
    }

    switch (this.state) {
      case PlayerState.Idle:
      case PlayerState.Walk:
      case PlayerState.Run:
        this.tickGround(dtMs, input, ax);
        break;
      case PlayerState.JumpRise:
        this.tickFirstJumpAir(dtMs, input, ax, true);
        break;
      case PlayerState.Fall:
        this.tickFirstJumpAir(dtMs, input, ax, false);
        break;
      case PlayerState.DoubleJump:
        this.tickDoubleJump(dtMs, input, ax);
        break;
      case PlayerState.Dash:
        this.tickDash(dtMs, input, ax);
        break;
      case PlayerState.AirDash:
        this.tickAirDash(dtMs, input, ax);
        break;
      case PlayerState.Land:
        this.tickLand(dtMs, input, ax);
        break;
      case PlayerState.Attack1:
        this.tickAttack(dtMs, input, 0);
        break;
      case PlayerState.Attack2:
        this.tickAttack(dtMs, input, 1);
        break;
      case PlayerState.Attack3:
        this.tickAttack(dtMs, input, 2);
        break;
      case PlayerState.Skill1:
        this.tickSkill(dtMs, input, 0);
        break;
      case PlayerState.Skill2:
        this.tickSkill(dtMs, input, 1);
        break;
      case PlayerState.Skill3:
        this.tickSkill(dtMs, input, 2);
        break;
      case PlayerState.DashAtk:
        this.tickDashAtk(dtMs, input);
        break;
      case PlayerState.JumpAtk:
        this.tickJumpAtk(dtMs);
        break;
      case PlayerState.DodgeStand:
        this.tickDodgeStand(dtMs, input);
        break;
      case PlayerState.DodgeRoll:
        this.tickDodgeRoll(dtMs, input);
        break;
      case PlayerState.Hurt:
        this.tickHurt(dtMs);
        break;
      case PlayerState.Dead:
        this.tickDead(dtMs);
        break;
      case PlayerState.Parry:
        this.tickParry(dtMs);
        break;
    }

    if (this.chargingActive) {
      if (!this.chargingAllowed()) {
        this.cancelCharge();
      } else if (input.justReleased('attack')) {
        if (this.onGround) {
          this.releaseChargeAndCast();
        } else {
          this.cancelCharge();
        }
      } else {
        const maxByMp =
          (this.mp / this.spec.skills.s3.mpCost) * this.spec.chargeTier3Ms;
        const target = Math.min(this.spec.chargeTier3Ms, this.chargingMs + dtMs);
        this.chargingMs = Math.min(target, maxByMp);
      }
    }

    const dt = dtMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    for (const s of solidBoxes) {
      if (
        this.x + this.spec.width <= s.x ||
        this.x >= s.x + s.w ||
        this.y + this.spec.height <= s.y ||
        this.y >= s.y + s.h
      ) continue;
      const overlapL = this.x + this.spec.width - s.x;
      const overlapR = s.x + s.w - this.x;
      const overlapT = this.y + this.spec.height - s.y;
      const overlapB = s.y + s.h - this.y;
      const minH = Math.min(overlapL, overlapR);
      const minV = Math.min(overlapT, overlapB);
      const STEP_UP_HEIGHT = 24;
      if (minV <= minH) {
        if (overlapT < overlapB) {
          this.y = s.y - this.spec.height;
          if (this.vy > 0) this.vy = 0;
        } else {
          this.y = s.y + s.h;
          if (this.vy < 0) this.vy = 0;
        }
      } else if (overlapT > 0 && overlapT <= STEP_UP_HEIGHT && this.vy >= 0) {
        this.y = s.y - this.spec.height;
        if (this.vy > 0) this.vy = 0;
      } else {
        if (overlapL < overlapR) {
          this.x = s.x - this.spec.width;
          if (this.vx > 0) this.vx = 0;
        } else {
          this.x = s.x + s.w;
          if (this.vx < 0) this.vx = 0;
        }
      }
    }

    let effectiveGroundY = this.worldFloorY;
    const playerCenterX = this.x + this.spec.width / 2;
    for (const s of solidBoxes) {
      if (playerCenterX < s.x || playerCenterX > s.x + s.w) continue;
      if (s.y < effectiveGroundY && s.y + s.h > this.y) effectiveGroundY = s.y;
    }
    for (const s of slopeBoxes) {
      if (playerCenterX < s.x || playerCenterX > s.x + s.w) continue;
      const localX = playerCenterX - s.x;
      const t = Math.max(0, Math.min(1, localX / s.w));
      const slopeY = s.dir === 'right' ? s.y + s.h * (1 - t) : s.y + s.h * t;
      if (slopeY < effectiveGroundY && s.y + s.h > this.y) effectiveGroundY = slopeY;
    }
    if (this.dropThroughMs <= 0) {
      for (const p of onewayBoxes) {
        if (playerCenterX < p.x || playerCenterX > p.x + p.w) continue;
        const lastFeetY = this.y + this.spec.height - this.vy * dt;
        if (this.vy >= 0 && lastFeetY <= p.y + 4 && p.y < effectiveGroundY) {
          effectiveGroundY = p.y;
        }
      }
    }

    const feetY = this.y + this.spec.height;
    if (feetY >= effectiveGroundY) {
      this.y = effectiveGroundY - this.spec.height;
      if (!this.onGround) {
        this.onLand();
      }
      this.onGround = true;
      if (this.vy > 0) this.vy = 0;
    } else {
      if (this.onGround) {
        this.coyoteMs = this.spec.coyoteTimeMs;
      }
      this.onGround = false;
      const airborneStates: PlayerState[] = [
        PlayerState.JumpRise,
        PlayerState.Fall,
        PlayerState.DoubleJump,
        PlayerState.Dash,
        PlayerState.AirDash,
        PlayerState.Land,
        PlayerState.JumpAtk,
        PlayerState.Hurt,
        PlayerState.Dead,
      ];
      if (!airborneStates.includes(this.state) && this.vy > 0) {
        this.setState(PlayerState.Fall);
      }
    }

    if (ax !== 0 && !this.isLockedFacing()) {
      this.facing = ax > 0 ? 1 : -1;
    }

    this.activeHit = this.computeActiveHit();

    this.view.x = this.x;
    this.view.y = this.y;
    this.redraw();
  }

  giveMp(amount: number) {
    this.mp = Math.min(this.spec.maxMp, this.mp + amount);
  }

  getActiveHit(): ActiveHit | null {
    return this.activeHit;
  }

  getMaxHp(): number {
    return this.spec.maxHp + this.modifiers.maxHpAdd;
  }

  applyBuff(buff: BuffSpec) {
    buff.apply(this.modifiers);
    this.acquiredBuffs.push(buff);
    if (buff.id === 'iron-skin') this.hp = Math.min(this.getMaxHp(), this.hp + 15);
    if (buff.id === 'tempered-body') this.hp = Math.min(this.getMaxHp(), this.hp + 10);
    if (buff.id === 'iron-skin-2') this.hp = Math.min(this.getMaxHp(), this.hp + 25);
    if (buff.id === 'mountain-heart') this.hp = Math.min(this.getMaxHp(), this.hp + 30);
  }

  applyModifier(mod: RunModifier) {
    mod.apply(this.modifiers);
    this.acquiredModifier = mod;
    this.hp = Math.max(1, Math.min(this.hp, this.getMaxHp()));
  }

  resetBuffs() {
    this.modifiers = { ...DEFAULT_MODIFIERS };
    this.acquiredBuffs = [];
    this.acquiredModifier = null;
    this.hp = this.spec.maxHp;
    this.mp = this.spec.maxMp;
    this.dodgeBar = this.spec.dodgeBarMax;
    this.skillCooldowns = [0, 0, 0];
  }

  isInvincible(): boolean {
    if (this.spawnInvincibleMs > 0) return true;
    if (this.spec.kind === 'archer' && this.state === PlayerState.Parry) return true;
    return (
      this.state === PlayerState.DodgeStand ||
      this.state === PlayerState.DodgeRoll ||
      this.state === PlayerState.Hurt ||
      this.state === PlayerState.Dead ||
      this.state === PlayerState.Skill1 ||
      this.state === PlayerState.Skill2 ||
      this.state === PlayerState.Skill3
    );
  }

  isParryActive(): boolean {
    if (this.spec.kind === 'archer') return false;
    if (this.state !== PlayerState.Parry) return false;
    return (
      this.stateTimeMs >= this.spec.parryActiveStartMs &&
      this.stateTimeMs <= this.spec.parryActiveEndMs
    );
  }

  activateParryBuff() {
    this.parryBuffMs = this.spec.parryBuffDurationMs * this.modifiers.parryBuffDurationMul;
  }

  heal(amount: number) {
    this.hp = Math.min(this.getMaxHp(), this.hp + amount);
  }

  hasParryBuff(): boolean {
    return this.parryBuffMs > 0;
  }

  takeDamage(damage: number, knockbackVx: number) {
    if (this.isInvincible()) return;

    const wasCharging = this.chargingActive;
    const counterEligible =
      this.spec.kind !== 'archer' &&
      wasCharging &&
      this.chargingMs >= this.spec.chargeTier1Ms;
    if (counterEligible) {
      const chargedMp =
        (this.chargingMs / this.spec.chargeTier3Ms) * this.spec.skills.s3.mpCost;
      this.mp = Math.max(0, this.mp - chargedMp);
      for (let i = 0; i < this.skillCooldowns.length; i++) {
        this.skillCooldowns[i] = Math.max(this.skillCooldowns[i]!, 10000);
      }
      this.counterHurtMs = this.spec.counterHurtMs;
    } else {
      this.counterHurtMs = 0;
    }
    this.chargingActive = false;
    this.chargingMs = 0;

    this.hp = Math.max(0, this.hp - damage);
    this.vx = knockbackVx;
    this.vy = -180;
    if (this.hp === 0) {
      this.respawnTimerMs = this.spec.deathRespawnMs;
      this.setState(PlayerState.Dead);
    } else {
      this.setState(PlayerState.Hurt);
    }
  }

  isCounterStunned(): boolean {
    return this.counterHurtMs > 0;
  }

  aabb() {
    return { x: this.x, y: this.y, w: this.spec.width, h: this.spec.height };
  }

  private tickGround(dtMs: number, input: Input, ax: number) {
    if (!this.onGround) {
      const dt = dtMs / 1000;
      const g = this.spec.gravity * this.spec.fallGravityMultiplier;
      this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);
    }

    if (input.justPressed('parry') && this.parryCooldownMs <= 0) {
      this.startParry();
      return;
    }

    if (input.justPressed('dodge') && this.dodgeBar >= this.spec.dodgeStandCost) {
      this.dodgeBar -= this.spec.dodgeStandCost;
      this.startDodgeStand();
      return;
    }

    if (this.consumeSkillBuffer()) return;

    if (input.justPressed('attack')) {
      this.startAttack(0);
      return;
    }

    const wantsRun = this.dirHoldMs >= this.spec.walkToRunHoldMs;

    const dt = input.consumeDoubleTap();

    if (dt !== 0 && this.dashCooldownMs <= 0 && ax === dt) {
      this.startGroundDash(dt);
      return;
    }

    let targetVx = 0;
    if (ax !== 0) {
      const speed = wantsRun ? this.spec.runSpeed : this.spec.walkSpeed;
      targetVx = ax * speed;
    }
    this.vx = targetVx;

    if (ax === 0) {
      this.setState(PlayerState.Idle);
    } else if (wantsRun) {
      this.setState(PlayerState.Run);
    } else {
      this.setState(PlayerState.Walk);
    }

    if (this.jumpBufferMs > 0) {
      this.startGroundJump();
    }
  }

  private tickFirstJumpAir(dtMs: number, input: Input, ax: number, rising: boolean) {
    if (this.tryDefensiveCancel(input)) return;

    if (input.justPressed('attack') && !this.airAtkUsed) {
      this.startJumpAtk();
      return;
    }

    const dt = dtMs / 1000;

    const targetVx = ax * this.spec.runSpeed;
    const accel = this.spec.airAcceleration * dt;
    if (targetVx > this.vx) {
      this.vx = Math.min(targetVx, this.vx + accel);
    } else if (targetVx < this.vx) {
      this.vx = Math.max(targetVx, this.vx - accel);
    }

    const g =
      this.vy >= 0
        ? this.spec.gravity * this.spec.fallGravityMultiplier
        : this.spec.gravity;
    this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);

    if (rising && this.vy >= 0) {
      this.setState(PlayerState.Fall);
    }

    const heightAboveGround = (this.worldFloorY - this.spec.height) - this.y;

    const dtap = input.consumeDoubleTap();
    if (this.spec.hasAirDash && dtap !== 0 && !this.airDashUsed && ax === dtap) {
      if (heightAboveGround >= this.spec.airDashMinHeight) {
        this.startAirDash(dtap);
        return;
      }
      this.airDashBufferedDir = dtap;
      this.airDashBufferedMs = this.spec.airDashBufferMs;
    }

    if (
      this.airDashBufferedMs > 0 &&
      this.airDashBufferedDir !== 0 &&
      !this.airDashUsed &&
      heightAboveGround >= this.spec.airDashMinHeight &&
      ax === this.airDashBufferedDir
    ) {
      const dir = this.airDashBufferedDir as -1 | 1;
      this.airDashBufferedMs = 0;
      this.airDashBufferedDir = 0;
      this.startAirDash(dir);
      return;
    }

    if (this.jumpBufferMs > 0 && this.jumpsUsed < this.spec.maxJumps) {
      this.startDoubleJump();
    }
  }

  private tickDoubleJump(dtMs: number, input: Input, ax: number) {
    if (this.tryDefensiveCancel(input)) return;

    if (input.justPressed('attack') && !this.airAtkUsed) {
      this.startJumpAtk();
      return;
    }

    const dt = dtMs / 1000;

    const targetVx = ax * this.spec.runSpeed;
    const accel = this.spec.airAcceleration * dt;
    if (targetVx > this.vx) {
      this.vx = Math.min(targetVx, this.vx + accel);
    } else if (targetVx < this.vx) {
      this.vx = Math.max(targetVx, this.vx - accel);
    }

    const g =
      this.vy >= 0
        ? this.spec.gravity * this.spec.fallGravityMultiplier
        : this.spec.gravity;
    this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);
  }

  private tickDash(dtMs: number, input: Input, ax: number) {
    if (this.onGround) {
      this.vy = 0;
    } else {
      const dt = dtMs / 1000;
      const g = this.vy >= 0 ? this.spec.gravity * this.spec.fallGravityMultiplier : this.spec.gravity;
      this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);
    }

    if (input.justPressed('dodge') && this.dodgeBar >= this.spec.dodgeStandCost) {
      this.dodgeBar -= this.spec.dodgeStandCost;
      this.startDodgeStand();
      return;
    }

    if (this.consumeSkillBuffer()) return;

    if (input.justPressed('attack')) {
      this.startDashAtk();
      return;
    }

    if (this.jumpBufferMs > 0) {
      this.startGroundJump();
      return;
    }

    if (ax !== 0 && ax !== this.dashDir) {
      const dt = dtMs / 1000;
      const targetVx = ax * this.spec.runSpeed;
      const decel = this.spec.groundFriction * dt;
      if (targetVx > this.vx) {
        this.vx = Math.min(targetVx, this.vx + decel);
      } else if (targetVx < this.vx) {
        this.vx = Math.max(targetVx, this.vx - decel);
      }
    }

    if (this.stateTimeMs >= this.spec.dashDurationMs) {
      if (ax !== 0) {
        this.vx = ax * this.spec.runSpeed;
        this.setState(PlayerState.Run);
      } else {
        this.vx = 0;
        this.setState(PlayerState.Idle);
      }
    }
  }

  private tickAirDash(dtMs: number, input: Input, ax: number) {
    if (this.tryDefensiveCancel(input)) return;

    if (input.justPressed('attack') && !this.airAtkUsed) {
      this.startJumpAtk();
      return;
    }

    if (input.justPressed('down')) {
      this.vy = Math.max(this.vy, this.spec.airDashDropVy);
      this.setState(PlayerState.Fall);
      return;
    }

    if (ax !== 0 && ax !== this.dashDir) {
      const dt = dtMs / 1000;
      const targetVx = ax * this.spec.runSpeed;
      const accel = this.spec.airAcceleration * dt;
      if (targetVx > this.vx) {
        this.vx = Math.min(targetVx, this.vx + accel);
      } else if (targetVx < this.vx) {
        this.vx = Math.max(targetVx, this.vx - accel);
      }
    }

    if (this.stateTimeMs >= this.spec.airDashDurationMs) {
      this.setState(PlayerState.Fall);
    }
  }

  private tickLand(_dtMs: number, _input: Input, ax: number) {
    if (this.stateTimeMs >= this.spec.landDurationMs) {
      this.setState(ax === 0 ? PlayerState.Idle : PlayerState.Walk);
    }
    if (this.jumpBufferMs > 0) {
      this.startGroundJump();
    }
  }

  private tryDefensiveCancel(input: Input): boolean {
    if (input.justPressed('parry') && this.parryCooldownMs <= 0) {
      this.startParry();
      return true;
    }
    if (input.justPressed('dodge') && this.dodgeBar >= this.spec.dodgeStandCost) {
      this.dodgeBar -= this.spec.dodgeStandCost;
      this.startDodgeStand();
      return true;
    }
    return false;
  }

  private consumeSkillBuffer(): boolean {
    if (this.skillBufferMs <= 0 || this.skillBufferIdx < 0) return false;
    const idx = this.skillBufferIdx;
    if (this.startSkill(idx)) {
      this.skillBufferMs = 0;
      this.skillBufferIdx = -1;
      return true;
    }
    this.skillBufferMs = 0;
    this.skillBufferIdx = -1;
    return false;
  }

  private tickAttack(dtMs: number, input: Input, comboIdx: number) {
    if (this.tryDefensiveCancel(input)) return;
    const spec = this.spec.comboZ[comboIdx]!;

    if (this.stateTimeMs >= spec.active[0] && this.stateTimeMs <= spec.active[1]) {
      this.vx = this.facing * spec.vxPush;
    } else {
      this.vx = 0;
    }

    if (!this.onGround) {
      const dt = dtMs / 1000;
      const g =
        this.vy >= 0
          ? this.spec.gravity * this.spec.fallGravityMultiplier
          : this.spec.gravity;
      this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);
    }

    const nw = spec.nextWindow;

    if (
      nw !== null &&
      input.justPressed('attack') &&
      this.stateTimeMs >= nw[0] &&
      this.stateTimeMs <= nw[1] &&
      comboIdx < 2
    ) {
      this.startAttack(comboIdx + 1);
      return;
    }

    if (this.stateTimeMs >= spec.duration) {
      this.setState(PlayerState.Idle);
    }
  }

  private tickSkill(dtMs: number, input: Input, skillIdx: number) {
    if (this.tryDefensiveCancel(input)) return;
    if (this.consumeSkillBuffer()) return;
    const skill = this.skillByIdx(skillIdx);
    const lastHitEnd = Math.max(...skill.hits.map((h) => h.active[1]));

    // After the last active hit window + small post-fire buffer, return control
    // to the player so they can move/turn while queued sub-arrows still fire.
    if (this.stateTimeMs >= lastHitEnd + 60) {
      this.setState(PlayerState.Idle);
      return;
    }

    this.vx = 0;
    if (this.onGround) {
      this.vy = 0;
    } else {
      const dt = dtMs / 1000;
      const g =
        this.vy >= 0
          ? this.spec.gravity * this.spec.fallGravityMultiplier
          : this.spec.gravity;
      this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);
    }
  }

  private tickDashAtk(dtMs: number, input: Input) {
    if (this.tryDefensiveCancel(input)) return;
    const dt = dtMs / 1000;
    const decel = this.spec.groundFriction * dt;
    if (this.vx > 0) this.vx = Math.max(0, this.vx - decel);
    else if (this.vx < 0) this.vx = Math.min(0, this.vx + decel);

    if (!this.onGround) {
      const g =
        this.vy >= 0
          ? this.spec.gravity * this.spec.fallGravityMultiplier
          : this.spec.gravity;
      this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);
    }

    if (this.stateTimeMs >= this.spec.dashAtk.duration) {
      this.setState(PlayerState.Idle);
    }
  }

  private tickJumpAtk(dtMs: number) {
    const dt = dtMs / 1000;
    const g =
      this.vy >= 0
        ? this.spec.gravity * this.spec.fallGravityMultiplier
        : this.spec.gravity;
    this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);

    if (this.stateTimeMs >= this.spec.jumpAtk.duration) {
      this.setState(PlayerState.Fall);
    }
  }

  private tickDodgeStand(_dtMs: number, input: Input) {
    this.vx = 0;
    this.vy = 0;

    const dt = input.consumeDoubleTap();
    if (dt !== 0 && this.dodgeBar >= this.spec.dodgeRollCost) {
      this.dodgeBar -= this.spec.dodgeRollCost;
      this.startDodgeRoll(dt);
      return;
    }

    if (this.stateTimeMs >= this.spec.dodgeStandDurationMs) {
      this.setState(PlayerState.Idle);
    }
  }

  private tickDodgeRoll(_dtMs: number, input: Input) {
    this.vy = 0;
    input.consumeDoubleTap();

    if (this.stateTimeMs >= this.spec.dodgeRollDurationMs) {
      this.setState(PlayerState.Idle);
    }
  }

  private tickParry(dtMs: number) {
    if (this.spec.kind === 'archer') {
      const dt = dtMs / 1000;
      this.vy += this.spec.gravity * dt;
      if (this.vy > this.spec.maxFallSpeed) this.vy = this.spec.maxFallSpeed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }
    if (this.stateTimeMs >= this.spec.parryDurationMs) {
      this.parryCooldownMs = this.spec.parryCooldownMs;
      this.setState(this.onGround ? PlayerState.Idle : PlayerState.Fall);
    }
  }

  private chargingAllowed(): boolean {
    const s = this.state;
    return (
      s === PlayerState.Idle ||
      s === PlayerState.Walk ||
      s === PlayerState.Run ||
      s === PlayerState.JumpRise ||
      s === PlayerState.Fall ||
      s === PlayerState.DoubleJump ||
      s === PlayerState.AirDash ||
      s === PlayerState.Land ||
      s === PlayerState.Dash ||
      s === PlayerState.Attack1 ||
      s === PlayerState.Attack2 ||
      s === PlayerState.Attack3 ||
      s === PlayerState.DashAtk ||
      s === PlayerState.JumpAtk ||
      s === PlayerState.Skill1 ||
      s === PlayerState.Skill2 ||
      s === PlayerState.Skill3
    );
  }

  private cancelCharge() {
    this.chargingActive = false;
    this.chargingMs = 0;
  }

  private releaseChargeAndCast() {
    const t = this.chargingMs;
    const skills = this.spec.skills;
    let tier = -1;

    if (t >= this.spec.chargeTier3Ms && this.mp >= skills.s3.mpCost) tier = 2;
    else if (t >= this.spec.chargeTier2Ms && this.mp >= skills.s2.mpCost) tier = 1;
    else if (t >= this.spec.chargeTier1Ms && this.mp >= skills.s1.mpCost) tier = 0;

    this.chargingActive = false;
    this.chargingMs = 0;

    if (tier < 0) return;

    const skill = this.skillByIdx(tier);
    this.mp -= skill.mpCost;
    this.vx = 0;
    const newState =
      tier === 0
        ? PlayerState.Skill1
        : tier === 1
          ? PlayerState.Skill2
          : PlayerState.Skill3;
    this.state = newState;
    this.stateTimeMs = 0;
    this.lastActiveHitIdx = -1;
  }

  private startParry() {
    if (this.spec.kind === 'archer') {
      this.vx = -this.facing * this.spec.stepBackHopVx;
      this.vy = this.spec.stepBackHopVy;
    } else {
      this.vx = 0;
      this.vy = 0;
    }
    this.setState(PlayerState.Parry);
  }

  private tickHurt(dtMs: number) {
    const dt = dtMs / 1000;
    const decel = this.spec.groundFriction * dt;
    if (this.vx > 0) this.vx = Math.max(0, this.vx - decel);
    else if (this.vx < 0) this.vx = Math.min(0, this.vx + decel);

    const g =
      this.vy >= 0
        ? this.spec.gravity * this.spec.fallGravityMultiplier
        : this.spec.gravity;
    this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);

    if (this.counterHurtMs > 0) {
      this.counterHurtMs = Math.max(0, this.counterHurtMs - dtMs);
      if (this.counterHurtMs <= 0) {
        this.setState(PlayerState.Idle);
      }
    } else if (this.stateTimeMs >= this.spec.hurtStunMs) {
      this.setState(PlayerState.Idle);
    }
  }

  private tickDead(dtMs: number) {
    this.vx = 0;
    this.vy = 0;
    this.respawnTimerMs -= dtMs;
    if (this.respawnTimerMs <= 0) {
      this.respawn();
    }
  }

  teleportToStart() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.airAtkUsed = false;
    this.airDashUsed = false;
    this.jumpsUsed = 0;
    this.parryCooldownMs = 0;
    this.skillBufferMs = 0;
    this.skillBufferIdx = -1;
    this.chargingActive = false;
    this.chargingMs = 0;
    this.counterHurtMs = 0;
    this.spawnInvincibleMs = 1500;
    this.setState(PlayerState.Idle);
  }

  private respawn() {
    this.teleportToStart();
    this.hp = this.getMaxHp();
    this.mp = this.spec.maxMp;
    this.dodgeBar = this.spec.dodgeBarMax;
    this.skillCooldowns = [0, 0, 0];
  }

  private startGroundJump() {
    if (this.onGround || this.coyoteMs > 0) {
      this.vy = this.spec.jumpInitialVy;
      this.jumpsUsed = 1;
      this.coyoteMs = 0;
      this.jumpBufferMs = 0;
      this.onGround = false;
      this.setState(PlayerState.JumpRise);
    }
  }

  private startDoubleJump() {
    this.clampVxToWalkSpeed();
    this.vy = this.spec.doubleJumpInitialVy;
    this.jumpsUsed = 2;
    this.jumpBufferMs = 0;
    this.setState(PlayerState.DoubleJump);
  }

  private startGroundDash(dir: -1 | 1) {
    this.vx = dir * this.spec.dashSpeed;
    this.vy = 0;
    this.dashCooldownMs = this.spec.dashCooldownMs;
    this.facing = dir;
    this.dashDir = dir;
    this.setState(PlayerState.Dash);
  }

  private startAirDash(dir: -1 | 1) {
    this.airDashUsed = true;
    this.vx = dir * this.spec.airDashSpeed;
    this.vy = 0;
    this.facing = dir;
    this.dashDir = dir;
    this.setState(PlayerState.AirDash);
  }

  private startAttack(comboIdx: number) {
    this.vx = 0;
    const state =
      comboIdx === 0
        ? PlayerState.Attack1
        : comboIdx === 1
          ? PlayerState.Attack2
          : PlayerState.Attack3;
    this.setState(state);
  }

  private startSkill(skillIdx: number): boolean {
    const skill = this.skillByIdx(skillIdx);
    if (this.mp < skill.mpCost) return false;
    if (this.skillCooldowns[skillIdx]! > 0) return false;
    this.mp -= skill.mpCost;
    this.skillCooldowns[skillIdx] = skill.cooldownMs;
    this.vx = 0;
    this.chargingActive = false;
    this.chargingMs = 0;
    const newState =
      skillIdx === 0
        ? PlayerState.Skill1
        : skillIdx === 1
          ? PlayerState.Skill2
          : PlayerState.Skill3;
    this.state = newState;
    this.stateTimeMs = 0;
    this.lastActiveHitIdx = -1;
    return true;
  }

  private startDashAtk() {
    this.vx = this.facing * this.spec.dashAtk.vxInitial;
    this.setState(PlayerState.DashAtk);
  }

  private startDodgeStand() {
    this.vx = 0;
    this.vy = 0;
    this.setState(PlayerState.DodgeStand);
  }

  private startDodgeRoll(dir: -1 | 1) {
    this.facing = dir;
    this.vx = dir * this.spec.dodgeRollSpeed;
    this.vy = 0;
    this.setState(PlayerState.DodgeRoll);
  }

  private startJumpAtk() {
    this.airAtkUsed = true;
    this.airDashUsed = true;
    this.jumpsUsed = 2;
    this.clampVxToWalkSpeed();
    this.setState(PlayerState.JumpAtk);
  }

  private clampVxToWalkSpeed() {
    const walk = this.spec.walkSpeed;
    if (this.vx > walk) this.vx = walk;
    else if (this.vx < -walk) this.vx = -walk;
  }

  private skillByIdx(idx: number) {
    if (idx === 0) return this.spec.skills.s1;
    if (idx === 1) return this.spec.skills.s2;
    return this.spec.skills.s3;
  }

  private currentHitList(): readonly HitPhase[] {
    if (this.state === PlayerState.Attack1) return [this.spec.comboZ[0]!];
    if (this.state === PlayerState.Attack2) return [this.spec.comboZ[1]!];
    if (this.state === PlayerState.Attack3) return [this.spec.comboZ[2]!];
    if (this.state === PlayerState.Skill1) return this.spec.skills.s1.hits;
    if (this.state === PlayerState.Skill2) return this.spec.skills.s2.hits;
    if (this.state === PlayerState.Skill3) return this.spec.skills.s3.hits;
    if (this.state === PlayerState.DashAtk) return [this.spec.dashAtk];
    if (this.state === PlayerState.JumpAtk) return [this.spec.jumpAtk];
    return [];
  }

  private computeActiveHit(): ActiveHit | null {
    const hits = this.currentHitList();
    let activeIdx = -1;
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i]!;
      if (this.stateTimeMs >= h.active[0] && this.stateTimeMs <= h.active[1]) {
        activeIdx = i;
        break;
      }
    }

    if (activeIdx !== this.lastActiveHitIdx) {
      if (activeIdx >= 0) {
        this.currentAttackId++;
        if (this.spec.kind === 'archer') {
          const h = hits[activeIdx]!;
          const isCombo =
            this.state === PlayerState.Attack1 ||
            this.state === PlayerState.Attack2 ||
            this.state === PlayerState.Attack3;
          let dmg = h.damage;
          if (isCombo) dmg *= this.modifiers.comboDamageMul;
          this.spawnArrowsForState(Math.round(dmg), h.knockback);
        }
      }
      this.lastActiveHitIdx = activeIdx;
    }

    if (activeIdx < 0) return null;
    if (this.spec.kind === 'archer') return null;

    const h = hits[activeIdx]!;
    const hb = h.hitbox;
    const localX = this.spec.width / 2 + this.facing * hb.cx - hb.w / 2;
    const isCombo =
      this.state === PlayerState.Attack1 ||
      this.state === PlayerState.Attack2 ||
      this.state === PlayerState.Attack3;
    let damage = h.damage;
    if (isCombo) damage *= this.modifiers.comboDamageMul;
    if (this.parryBuffMs > 0) damage *= this.spec.parryBuffDamageMul;
    damage = Math.round(damage);
    return {
      bbox: { x: this.x + localX, y: this.y + hb.y, w: hb.w, h: hb.h },
      damage,
      knockback: h.knockback,
      attackId: this.currentAttackId,
      facing: this.facing,
      isCombo,
    };
  }

  private isLockedFacing(): boolean {
    return (
      this.state === PlayerState.Attack1 ||
      this.state === PlayerState.Attack2 ||
      this.state === PlayerState.Attack3 ||
      this.state === PlayerState.Skill1 ||
      this.state === PlayerState.Skill2 ||
      this.state === PlayerState.Skill3 ||
      this.state === PlayerState.DashAtk ||
      this.state === PlayerState.JumpAtk ||
      this.state === PlayerState.DodgeRoll ||
      this.state === PlayerState.Parry
    );
  }

  private isSkillState(): boolean {
    return (
      this.state === PlayerState.Skill1 ||
      this.state === PlayerState.Skill2 ||
      this.state === PlayerState.Skill3
    );
  }

  private onLand() {
    this.jumpsUsed = 0;
    this.airDashUsed = false;
    this.airAtkUsed = false;
    this.airDashBufferedDir = 0;
    this.airDashBufferedMs = 0;
    if (this.state === PlayerState.Hurt || this.state === PlayerState.Dead) {
      return;
    }
    if (this.spec.kind === 'archer' && this.state === PlayerState.Parry) {
      return;
    }
    this.setState(PlayerState.Land);
  }

  private setState(s: PlayerState) {
    if (this.state !== s) {
      this.state = s;
      this.stateTimeMs = 0;
      this.lastActiveHitIdx = -1;
    }
  }

  private redraw() {
    this.body.clear();
    let bodyAlpha = 0.95;
    if (this.spawnInvincibleMs > 0) {
      const t = this.spawnInvincibleMs / 60;
      bodyAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t));
    } else if (this.isInvincible()) {
      bodyAlpha = 0.4;
    }
    const buffActive = this.parryBuffMs > 0;
    const strokeColor = buffActive ? 0xffd700 : 0xffffff;
    const strokeWidth = buffActive ? 3 : 1;
    const strokeAlpha = buffActive ? 0.95 : 0.6;

    const isProne = this.state === PlayerState.Hurt && this.counterHurtMs > 0;
    if (isProne) {
      const proneW = this.spec.height * 0.85;
      const proneH = this.spec.width * 0.7;
      const proneX = (this.spec.width - proneW) / 2;
      const proneY = this.spec.height - proneH;
      this.body
        .rect(proneX, proneY, proneW, proneH)
        .fill({ color: 0x664466, alpha: bodyAlpha })
        .stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      this.body
        .moveTo(proneX + proneW * 0.3, proneY - 6)
        .lineTo(proneX + proneW * 0.3 + 6, proneY - 12)
        .lineTo(proneX + proneW * 0.3 + 12, proneY - 6)
        .stroke({ color: 0xffd700, width: 2, alpha: 0.7 });
    } else {
      this.body
        .rect(0, 0, this.spec.width, this.spec.height)
        .fill({ color: STATE_COLOR[this.state], alpha: bodyAlpha })
        .stroke({ color: strokeColor, width: strokeWidth, alpha: strokeAlpha });
    }

    this.facingMarker.clear();
    if (!isProne) {
      const cx = this.spec.width / 2;
      const cy = this.spec.height * 0.3;
      const tipX = cx + this.facing * (this.spec.width * 0.6);
      this.facingMarker
        .moveTo(cx, cy)
        .lineTo(tipX, cy)
        .stroke({ color: 0xffffff, width: 2 });
    }

    this.redrawHitbox();
  }

  private redrawHitbox() {
    this.hitboxMarker.clear();
    if (this.activeHit !== null) {
      const hb = this.activeHit.bbox;
      const localX = hb.x - this.x;
      const localY = hb.y - this.y;
      const isSkill = this.isSkillState();
      const fillColor = isSkill ? 0x4488ff : 0xff3344;
      const strokeColor = isSkill ? 0x2266dd : 0xff0022;
      this.hitboxMarker
        .rect(localX, localY, hb.w, hb.h)
        .fill({ color: fillColor, alpha: 0.32 })
        .stroke({ color: strokeColor, width: 2, alpha: 0.9 });
    }
  }
}
