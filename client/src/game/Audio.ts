export type HitIntensity = 'light' | 'medium' | 'heavy' | 'massive';

export type BgmId = 'forest' | 'deep' | 'boss';

interface BgmSpec {
  rootHz: number;
  bpm: number;
  melody: readonly number[];
  bass: readonly number[];
  voice: 'pluck' | 'pad' | 'aggressive';
  bassDurBeats: number;
}

const BGM_VOLUME = 0.55;

const BGM_SPECS: Record<BgmId, BgmSpec> = {
  forest: {
    rootHz: 220,
    bpm: 72,
    melody: [12, 15, 19, 15, 12, 19, 17, 12, 12, 15, 19, 22, 19, 17, 15, -1],
    bass: [-12, -1, -1, -1, -12, -1, -1, -1, -7, -1, -1, -1, -7, -1, -1, -1],
    voice: 'pluck',
    bassDurBeats: 4,
  },
  deep: {
    rootHz: 196,
    bpm: 60,
    melody: [12, -1, -1, 17, -1, -1, 15, -1, 12, -1, -1, 17, -1, -1, 14, -1],
    bass: [-12, -1, -1, -1, -1, -1, -1, -1, -10, -1, -1, -1, -1, -1, -1, -1],
    voice: 'pad',
    bassDurBeats: 8,
  },
  boss: {
    rootHz: 146.83,
    bpm: 110,
    melody: [12, 14, 15, 14, 17, 15, 14, 12, 12, 14, 15, 17, 19, 17, 15, 14],
    bass: [-12, -12, -7, -7, -12, -12, -10, -10, -12, -12, -7, -7, -12, -10, -7, -5],
    voice: 'aggressive',
    bassDurBeats: 1,
  },
};

export class GameAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private bgmGain: GainNode | null = null;
  private bgmSpecId: BgmId | null = null;
  private bgmStep = 0;
  private bgmTimerId: number | null = null;

  private ensureCtx() {
    if (!this.ctx) {
      const Ctor =
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
        AudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.bgmGain && this.ctx) {
      const ctx = this.ctx;
      const target = muted ? 0 : BGM_VOLUME;
      this.bgmGain.gain.cancelScheduledValues(ctx.currentTime);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.2);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(v: number) {
    this.ensureCtx();
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  playBgm(specId: BgmId) {
    if (this.bgmSpecId === specId) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    if (this.bgmGain) {
      const old = this.bgmGain;
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setValueAtTime(old.gain.value, ctx.currentTime);
      old.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
      window.setTimeout(() => {
        try {
          old.disconnect();
        } catch {
          /* ignore */
        }
      }, 800);
    }
    if (this.bgmTimerId !== null) {
      window.clearTimeout(this.bgmTimerId);
      this.bgmTimerId = null;
    }

    this.bgmSpecId = specId;
    this.bgmStep = 0;

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0, ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(
      this.muted ? 0 : BGM_VOLUME,
      ctx.currentTime + 1.0,
    );
    this.bgmGain.connect(this.masterGain);

    this.scheduleBgmStep();
  }

  stopBgm() {
    if (this.bgmTimerId !== null) {
      window.clearTimeout(this.bgmTimerId);
      this.bgmTimerId = null;
    }
    if (this.bgmGain && this.ctx) {
      const ctx = this.ctx;
      const old = this.bgmGain;
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setValueAtTime(old.gain.value, ctx.currentTime);
      old.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      window.setTimeout(() => {
        try {
          old.disconnect();
        } catch {
          /* ignore */
        }
      }, 700);
    }
    this.bgmGain = null;
    this.bgmSpecId = null;
  }

  private scheduleBgmStep() {
    if (this.bgmSpecId === null || !this.ctx || !this.bgmGain) return;
    const spec = BGM_SPECS[this.bgmSpecId];
    const beatDur = 60 / spec.bpm;
    const step = this.bgmStep % spec.melody.length;
    const melodyOff = spec.melody[step];
    const bassOff = spec.bass[step];

    if (melodyOff !== undefined && melodyOff >= 0) {
      const freq = spec.rootHz * Math.pow(2, melodyOff / 12);
      this.playBgmMelodyNote(freq, beatDur, spec.voice);
    }
    if (bassOff !== undefined && bassOff >= 0) {
      const freq = spec.rootHz * Math.pow(2, bassOff / 12);
      this.playBgmBassNote(freq, beatDur * spec.bassDurBeats);
    }

    this.bgmStep++;
    this.bgmTimerId = window.setTimeout(() => this.scheduleBgmStep(), beatDur * 1000);
  }

  private playBgmMelodyNote(freq: number, beatDur: number, voice: BgmSpec['voice']) {
    if (!this.ctx || !this.bgmGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = beatDur * (voice === 'pad' ? 1.4 : voice === 'aggressive' ? 0.5 : 0.7);

    const osc = ctx.createOscillator();
    osc.type = voice === 'pluck' ? 'triangle' : voice === 'pad' ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(voice === 'aggressive' ? 1900 : 1300, now);

    const gain = ctx.createGain();
    const peak = voice === 'pad' ? 0.06 : voice === 'aggressive' ? 0.09 : 0.07;
    const attack = voice === 'pad' ? 0.15 : 0.01;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter).connect(gain).connect(this.bgmGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  private playBgmBassNote(freq: number, dur: number) {
    if (!this.ctx || !this.bgmGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const noteDur = dur * 0.95;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + noteDur);

    osc.connect(gain).connect(this.bgmGain);
    osc.start(now);
    osc.stop(now + noteDur + 0.05);
  }

  playHit(intensity: HitIntensity) {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const params = {
      light: { freq: 280, drop: 140, gain: 0.16, dur: 0.1 },
      medium: { freq: 200, drop: 90, gain: 0.24, dur: 0.14 },
      heavy: { freq: 130, drop: 55, gain: 0.34, dur: 0.18 },
      massive: { freq: 90, drop: 38, gain: 0.45, dur: 0.24 },
    }[intensity];

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(params.freq, now);
    osc.frequency.exponentialRampToValueAtTime(params.drop, now + params.dur * 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + params.dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(params.gain, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.dur);

    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + params.dur + 0.05);
  }

  playParrySuccess() {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.06);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now);
    osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.5);
    osc2.start(now);
    osc2.stop(now + 0.5);
  }

  playPlayerHurt() {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playMobDeath(isBoss: boolean) {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (isBoss) {
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(120, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 1.0);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(80, now);
      osc2.frequency.exponentialRampToValueAtTime(28, now + 1.2);
      osc2.detune.setValueAtTime(15, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 1.0);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.55, now + 0.06);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain).connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 1.4);
      osc2.start(now);
      osc2.stop(now + 1.4);
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }

  playSkillCast(tier: number) {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const baseFreq = tier === 0 ? 330 : tier === 1 ? 440 : 550;
    const dur = tier === 0 ? 0.32 : tier === 1 ? 0.45 : 0.65;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + dur * 0.45);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(baseFreq * 0.5, now);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq, now + dur * 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + dur * 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    osc2.start(now);
    osc2.stop(now + dur + 0.05);
  }

  playJump() {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playDash() {
    if (this.muted) return;
    this.ensureCtx();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.12;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.setValueAtTime(2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.13);
  }
}
