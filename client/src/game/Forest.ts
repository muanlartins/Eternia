import { Assets, type Texture } from 'pixi.js';

import bgCanopyUrl from '../assets/floresta/bg-canopy.jpeg';
import bgMidUrl from '../assets/floresta/bg-mid.jpeg';
import bgFarUrl from '../assets/floresta/bg-far.jpeg';

const URLS = {
  bgCanopy: bgCanopyUrl,
  bgMid: bgMidUrl,
  bgFar: bgFarUrl,
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
