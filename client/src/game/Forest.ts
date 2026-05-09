import { Assets, type Texture } from 'pixi.js';

import bgCanopyUrl from '../assets/floresta/bg-canopy.jpeg';
import bgMidUrl from '../assets/floresta/bg-mid.jpeg';
import bgFarUrl from '../assets/floresta/bg-far.jpeg';
import foregroundVinesUrl from '../assets/floresta/foreground-vines.jpeg';
import platformSmallUrl from '../assets/floresta/platform-small.png';
import platformMediumUrl from '../assets/floresta/platform-medium.png';
import platformLargeUrl from '../assets/floresta/platform-large.png';
import platformPillarUrl from '../assets/floresta/platform-pillar.png';
import groundAUrl from '../assets/floresta/ground-tile-a.png';
import groundBUrl from '../assets/floresta/ground-tile-b.png';
import groundCUrl from '../assets/floresta/ground-tile-c.png';

const URLS = {
  bgCanopy: bgCanopyUrl,
  bgMid: bgMidUrl,
  bgFar: bgFarUrl,
  foregroundVines: foregroundVinesUrl,
  platformSmall: platformSmallUrl,
  platformMedium: platformMediumUrl,
  platformLarge: platformLargeUrl,
  platformPillar: platformPillarUrl,
  groundA: groundAUrl,
  groundB: groundBUrl,
  groundC: groundCUrl,
} as const;

export type ForestAssetKey = keyof typeof URLS;

const cache = new Map<ForestAssetKey, Texture>();
let loadPromise: Promise<void> | null = null;

export function loadForestArt(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const entries = Object.entries(URLS) as [ForestAssetKey, string][];
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const tex = (await Assets.load(url)) as Texture;
          cache.set(key, tex);
        } catch (err) {
          console.warn(`[Forest] failed to load ${key}:`, err);
        }
      }),
    );
  })();
  return loadPromise;
}

export function forestTexture(key: ForestAssetKey): Texture | null {
  return cache.get(key) ?? null;
}

export function platformVariantFor(w: number, h: number): ForestAssetKey {
  if (h > w) return 'platformPillar';
  if (w < 220) return 'platformSmall';
  if (w > 460) return 'platformLarge';
  return 'platformMedium';
}

export function groundVariantFor(seed: number): ForestAssetKey {
  const r = ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  if (r < 0.6) return 'groundA';
  if (r < 0.85) return 'groundB';
  return 'groundC';
}
