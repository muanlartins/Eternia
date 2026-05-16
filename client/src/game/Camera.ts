import type { Container } from 'pixi.js';

export class Camera {
  private targetX = 0;
  private targetY = 0;
  private shakeIntensity = 0;
  private shakeDurationMs = 0;
  private shakeElapsedMs = 0;

  private zoom: number;

  constructor(
    private readonly stage: Container,
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
    private readonly lerpRate = 0.08,
    zoom = 1,
  ) {
    this.zoom = zoom;
    if (zoom !== 1) stage.scale.set(zoom);
  }

  setZoom(z: number) {
    this.zoom = z;
    this.stage.scale.set(z);
  }

  follow(
    worldX: number,
    worldY: number,
    minX?: number,
    maxX?: number,
    minY?: number,
    maxY?: number,
  ) {
    const sx = worldX * this.zoom;
    const sy = worldY * this.zoom;
    const sMinX = minX !== undefined ? minX * this.zoom : undefined;
    const sMaxX = maxX !== undefined ? maxX * this.zoom : undefined;
    const sMinY = minY !== undefined ? minY * this.zoom : undefined;
    const sMaxY = maxY !== undefined ? maxY * this.zoom : undefined;

    let tx = sx - this.viewportWidth / 2;
    let ty = sy - this.viewportHeight / 2;
    if (sMinX !== undefined && tx < sMinX) tx = sMinX;
    if (sMaxX !== undefined && tx + this.viewportWidth > sMaxX) {
      tx = sMaxX - this.viewportWidth;
    }
    if (sMaxX !== undefined && sMinX !== undefined && sMaxX - sMinX < this.viewportWidth) {
      tx = sMinX + (sMaxX - sMinX - this.viewportWidth) / 2;
    }
    if (sMinY !== undefined && ty < sMinY) ty = sMinY;
    if (sMaxY !== undefined && ty + this.viewportHeight > sMaxY) {
      ty = sMaxY - this.viewportHeight;
    }
    if (sMaxY !== undefined && sMinY !== undefined && sMaxY - sMinY < this.viewportHeight) {
      ty = sMinY + (sMaxY - sMinY - this.viewportHeight) / 2;
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
