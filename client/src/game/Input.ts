// Keyboard input with edge detection (justPressed/justReleased) and double-tap detection.
// Call update() once per frame AFTER reading input, BEFORE next frame's polling.

export type InputKey =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'attack'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'dodge';

const KEY_MAP: Record<string, InputKey> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  Space: 'jump',
  KeyX: 'jump',
  KeyZ: 'attack',
  KeyC: 'skill1',
  KeyV: 'skill2',
  KeyB: 'skill3',
  ShiftLeft: 'dodge',
  ShiftRight: 'dodge',
};

type DoubleTapState = {
  lastAt: number;
  lastDir: -1 | 0 | 1;
};

export class Input {
  private held = new Set<InputKey>();
  private pressedThisFrame = new Set<InputKey>();
  private releasedThisFrame = new Set<InputKey>();

  // Track double-tap state for left/right.
  private doubleTap: DoubleTapState = { lastAt: 0, lastDir: 0 };
  private doubleTapTriggeredFor: -1 | 0 | 1 = 0;

  private readonly doubleTapWindowMs: number;

  constructor(opts: { doubleTapWindowMs: number }) {
    this.doubleTapWindowMs = opts.doubleTapWindowMs;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = KEY_MAP[e.code];
    if (!k) return;
    if (e.repeat) return;
    if (!this.held.has(k)) {
      this.pressedThisFrame.add(k);
      this.held.add(k);

      // Double-tap tracking for left/right.
      if (k === 'left' || k === 'right') {
        const dir: -1 | 1 = k === 'left' ? -1 : 1;
        const now = performance.now();
        if (
          this.doubleTap.lastDir === dir &&
          now - this.doubleTap.lastAt < this.doubleTapWindowMs
        ) {
          this.doubleTapTriggeredFor = dir;
        }
        this.doubleTap.lastDir = dir;
        this.doubleTap.lastAt = now;
      }
    }
    // Prevent default for game keys to avoid browser scrolling/searching.
    e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = KEY_MAP[e.code];
    if (!k) return;
    if (this.held.has(k)) {
      this.releasedThisFrame.add(k);
      this.held.delete(k);
    }
  };

  private onBlur = () => {
    // Window lost focus: clear all held keys to avoid stuck-input.
    for (const k of this.held) this.releasedThisFrame.add(k);
    this.held.clear();
  };

  isHeld(k: InputKey): boolean {
    return this.held.has(k);
  }

  justPressed(k: InputKey): boolean {
    return this.pressedThisFrame.has(k);
  }

  justReleased(k: InputKey): boolean {
    return this.releasedThisFrame.has(k);
  }

  /** Returns -1/0/1 the frame a double-tap (left/left or right/right) is detected. */
  consumeDoubleTap(): -1 | 0 | 1 {
    const v = this.doubleTapTriggeredFor;
    this.doubleTapTriggeredFor = 0;
    return v;
  }

  /** Horizontal axis: -1 (left held), +1 (right held), 0 (neither or both). */
  axisX(): -1 | 0 | 1 {
    const l = this.held.has('left');
    const r = this.held.has('right');
    if (l === r) return 0;
    return l ? -1 : 1;
  }

  /** Call after game logic for the frame. Clears edge state. */
  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}

