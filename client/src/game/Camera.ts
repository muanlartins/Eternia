import type { Container } from 'pixi.js';

export class Camera {
  private targetX = 0;
  private targetY = 0;

  constructor(
    private readonly stage: Container,
    private readonly viewportWidth: number,
    private readonly viewportHeight: number,
    private readonly lerpRate = 0.15,
  ) {}

  follow(worldX: number, worldY: number) {
    this.targetX = worldX - this.viewportWidth / 2;
    this.targetY = worldY - this.viewportHeight / 2;
  }

  update(dtMs: number) {
    const t = 1 - Math.pow(1 - this.lerpRate, dtMs / (1000 / 60));
    this.stage.x += (-this.targetX - this.stage.x) * t;
    this.stage.y += (-this.targetY - this.stage.y) * t;
  }
}
