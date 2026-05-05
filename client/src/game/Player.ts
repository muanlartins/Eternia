// Player state machine + physics.
// Phase 1 scope: movement only (idle/walk/run/jump/double_jump/fall/dash/land).
// No combat yet — Z/C/V/B keys are reserved but no-op here.

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

    // --- Jump input buffering
    if (input.justPressed('jump')) {
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
      case PlayerState.DoubleJump:
        this.tickAir(dtMs, input, ax, true);
        break;
      case PlayerState.Fall:
        this.tickAir(dtMs, input, ax, false);
        break;
      case PlayerState.Dash:
        this.tickDash(dtMs, ax);
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
      // If we were on ground and now falling without jumping, transition to Fall
      if (
        this.state !== PlayerState.JumpRise &&
        this.state !== PlayerState.DoubleJump &&
        this.state !== PlayerState.Dash &&
        this.vy > 0
      ) {
        this.setState(PlayerState.Fall);
      }
    }

    // --- Update facing
    if (ax !== 0) this.facing = ax > 0 ? 1 : -1;

    // --- Sync view to position
    this.view.x = this.x;
    this.view.y = this.y;
    this.redraw();
  }

  // ─── State handlers ─────────────────────────────────────────────

  private tickGround(dtMs: number, input: Input, ax: number) {
    // Choose target speed
    const wantsRun = this.dirHoldMs >= this.spec.walkToRunHoldMs;
    const dt = input.consumeDoubleTap();
    const dashTriggered = dt !== 0 && this.dashCooldownMs <= 0 && ax === dt;

    // Dash check first (consumes double-tap)
    if (dashTriggered) {
      this.startDash(dt);
      return;
    }

    let targetVx = 0;
    if (ax !== 0) {
      const speed = wantsRun ? this.spec.runSpeed : this.spec.walkSpeed;
      targetVx = ax * speed;
    }

    // Smooth velocity toward target (instantaneous on ground for crisp feel)
    this.vx = targetVx;

    // Set state based on movement
    if (ax === 0) {
      this.setState(PlayerState.Idle);
    } else if (wantsRun) {
      this.setState(PlayerState.Run);
    } else {
      this.setState(PlayerState.Walk);
    }

    // Jump (buffered or fresh)
    if (this.jumpBufferMs > 0) {
      this.startJump(this.spec.jumpInitialVy);
    }
  }

  private tickAir(dtMs: number, input: Input, ax: number, rising: boolean) {
    // Air drift: accelerate horizontal velocity toward axis * runSpeed (capped).
    const dt = dtMs / 1000;
    const targetVx = ax * this.spec.runSpeed;
    const accel = this.spec.airAcceleration * dt;
    if (targetVx > this.vx) {
      this.vx = Math.min(targetVx, this.vx + accel);
    } else if (targetVx < this.vx) {
      this.vx = Math.max(targetVx, this.vx - accel);
    }

    // Apply gravity (heavier when falling for snappier feel)
    const g =
      this.vy >= 0
        ? this.spec.gravity * this.spec.fallGravityMultiplier
        : this.spec.gravity;
    this.vy = Math.min(this.spec.maxFallSpeed, this.vy + g * dt);

    // Short hop: if jump released while rising, cut velocity
    if (rising && input.justReleased('jump') && this.vy < 0) {
      this.vy *= this.spec.shortHopMultiplier;
    }

    // Transition rise -> fall when apex passed
    if (rising && this.vy >= 0) {
      this.setState(PlayerState.Fall);
    }

    // Double jump (consumes buffer)
    if (this.jumpBufferMs > 0 && this.jumpsUsed < 2) {
      this.startJump(this.spec.doubleJumpInitialVy);
      this.setState(PlayerState.DoubleJump);
    }
  }

  private tickDash(dtMs: number, ax: number) {
    // During dash: locked horizontal velocity, no gravity input.
    // Apply mild gravity if airborne (to fall back from dashes off ledges).
    if (!this.onGround) {
      const dt = dtMs / 1000;
      this.vy = Math.min(this.spec.maxFallSpeed, this.vy + this.spec.gravity * dt * 0.5);
    } else {
      this.vy = 0;
    }

    if (this.stateTimeMs >= this.spec.dashDurationMs) {
      // Exit dash: drop into appropriate state
      if (this.onGround) {
        if (ax !== 0) {
          this.setState(PlayerState.Run);
          this.vx = ax * this.spec.runSpeed;
        } else {
          this.vx = 0;
          this.setState(PlayerState.Idle);
        }
      } else {
        this.setState(PlayerState.Fall);
      }
    }
  }

  private tickLand(dtMs: number, input: Input, ax: number) {
    this.vx = 0;
    if (this.stateTimeMs >= this.spec.landDurationMs) {
      this.setState(ax === 0 ? PlayerState.Idle : PlayerState.Walk);
    }
    // Buffered jump still works during land
    if (this.jumpBufferMs > 0) {
      this.startJump(this.spec.jumpInitialVy);
    }
  }

  // ─── Transitions ────────────────────────────────────────────────

  private startJump(initialVy: number) {
    // Ground jump or coyote-time jump
    const canGroundJump = this.onGround || this.coyoteMs > 0;
    if (canGroundJump && this.jumpsUsed === 0) {
      this.vy = initialVy;
      this.jumpsUsed = 1;
      this.coyoteMs = 0;
      this.jumpBufferMs = 0;
      this.onGround = false;
      this.setState(PlayerState.JumpRise);
    } else if (this.jumpsUsed < 2) {
      // Double jump
      this.vy = initialVy;
      this.jumpsUsed = 2;
      this.jumpBufferMs = 0;
      this.setState(PlayerState.DoubleJump);
    }
  }

  private startDash(dir: -1 | 1) {
    this.vx = dir * this.spec.dashSpeed;
    this.vy = 0;
    this.dashCooldownMs = this.spec.dashCooldownMs;
    this.facing = dir;
    this.setState(PlayerState.Dash);
  }

  private onLand() {
    this.jumpsUsed = 0;
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
