/**
 * Shader configuration shared by ThreePilot (editor), GameThreeLayer (in-game),
 * and the floating shader-dev-panel. Each model has its own preset persisted to
 * localStorage under `eternia.shader.<modelId>`.
 */

export interface ShaderConfig {
  toonEnabled: boolean;
  outlineEnabled: boolean;
  toneExposure: number;
  outlineThickness: number;
  outlineAlpha: number;
  outlineColor: string;
  keyIntensity: number;
  rimIntensity: number;
  hemiIntensity: number;
  fillIntensity: number;
  keyDirX: number;
  keyDirY: number;
  keyDirZ: number;
  keyColor: string;
  rimColor: string;
  hemiSkyColor: string;
  hemiGroundColor: string;
  fillColor: string;
  toonBand0: number;
  toonBand1: number;
  toonBand2: number;
}

export const DEFAULT_SHADER_CONFIG: ShaderConfig = {
  toonEnabled: true,
  outlineEnabled: true,
  toneExposure: 0.9,
  outlineThickness: 0.0035,
  outlineAlpha: 0.95,
  outlineColor: '#000000',
  keyIntensity: 0.85,
  rimIntensity: 2,
  hemiIntensity: 2,
  fillIntensity: 2,
  keyDirX: 2.5,
  keyDirY: 4,
  keyDirZ: 3,
  keyColor: '#fff1d6',
  rimColor: '#6abf95',
  hemiSkyColor: '#8fc7a4',
  hemiGroundColor: '#140d10',
  fillColor: '#d4a574',
  toonBand0: 60,
  toonBand1: 180,
  toonBand2: 240,
};

const LS_PREFIX = 'eternia.shader.';

export function shaderConfigKey(modelId: string): string {
  return LS_PREFIX + modelId;
}

export function loadShaderConfig(modelId: string): ShaderConfig {
  try {
    const raw = localStorage.getItem(shaderConfigKey(modelId));
    if (!raw) return { ...DEFAULT_SHADER_CONFIG };
    const parsed = JSON.parse(raw) as Partial<ShaderConfig>;
    return { ...DEFAULT_SHADER_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_SHADER_CONFIG };
  }
}

export function saveShaderConfig(modelId: string, cfg: ShaderConfig): void {
  try {
    localStorage.setItem(shaderConfigKey(modelId), JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}
