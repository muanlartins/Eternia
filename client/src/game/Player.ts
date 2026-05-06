import { Container, Graphics } from 'pixi.js';
import type { ElesisSpec } from '../data/elesis.js';
import type { Input } from './Input.js';
import { PlayerState, STATE_COLOR, type AABB, type ActiveHit, type Facing } from './types.js';

const GROUND_Y = 480;

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

export class Player {
  x = 0;
  y = GROUND_Y - 64;
  vx = 0;
  vy = 0;

  facing: Facing = 1;
  state: PlayerState = PlayerState.Idle;
  stateTimeMs = 0;

  mp: number;
  hp: number;
  dodgeBar: number;

  private onGround = true;
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

  private currentAttackId = 0;
  private lastActiveHitIdx = -1;
  private activeHit: ActiveHit | null = null;

  private airAtkUsed = false;
  private respawnTimerMs = 0;
  private parryCooldownMs = 0;

  readonly view = new Container();
  private body: Graphics;
  private facingMarker: Graphics;
  private hitboxMarker: Graphics;

  constructor(private readonly spec: ElesisSpec) {
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

  update(dtMs: number, input: Input, platforms: readonly AABB[] = []) {
    this.stateTimeMs += dtMs;
    this.coyoteMs = Math.max(0, this.coyoteMs - dtMs);
    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - dtMs);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - dtMs);
    this.airDashBufferedMs = Math.max(0, this.airDashBufferedMs - dtMs);
    this.parryCooldownMs = Math.max(0, this.parryCooldownMs - dtMs);

    this.mp = Math.min(this.spec.maxMp, this.mp + (this.spec.mpRegenPerSec * dtMs) / 1000);
    this.dodgeBar = Math.min(
      this.spec.dodgeBarMax,
      this.dodgeBar + (this.spec.dodgeBarRegenPerSec * dtMs) / 1000,
    );

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

    const dt = dtMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    let effectiveGroundY = GROUND_Y;
    const playerCenterX = this.x + this.spec.width / 2;
    for (const p of platforms) {
      if (playerCenterX < p.x || playerCenterX > p.x + p.w) continue;
      const lastFeetY = this.y + this.spec.height - this.vy * dt;
      if (this.vy >= 0 && lastFeetY <= p.y + 4 && p.y < effectiveGroundY) {
        effectiveGroundY = p.y;
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

  isInvincible(): boolean {
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
    if (this.state !== PlayerState.Parry) return false;
    return (
      this.stateTimeMs >= this.spec.parryActiveStartMs &&
      this.stateTimeMs <= this.spec.parryActiveEndMs
    );
  }

  takeDamage(damage: number, knockbackVx: number) {
    if (this.isInvincible()) return;
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

    for (let i = 0; i < SKILL_KEYS.length; i++) {
      if (input.justPressed(SKILL_KEYS[i]!)) {
        if (this.startSkill(i)) return;
      }
    }

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

    if (rising && input.justReleased('up') && this.vy < 0) {
      this.vy *= this.spec.shortHopMultiplier;
    }

    if (rising && this.vy >= 0) {
      this.setState(PlayerState.Fall);
    }

    const heightAboveGround = (GROUND_Y - this.spec.height) - this.y;

    const dtap = input.consumeDoubleTap();
    if (dtap !== 0 && !this.airDashUsed && ax === dtap) {
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

    if (this.jumpBufferMs > 0 && this.jumpsUsed < 2) {
      this.startDoubleJump();
    }
  }

  private tickDoubleJump(dtMs: number, input: Input, ax: number) {
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
    this.vy = 0;

    if (input.justPressed('dodge') && this.dodgeBar >= this.spec.dodgeStandCost) {
      this.dodgeBar -= this.spec.dodgeStandCost;
      this.startDodgeStand();
      return;
    }

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

  private tickAttack(_dtMs: number, input: Input, comboIdx: number) {
    if (this.tryDefensiveCancel(input)) return;
    const spec = this.spec.comboZ[comboIdx]!;

    if (this.stateTimeMs >= spec.active[0] && this.stateTimeMs <= spec.active[1]) {
      this.vx = this.facing * spec.vxPush;
    } else {
      this.vx = 0;
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

  private tickSkill(_dtMs: number, input: Input, skillIdx: number) {
    if (this.tryDefensiveCancel(input)) return;
    this.vx = 0;
    const skill = this.skillByIdx(skillIdx);
    if (this.stateTimeMs >= skill.duration) {
      this.setState(PlayerState.Idle);
    }
  }

  private tickDashAtk(dtMs: number, input: Input) {
    if (this.tryDefensiveCancel(input)) return;
    const dt = dtMs / 1000;
    const decel = this.spec.groundFriction * dt;
    if (this.vx > 0) this.vx = Math.max(0, this.vx - decel);
    else if (this.vx < 0) this.vx = Math.min(0, this.vx + decel);

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

  private tickParry(_dtMs: number) {
    this.vx = 0;
    this.vy = 0;
    if (this.stateTimeMs >= this.spec.parryDurationMs) {
      this.parryCooldownMs = this.spec.parryCooldownMs;
      this.setState(PlayerState.Idle);
    }
  }

  private startParry() {
    this.vx = 0;
    this.vy = 0;
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

    if (this.stateTimeMs >= this.spec.hurtStunMs) {
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
    this.x = 0;
    this.y = GROUND_Y - this.spec.height;
    this.vx = 0;
    this.vy = 0;
    this.airAtkUsed = false;
    this.airDashUsed = false;
    this.jumpsUsed = 0;
    this.parryCooldownMs = 0;
    this.setState(PlayerState.Idle);
  }

  private respawn() {
    this.teleportToStart();
    this.hp = this.spec.maxHp;
    this.mp = this.spec.maxMp;
    this.dodgeBar = this.spec.dodgeBarMax;
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
    this.mp -= skill.mpCost;
    this.vx = 0;
    const state =
      skillIdx === 0
        ? PlayerState.Skill1
        : skillIdx === 1
          ? PlayerState.Skill2
          : PlayerState.Skill3;
    this.setState(state);
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
      if (activeIdx >= 0) this.currentAttackId++;
      this.lastActiveHitIdx = activeIdx;
    }

    if (activeIdx < 0) return null;

    const h = hits[activeIdx]!;
    const hb = h.hitbox;
    const localX = this.spec.width / 2 + this.facing * hb.cx - hb.w / 2;
    return {
      bbox: { x: this.x + localX, y: this.y + hb.y, w: hb.w, h: hb.h },
      damage: h.damage,
      knockback: h.knockback,
      attackId: this.currentAttackId,
      facing: this.facing,
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
    const bodyAlpha = this.isInvincible() ? 0.4 : 0.95;
    this.body
      .rect(0, 0, this.spec.width, this.spec.height)
      .fill({ color: STATE_COLOR[this.state], alpha: bodyAlpha })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.6 });

    this.facingMarker.clear();
    const cx = this.spec.width / 2;
    const cy = this.spec.height * 0.3;
    const tipX = cx + this.facing * (this.spec.width * 0.6);
    this.facingMarker
      .moveTo(cx, cy)
      .lineTo(tipX, cy)
      .stroke({ color: 0xffffff, width: 2 });

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
