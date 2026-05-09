import { Container, Graphics, TilingSprite } from 'pixi.js';
import { forestTexture } from './Forest.js';

interface Palette {
  readonly skyTop: number;
  readonly skyBottom: number;
  readonly far: number;
  readonly mid: number;
  readonly accent: number;
}

const PALETTES: Record<string, Palette> = {
  default: {
    skyTop: 0x0d1018,
    skyBottom: 0x1a2638,
    far: 0x1a2030,
    mid: 0x223040,
    accent: 0x3a5a72,
  },
  forest: {
    skyTop: 0x0a1410,
    skyBottom: 0x1a2820,
    far: 0x152018,
    mid: 0x1f3326,
    accent: 0x3d6446,
  },
  deep: {
    skyTop: 0x070a0e,
    skyBottom: 0x121e18,
    far: 0x0e1614,
    mid: 0x172319,
    accent: 0x2a4a32,
  },
  boss: {
    skyTop: 0x180810,
    skyBottom: 0x301420,
    far: 0x261020,
    mid: 0x371624,
    accent: 0x782e3e,
  },
  swamp: {
    skyTop: 0x0a120e,
    skyBottom: 0x1a261e,
    far: 0x14201c,
    mid: 0x1f2e26,
    accent: 0x3a6048,
  },
  swampBoss: {
    skyTop: 0x0a141c,
    skyBottom: 0x182838,
    far: 0x132030,
    mid: 0x1f2c3e,
    accent: 0x4a6890,
  },
};

export class Background {
  readonly container = new Container();
  private skyLayer: Graphics;
  private starLayer: Graphics;
  private farLayer: Graphics;
  private midLayer: Graphics;

  private paintedFar: TilingSprite | null = null;
  private paintedMid: TilingSprite | null = null;
  private paintedCanopy: TilingSprite | null = null;

  private currentPaletteId: string | null = null;
  private readonly gameW: number;
  private readonly gameH: number;

  constructor(gameW: number, gameH: number) {
    this.gameW = gameW;
    this.gameH = gameH;
    this.skyLayer = new Graphics();
    this.starLayer = new Graphics();
    this.farLayer = new Graphics();
    this.midLayer = new Graphics();
    this.container.addChild(this.skyLayer);
    this.container.addChild(this.starLayer);
    this.container.addChild(this.farLayer);
    this.container.addChild(this.midLayer);
    this.setStage('default');
  }

  private ensurePaintedForest(): void {
    if (this.paintedFar && this.paintedMid && this.paintedCanopy) return;

    const farTex = forestTexture('bgFar');
    const midTex = forestTexture('bgMid');
    const canopyTex = forestTexture('bgCanopy');
    if (!farTex || !midTex || !canopyTex) return;

    if (!this.paintedFar) {
      this.paintedFar = new TilingSprite({
        texture: farTex,
        width: this.gameW,
        height: this.gameH,
      });
      this.paintedFar.tileScale.set(this.gameH / farTex.height);
      this.container.addChild(this.paintedFar);
    }
    if (!this.paintedMid) {
      this.paintedMid = new TilingSprite({
        texture: midTex,
        width: this.gameW,
        height: this.gameH,
      });
      this.paintedMid.tileScale.set(this.gameH / midTex.height);
      this.container.addChild(this.paintedMid);
    }
    if (!this.paintedCanopy) {
      this.paintedCanopy = new TilingSprite({
        texture: canopyTex,
        width: this.gameW,
        height: this.gameH,
      });
      this.paintedCanopy.tileScale.set(this.gameH / canopyTex.height);
      this.container.addChild(this.paintedCanopy);
    }
  }

  private isForestPalette(paletteId: string): boolean {
    return paletteId === 'forest' || paletteId === 'deep' || paletteId === 'boss';
  }

  private setProceduralVisible(visible: boolean): void {
    this.skyLayer.visible = visible;
    this.starLayer.visible = visible;
    this.farLayer.visible = visible;
    this.midLayer.visible = visible;
  }

  private setPaintedForestVisible(visible: boolean): void {
    if (this.paintedFar) this.paintedFar.visible = visible;
    if (this.paintedMid) this.paintedMid.visible = visible;
    if (this.paintedCanopy) this.paintedCanopy.visible = visible;
  }

  setStage(stageId: string) {
    const paletteId = this.paletteIdFor(stageId);
    const palette = PALETTES[paletteId] ?? PALETTES.default!;

    if (this.isForestPalette(paletteId)) {
      this.ensurePaintedForest();
      if (this.paintedFar) {
        this.setProceduralVisible(false);
        this.setPaintedForestVisible(true);
        this.currentPaletteId = paletteId;
        return;
      }
    } else {
      this.setPaintedForestVisible(false);
      this.setProceduralVisible(true);
    }

    if (this.currentPaletteId === paletteId) return;
    this.currentPaletteId = paletteId;
    this.redraw(palette);
  }

  private paletteIdFor(stageId: string): string {
    const lower = stageId.toLowerCase();
    if (lower === 'swamp-1-2') return 'swampBoss';
    if (lower.startsWith('swamp')) return 'swamp';
    if (lower === 'forest-1-4') return 'boss';
    if (lower.includes('1-3') || lower.includes('profunda')) return 'deep';
    if (lower.includes('forest')) return 'forest';
    return 'default';
  }

  private redraw(palette: Palette) {
    this.skyLayer.clear();
    const halves = 12;
    for (let i = 0; i < halves; i++) {
      const t = i / (halves - 1);
      const r = lerp((palette.skyTop >> 16) & 0xff, (palette.skyBottom >> 16) & 0xff, t);
      const g = lerp((palette.skyTop >> 8) & 0xff, (palette.skyBottom >> 8) & 0xff, t);
      const b = lerp(palette.skyTop & 0xff, palette.skyBottom & 0xff, t);
      const color = (r << 16) | (g << 8) | b;
      const yStart = (i / halves) * this.gameH;
      const yEnd = ((i + 1) / halves) * this.gameH;
      this.skyLayer.rect(0, yStart, this.gameW, yEnd - yStart).fill({ color });
    }

    this.starLayer.clear();
    const seed = mulberry32(424242);
    const starCount = 60;
    for (let i = 0; i < starCount; i++) {
      const x = seed() * this.gameW;
      const y = seed() * this.gameH * 0.55;
      const r = 0.6 + seed() * 0.9;
      const alpha = 0.3 + seed() * 0.55;
      this.starLayer.circle(x, y, r).fill({ color: 0xffffff, alpha });
    }

    this.farLayer.clear();
    const horizonY = 380;
    const farSeed = mulberry32(8675309);
    let cx = -400;
    while (cx < 4000) {
      const w = 80 + farSeed() * 120;
      const h = 50 + farSeed() * 60;
      const peakX = cx + w / 2;
      const peakY = horizonY - h;
      this.farLayer
        .poly([cx, horizonY + 40, peakX, peakY, cx + w, horizonY + 40])
        .fill({ color: palette.far, alpha: 0.95 });
      cx += w * 0.6;
    }

    this.midLayer.clear();
    const groundY = 480;
    const midSeed = mulberry32(13371337);
    let mx = -200;
    while (mx < 4000) {
      const trunkW = 6 + midSeed() * 4;
      const trunkH = 30 + midSeed() * 20;
      const trunkTopY = groundY - trunkH;
      this.midLayer
        .rect(mx, trunkTopY, trunkW, trunkH)
        .fill({ color: 0x1a1010, alpha: 0.9 });
      const crownR = 14 + midSeed() * 10;
      const crownCY = trunkTopY - crownR * 0.4;
      this.midLayer
        .circle(mx + trunkW / 2, crownCY, crownR)
        .fill({ color: palette.mid, alpha: 0.95 });
      const detailR = crownR * 0.55;
      this.midLayer
        .circle(mx + trunkW / 2 - 4, crownCY + 3, detailR)
        .fill({ color: palette.accent, alpha: 0.4 });
      mx += trunkW + 18 + midSeed() * 22;
    }
  }

  update(cameraOffsetX: number, cameraOffsetY: number) {
    this.skyLayer.x = 0;
    this.skyLayer.y = 0;
    this.starLayer.x = 0;
    this.starLayer.y = 0;
    this.farLayer.x = cameraOffsetX * 0.18;
    this.farLayer.y = cameraOffsetY * 0.5;
    this.midLayer.x = cameraOffsetX * 0.5;
    this.midLayer.y = cameraOffsetY;

    if (this.paintedFar) {
      this.paintedFar.tilePosition.x = cameraOffsetX * 0.15;
      this.paintedFar.tilePosition.y = cameraOffsetY * 0.5;
    }
    if (this.paintedMid) {
      this.paintedMid.tilePosition.x = cameraOffsetX * 0.4;
      this.paintedMid.tilePosition.y = cameraOffsetY * 0.7;
    }
    if (this.paintedCanopy) {
      this.paintedCanopy.tilePosition.x = cameraOffsetX * 0.7;
      this.paintedCanopy.tilePosition.y = cameraOffsetY * 0.9;
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
