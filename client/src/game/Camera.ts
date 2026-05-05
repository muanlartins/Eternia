// Smooth-follow camera. Lerps toward the target each frame.

import type { Container } from 'pixi.js';

export class Camera {
  private targetX = 0;
  private targetY = 0;

  constructor(
    private readonly stage: Container,
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
    private readonly lerpRate = 0.15, // 0..1 per frame
  ) {}

  follow(worldX: number, worldY: number) {
    this.targetX = worldX - this.viewportWidth / 2;
    this.targetY = worldY - this.viewportHeight / 2;
  }

  /** Apply smoothing each frame. dtMs used for frame-rate independence. */
  update(dtMs: number) {
    // Convert lerpRate (per-frame at 60fps) to time-based for frame-rate independence.
    const t = 1 - Math.pow(1 - this.lerpRate, dtMs / (1000 / 60));
    this.stage.x += (-this.targetX - this.stage.x) * t;
    this.stage.y += (-this.targetY - this.stage.y) * t;
  }
}
