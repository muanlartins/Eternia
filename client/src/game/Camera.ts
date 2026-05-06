import type { Container } from 'pixi.js';

export class Camera {
  private targetX = 0;
  private targetY = 0;
  private shakeIntensity = 0;
  private shakeDurationMs = 0;
  private shakeElapsedMs = 0;

  constructor(
    private readonly stage: Container,
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
    private readonly lerpRate = 0.15,
  ) {}

  follow(
    worldX: number,
    worldY: number,
    minX?: number,
    maxX?: number,
  ) {
    let tx = worldX - this.viewportWidth / 2;
    const ty = worldY - this.viewportHeight / 2;
    if (minX !== undefined && tx < minX) tx = minX;
    if (maxX !== undefined && tx + this.viewportWidth > maxX) {
      tx = maxX - this.viewportWidth;
    }
    if (maxX !== undefined && minX !== undefined && maxX - minX < this.viewportWidth) {
      tx = minX + (maxX - minX - this.viewportWidth) / 2;
    }
    this.targetX = tx;
    this.targetY = ty;
  }

  getOffsetX(): number {
    return this.stage.x;
  }

  getOffsetY(): number {
    return this.stage.y;
  }

  shake(intensity: number, durationMs: number) {
    if (intensity * durationMs > this.shakeIntensity * (this.shakeDurationMs - this.shakeElapsedMs)) {
      this.shakeIntensity = intensity;
      this.shakeDurationMs = durationMs;
      this.shakeElapsedMs = 0;
    }
  }

  update(dtMs: number) {
    const t = 1 - Math.pow(1 - this.lerpRate, dtMs / (1000 / 60));
    this.stage.x += (-this.targetX - this.stage.x) * t;
    this.stage.y += (-this.targetY - this.stage.y) * t;

    if (this.shakeElapsedMs < this.shakeDurationMs) {
      this.shakeElapsedMs += dtMs;
      const remaining = Math.max(0, 1 - this.shakeElapsedMs / this.shakeDurationMs);
      const decay = remaining * remaining;
      const offsetX = (Math.random() * 2 - 1) * this.shakeIntensity * decay;
      const offsetY = (Math.random() * 2 - 1) * this.shakeIntensity * decay;
      this.stage.x += offsetX;
      this.stage.y += offsetY;
    }
  }
}
