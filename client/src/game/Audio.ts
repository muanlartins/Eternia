export type HitIntensity = 'light' | 'medium' | 'heavy' | 'massive';

export class GameAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;

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
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(v: number) {
    this.ensureCtx();
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
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
