import { Container, Graphics } from 'pixi.js';
import type { ElesisSpec } from '../data/elesis.js';
import type { Input } from './Input.js';
import { PlayerState, STATE_COLOR, type Facing } from './types.js';

const GROUND_Y = 480;

export class Player {
  x = 0;
  y = GROUND_Y - 64;
  vx = 0;
  vy = 0;

  facing: Facing = 1;
  state: PlayerState = PlayerState.Idle;
  stateTimeMs = 0;

  private onGround = true;
  private jumpsUsed = 0;
  private airDashUsed = false;

  private coyoteMs = 0;
  private jumpBufferMs = 0;

  private dirHoldMs = 0;
  private holdDir: -1 | 0 | 1 = 0;

  private dashCooldownMs = 0;
  private dashDir: -1 | 1 = 1;

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
        this.tickDoubleJump(dtMs, ax);
        break;
      case PlayerState.Dash:
        this.tickDash(dtMs, ax);
        break;
      case PlayerState.AirDash:
        this.tickAirDash(dtMs, input, ax);
        break;
      case PlayerState.Land:
        this.tickLand(dtMs, input, ax);
        break;
    }

    const dt = dtMs / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

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
      ];
      if (!airborneStates.includes(this.state) && this.vy > 0) {
        this.setState(PlayerState.Fall);
      }
    }

    if (ax !== 0) {
      this.facing = ax > 0 ? 1 : -1;
    }

    this.view.x = this.x;
    this.view.y = this.y;
    this.redraw();
  }

  private tickGround(_dtMs: number, input: Input, ax: number) {
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

    const dtap = input.consumeDoubleTap();
    if (dtap !== 0 && !this.airDashUsed && ax === dtap) {
      this.startAirDash(dtap);
      return;
    }

    if (this.jumpBufferMs > 0 && this.jumpsUsed < 2) {
      this.startDoubleJump();
    }
  }

  private tickDoubleJump(dtMs: number, ax: number) {
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

  private tickDash(dtMs: number, ax: number) {
    this.vy = 0;

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
