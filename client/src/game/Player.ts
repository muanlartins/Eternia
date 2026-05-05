// Player state machine + physics.
// Phase 1 scope: GC-style movement.
//
// Key mechanic: dash chaining. The first jump preserves full mobility (air drift +
// one air dash per cycle, optionally diagonal via ↑/↓). The second jump ("double jump")
// locks horizontal velocity entirely — no drift, no dash. Reset on landing.

import { Container, Graphics } from 'pixi.js';
import type { ElesisSpec } from '../data/elesis.js';
import type { Input } from './Input.js';
import { PlayerState, STATE_COLOR, type Facing } from './types.js';

const GROUND_Y = 480; // flat ground for Phase 1

export class Player {
  // Position (top-left of bounding box, in world coords)
  x = 0;
  y = GROUND_Y - 64;

  // Velocity (px/sec)
  vx = 0;
  vy = 0;

  facing: Facing = 1;
  state: PlayerState = PlayerState.Idle;
  stateTimeMs = 0;

  private onGround = true;
  private jumpsUsed = 0;
  private airDashUsed = false;

  // Modernization timers
  private coyoteMs = 0;
  private jumpBufferMs = 0;

  // Walk -> run transition tracker
  private dirHoldMs = 0;
  private holdDir: -1 | 0 | 1 = 0;

  // Dash
  private dashCooldownMs = 0;

  // Visual (Phase 1 = colored rect; Phase 7 will swap for sprites)
  readonly view = new Container();
  private body: Graphics;
  private facingMarker: Graphics;

  constructor(private readonly spec: ElesisSpec) {
    this.body = new Graphics();
    this.facingMarker = new Graphics();
    this.view.addChild(this.body);
    this.view.addChild(this.facingMarker);
    this.redraw();
  }

  update(dtMs: number, input: Input) {
    this.stateTimeMs += dtMs;
    this.coyoteMs = Math.max(0, this.coyoteMs - dtMs);
    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - dtMs);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - dtMs);

    const ax = input.axisX();

    // --- Track direction hold for walk->run transition
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

    // --- Jump input buffering (↑ press)
    if (input.justPressed('up')) {
      this.jumpBufferMs = this.spec.jumpBufferMs;
    }

    // --- State-specific update
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
        this.tickDoubleJump(dtMs);
        break;
      case PlayerState.Dash:
        this.tickDash(dtMs, ax);
        break;
      case PlayerState.AirDash:
        this.tickAirDash(dtMs);
        break;
      case PlayerState.Land:
        this.tickLand(dtMs, input, ax);
        break;
    }

    // --- Apply velocity
    const dt = dtMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // --- Ground collision (flat infinite ground for Phase 1)
    const feetY = this.y + this.spec.height;
    if (feetY >= GROUND_Y) {
      this.y = GROUND_Y - this.spec.height;
      if (!this.onGround) {
        this.onLand();
      }
      this.onGround = true;
      if (this.vy > 0) this.vy = 0;
    } else {
      if (this.onGround) {
        // Just stepped off — start coyote window
        this.coyoteMs = this.spec.coyoteTimeMs;
      }
      this.onGround = false;
      // Drop into Fall if falling without an active airborne state
      const airborneStates: PlayerState[] = [
        PlayerState.JumpRise,
        PlayerState.Fall,
        PlayerState.DoubleJump,
        PlayerState.Dash,
        PlayerState.AirDash,
        PlayerState.Land,
      ];
      if (!airborneStates.includes(this.state) && this.vy > 0) {
        this.setState(PlayerState.Fall);
      }
    }

    // --- Update facing (don't flip during locked-horizontal states)
    if (
      ax !== 0 &&
      this.state !== PlayerState.DoubleJump &&
      this.state !== PlayerState.Dash &&
      this.state !== PlayerState.AirDash
    ) {
      this.facing = ax > 0 ? 1 : -1;
    }

    // --- Sync view to position
    this.view.x = this.x;
    this.view.y = this.y;
    this.redraw();
  }

  // ─── State handlers ─────────────────────────────────────────────

  private tickGround(_dtMs: number, input: Input, ax: number) {
    const wantsRun = this.dirHoldMs >= this.spec.walkToRunHoldMs;
    const dt = input.consumeDoubleTap();

    // Ground dash on double-tap (only if pressing same direction as the tap).
    if (dt !== 0 && this.dashCooldownMs <= 0 && ax === dt) {
      this.startGroundDash(dt);
      return;
    }

    let targetVx = 0;
    if (ax !== 0) {
      const speed = wantsRun ? this.spec.runSpeed : this.spec.walkSpeed;
      targetVx = ax * speed;
    }
    this.vx = targetVx; // crisp, instantaneous on ground

    // Update state by movement
    if (ax === 0) {
      this.setState(PlayerState.Idle);
    } else if (wantsRun) {
      this.setState(PlayerState.Run);
    } else {
      this.setState(PlayerState.Walk);
    }

    // Buffered jump
    if (this.jumpBufferMs > 0) {
      this.startGroundJump();
    }
  }

  private tickFirstJumpAir(dtMs: number, input: Input, ax: number, rising: boolean) {
    const dt = dtMs / 1000;

    // Air drift (analog horizontal control during first-jump cycle)
    const targetVx = ax * this.spec.runSpeed;
    const accel = this.spec.airAcceleration * dt;
    if (targetVx > this.vx) {
      this.vx = Math.min(targetVx, this.vx + accel);
    } else if (targetVx < this.vx) {
      this.vx = Math.max(targetVx, this.vx - accel);
    }

    // Gravity (heavier when falling for snappy feel)
    const g =
      this.vy >= 0
        ? this.spec.gravity * this.spec.fallGravityMultiplier
        : this.spec.gravity;
    this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);

    // Short hop: jump released while rising → cut velocity
    if (rising && input.justReleased('up') && this.vy < 0) {
      this.vy *= this.spec.shortHopMultiplier;
    }

    // Apex passed → fall
    if (rising && this.vy >= 0) {
      this.setState(PlayerState.Fall);
    }

    // Air dash (one per air cycle; diagonal via ↑/↓ hold)
    const dtap = input.consumeDoubleTap();
    if (dtap !== 0 && !this.airDashUsed && ax === dtap) {
      this.startAirDash(dtap, input);
      return;
    }

    // Double jump (locks horizontal). Triggered by buffered ↑ press.
    if (this.jumpBufferMs > 0 && this.jumpsUsed < 2) {
      this.startDoubleJump();
    }
  }

  private tickDoubleJump(dtMs: number) {
    // Horizontal LOCKED — vx stays whatever it was (set to 0 on entry below).
    // No drift, no dashes.
    const dt = dtMs / 1000;
    const g =
      this.vy >= 0
        ? this.spec.gravity * this.spec.fallGravityMultiplier
        : this.spec.gravity;
    this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);
  }

  private tickDash(_dtMs: number, ax: number) {
    // Locked horizontal (set on entry). No gravity (stays at ground level).
    this.vy = 0;

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

  private tickAirDash(_dtMs: number) {
    // No gravity during air dash — it's a brief "flash forward".
    if (this.stateTimeMs >= this.spec.airDashDurationMs) {
      this.setState(PlayerState.Fall);
    }
  }

  private tickLand(_dtMs: number, _input: Input, ax: number) {
    this.vx = 0;
    if (this.stateTimeMs >= this.spec.landDurationMs) {
      this.setState(ax === 0 ? PlayerState.Idle : PlayerState.Walk);
    }
    if (this.jumpBufferMs > 0) {
      this.startGroundJump();
    }
  }

  // ─── Transitions ────────────────────────────────────────────────

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
    this.vx = 0; // LOCK horizontal
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
    this.setState(PlayerState.Dash);
  }

  private startAirDash(dir: -1 | 1, input: Input) {
    this.airDashUsed = true;
    this.vx = dir * this.spec.airDashSpeed;
    if (input.isHeld('up')) {
      this.vy = this.spec.airDashUpVy;
    } else if (input.isHeld('down')) {
      this.vy = this.spec.airDashDownVy;
    } else {
      this.vy = 0;
    }
    this.facing = dir;
    this.setState(PlayerState.AirDash);
  }

  private onLand() {
    this.jumpsUsed = 0;
    this.airDashUsed = false;
    this.setState(PlayerState.Land);
  }

  private setState(s: PlayerState) {
    if (this.state !== s) {
      this.state = s;
      this.stateTimeMs = 0;
    }
  }

  // ─── Visual ─────────────────────────────────────────────────────

  private redraw() {
    this.body.clear();
    this.body
      .rect(0, 0, this.spec.width, this.spec.height)
      .fill({ color: STATE_COLOR[this.state], alpha: 0.95 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.6 });

    this.facingMarker.clear();
    const cx = this.spec.width / 2;
    const cy = this.spec.height * 0.3;
    const tipX = cx + this.facing * (this.spec.width * 0.6);
    this.facingMarker
      .moveTo(cx, cy)
      .lineTo(tipX, cy)
      .stroke({ color: 0xffffff, width: 2 });
  }
}
