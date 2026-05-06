export type InputKey =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'attack'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'dodge'
  | 'parry'
  | 'pick1'
  | 'pick2'
  | 'pick3'
  | 'mute'
  | 'minimap'
  | 'options';

const KEY_MAP: Record<string, InputKey> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  KeyZ: 'attack',
  KeyA: 'skill1',
  KeyS: 'skill2',
  KeyD: 'skill3',
  AltLeft: 'dodge',
  AltRight: 'dodge',
  Space: 'parry',
  Digit1: 'pick1',
  Digit2: 'pick2',
  Digit3: 'pick3',
  KeyM: 'mute',
  Tab: 'minimap',
  KeyO: 'options',
  Escape: 'options',
};

type DoubleTapState = {
  lastAt: number;
  lastDir: -1 | 0 | 1;
};

export class Input {
  private held = new Set<InputKey>();
  private pressedThisFrame = new Set<InputKey>();
  private releasedThisFrame = new Set<InputKey>();

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

  consumeDoubleTap(): -1 | 0 | 1 {
    const v = this.doubleTapTriggeredFor;
    this.doubleTapTriggeredFor = 0;
    return v;
  }

  axisX(): -1 | 0 | 1 {
    const l = this.held.has('left');
    const r = this.held.has('right');
    if (l === r) return 0;
    return l ? -1 : 1;
  }

  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }
}
