export type HitIntensity = 'light' | 'medium' | 'heavy' | 'massive';

export type BgmId =
  | 'forest'
  | 'deep'
  | 'boss'
  | 'bossRage'
  | 'swamp'
  | 'menu'
  | 'mission'
  | 'forestCombat';

import forestExploreUrl from '../assets/audio/bgm/forest-explore.mp3?url';
import forestCombatUrl from '../assets/audio/bgm/forest-combat.mp3?url';
import menuAmbientUrl from '../assets/audio/bgm/menu-ambient.mp3?url';
import missionSelectUrl from '../assets/audio/bgm/mission-select.mp3?url';

const BGM_URLS: Record<BgmId, string> = {
  forest: forestExploreUrl,
  forestCombat: forestCombatUrl,
  deep: forestCombatUrl,
  boss: forestCombatUrl,
  bossRage: forestCombatUrl,
  swamp: forestExploreUrl,
  menu: menuAmbientUrl,
  mission: missionSelectUrl,
};

const SFX_VOLUME_BOOST: Record<string, number> = {
  'beast-step': 3.0,
  'beast-hit': 3.0,
};

const SFX_GLOB = import.meta.glob('../assets/audio/sfx/*.wav', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const SFX_URLS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(SFX_GLOB)) {
    const match = path.match(/([^/]+)\.wav$/);
    if (match) out[match[1]!] = url;
  }
  return out;
})();

const SETTINGS_KEY = 'eternia.audio.v1';

interface AudioSettings {
  master: number;
  bgm: number;
  sfx: number;
  muted: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = { master: 0.4, bgm: 0.7, sfx: 1.0, muted: false };

function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    const clamp01 = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
    return {
      master: clamp01(parsed.master) ?? DEFAULT_SETTINGS.master,
      bgm: clamp01(parsed.bgm) ?? DEFAULT_SETTINGS.bgm,
      sfx: clamp01(parsed.sfx) ?? DEFAULT_SETTINGS.sfx,
      muted: parsed.muted === true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveAudioSettings(s: AudioSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export class GameAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;

  private settings: AudioSettings;

  private sfxBuffers = new Map<string, AudioBuffer>();
  private bgmAudioEl: HTMLAudioElement | null = null;
  private bgmAudioSource: MediaElementAudioSourceNode | null = null;
  private bgmAudioGain: GainNode | null = null;
  private bgmFileId: BgmId | null = null;
  private sfxLibraryLoaded = false;

  constructor() {
    this.settings = loadAudioSettings();
  }

  async preloadSfxLibrary(): Promise<void> {
    if (this.sfxLibraryLoaded) return;
    this.ensureCtx();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const entries = Object.entries(SFX_URLS);
    await Promise.all(
      entries.map(async ([name, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          this.sfxBuffers.set(name, audioBuf);
        } catch (err) {
          console.warn(`[GameAudio] failed to preload sfx '${name}':`, err);
        }
      }),
    );
    this.sfxLibraryLoaded = true;
  }

  playSfx(name: string, volumeMul = 1): void {
    if (this.settings.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.sfxBus) return;
    const buffer = this.sfxBuffers.get(name);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.value = volumeMul * (SFX_VOLUME_BOOST[name] ?? 1);

    source.connect(gain).connect(this.sfxBus);
    source.start();
  }

  playBgm(id: BgmId): void {
    if (this.bgmFileId === id) return;
    this.ensureCtx();
    if (!this.ctx || !this.bgmBus) return;
    const url = BGM_URLS[id];
    if (!url) return;
    const ctx = this.ctx;

    if (this.bgmAudioGain && this.bgmAudioEl) {
      const oldGain = this.bgmAudioGain;
      const oldEl = this.bgmAudioEl;
      const oldSrc = this.bgmAudioSource;
      oldGain.gain.cancelScheduledValues(ctx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
      window.setTimeout(() => {
        try {
          oldEl.pause();
          oldSrc?.disconnect();
          oldGain.disconnect();
        } catch {
          /* ignore */
        }
      }, 800);
    }

    const audio = new Audio(url);
    audio.loop = true;
    audio.crossOrigin = 'anonymous';
    const source = ctx.createMediaElementSource(audio);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.0);
    source.connect(gain).connect(this.bgmBus);

    audio.play().catch((err) => {
      console.warn('[GameAudio] BGM play() failed (autoplay policy?):', err);
    });

    this.bgmAudioEl = audio;
    this.bgmAudioSource = source;
    this.bgmAudioGain = gain;
    this.bgmFileId = id;
  }

  stopBgm(): void {
    if (this.bgmAudioGain && this.bgmAudioEl && this.ctx) {
      const ctx = this.ctx;
      const oldGain = this.bgmAudioGain;
      const oldEl = this.bgmAudioEl;
      const oldSrc = this.bgmAudioSource;
      oldGain.gain.cancelScheduledValues(ctx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      window.setTimeout(() => {
        try {
          oldEl.pause();
          oldSrc?.disconnect();
          oldGain.disconnect();
        } catch {
          /* ignore */
        }
      }, 600);
    }
    this.bgmAudioEl = null;
    this.bgmAudioSource = null;
    this.bgmAudioGain = null;
    this.bgmFileId = null;
  }

  private ensureCtx() {
    if (!this.ctx) {
      const Ctor =
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
        AudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.master;
      this.masterGain.connect(this.ctx.destination);

      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = this.settings.bgm;
      this.bgmBus.connect(this.masterGain);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.settings.sfx;
      this.sfxBus.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private persist() {
    saveAudioSettings(this.settings);
  }

  setMuted(muted: boolean) {
    this.settings.muted = muted;
    this.persist();
    if (this.masterGain && this.ctx) {
      const ctx = this.ctx;
      const target = muted ? 0 : this.settings.master;
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.15);
    }
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  setMasterVolume(v: number) {
    this.settings.master = Math.max(0, Math.min(1, v));
    this.persist();
    if (this.masterGain && this.ctx && !this.settings.muted) {
      const ctx = this.ctx;
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.settings.master, ctx.currentTime + 0.05);
    }
  }

  setBgmVolume(v: number) {
    this.settings.bgm = Math.max(0, Math.min(1, v));
    this.persist();
    if (this.bgmBus && this.ctx) {
      const ctx = this.ctx;
      this.bgmBus.gain.cancelScheduledValues(ctx.currentTime);
      this.bgmBus.gain.setValueAtTime(this.bgmBus.gain.value, ctx.currentTime);
      this.bgmBus.gain.linearRampToValueAtTime(this.settings.bgm, ctx.currentTime + 0.05);
    }
  }

  setSfxVolume(v: number) {
    this.settings.sfx = Math.max(0, Math.min(1, v));
    this.persist();
    if (this.sfxBus && this.ctx) {
      const ctx = this.ctx;
      this.sfxBus.gain.cancelScheduledValues(ctx.currentTime);
      this.sfxBus.gain.setValueAtTime(this.sfxBus.gain.value, ctx.currentTime);
      this.sfxBus.gain.linearRampToValueAtTime(this.settings.sfx, ctx.currentTime + 0.05);
    }
  }

  getMasterVolume(): number {
    return this.settings.master;
  }

  getBgmVolume(): number {
    return this.settings.bgm;
  }

  getSfxVolume(): number {
    return this.settings.sfx;
  }

  setVolume(v: number) {
    this.setMasterVolume(v);
  }

  playHit(intensity: HitIntensity): void {
    void intensity;
    this.playSfx('arrow-hit-flesh');
  }

  playParrySuccess(): void {
    this.playSfx('parry-clang');
  }

  playPlayerHurt(): void {
    this.playSfx('hit-taken-grunt');
  }

  playMobDeath(isBoss: boolean): void {
    if (isBoss) {
      this.playSfx('victory-sting', 0.7);
    } else {
      this.playSfx('beast-death');
    }
  }

  playSkillCast(tier: number): void {
    void tier;
    this.playSfx('bow-shoot');
  }

  playJump(): void {
    this.playSfx('jump');
  }

  playDash(): void {
    this.playSfx('dash');
  }

  playBossPhase2(): void {
    this.playSfx('victory-sting', 0.6);
  }

  playBowDraw(): void { this.playSfx('bow-draw'); }
  playBowShoot(): void { this.playSfx('bow-shoot'); }
  playArrowFlight(): void { this.playSfx('arrow-flight'); }
  playArrowHitFlesh(): void { this.playSfx('arrow-hit-flesh'); }
  playArrowHitWood(): void { this.playSfx('arrow-hit-wood'); }
  playLand(): void { this.playSfx('land'); }
  playRollDodge(): void { this.playSfx('roll-dodge'); }
  playNaiaDeath(): void { this.playSfx('naia-death'); }

  private footstepIdx = 0;
  playFootstep(): void {
    this.footstepIdx = (this.footstepIdx + 1) % 4;
    this.playSfx(`footstep-grass-${this.footstepIdx + 1}`);
  }

  playSpriteJab(): void { this.playSfx('sprite-jab'); }
  playSpriteHop(): void { this.playSfx('sprite-hop'); }
  playSpriteHit(): void { this.playSfx('sprite-hit'); }
  playSpriteDeath(): void { this.playSfx('sprite-death'); }
  playBeastStep(): void { this.playSfx('beast-step'); }
  playBeastThorn(): void { this.playSfx('beast-thorn-launch'); }
  playBeastHit(): void { this.playSfx('beast-hit'); }
  playBeastDeath(): void { this.playSfx('beast-death'); }

  playStageIntro(): void { this.playSfx('stage-intro'); }
  playStageClear(): void { this.playSfx('stage-clear'); }
  playPortalOpen(): void { this.playSfx('portal-open'); }
  playVictorySting(): void { this.playSfx('victory-sting'); }
  playDefeatSting(): void { this.playSfx('defeat-sting'); }

  playUiHover(): void { this.playSfx('ui-hover'); }
  playUiClick(): void { this.playSfx('ui-click'); }
  playUiConfirm(): void { this.playSfx('ui-confirm'); }
  playUiCancel(): void { this.playSfx('ui-cancel'); }
  playCardPickup(): void { this.playSfx('card-pickup'); }
}
