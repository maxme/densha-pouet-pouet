// All sounds are synthesized with the Web Audio API: no audio files needed.

export class Synth {
  readonly ctx: AudioContext;
  readonly music: GainNode;
  readonly sfx: GainNode;
  private noise: AudioBuffer;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp);
    this.music = ctx.createGain();
    this.music.gain.value = 0.7;
    this.music.connect(master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(master);

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  private env(t: number, peak: number, decay: number, dest: AudioNode, attack = 0.002): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest);
    return g;
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, dest: AudioNode): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private noiseSrc(t: number, dur: number, dest: AudioNode): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
    return s;
  }

  kick(t: number, vol = 1): void {
    const g = this.env(t, 0.9 * vol, 0.28, this.music);
    const o = this.osc('sine', 160, t, 0.3, g);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  }

  snare(t: number, vol = 1): void {
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    hp.connect(this.env(t, 0.45 * vol, 0.14, this.music));
    this.noiseSrc(t, 0.16, hp);
    this.osc('triangle', 190, t, 0.08, this.env(t, 0.3 * vol, 0.07, this.music));
  }

  hat(t: number, vol = 1, open = false): void {
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    hp.connect(this.env(t, 0.16 * vol, open ? 0.14 : 0.035, this.music));
    this.noiseSrc(t, open ? 0.16 : 0.05, hp);
  }

  bass(t: number, freq: number, dur: number): void {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(220, t + dur);
    lp.connect(this.env(t, 0.32, dur, this.music));
    this.osc('sawtooth', freq, t, dur, lp);
  }

  lead(t: number, freq: number, dur: number): void {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.connect(this.env(t, 0.07, dur, this.music, 0.005));
    this.osc('square', freq, t, dur, lp);
    this.osc('square', freq * 1.005, t, dur, lp);
  }

  pad(t: number, freqs: number[], dur: number): void {
    const g = this.env(t, 0.05, dur, this.music, 0.06);
    for (const f of freqs) this.osc('triangle', f, t, dur, g);
  }

  /** The train horn: "pouet!" — a two-note chord with a little pitch dip. */
  horn(freqA: number, freqB: number, strength = 1): void {
    const t = this.ctx.currentTime;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const g = this.env(t, 0.13 * strength, 0.16, this.sfx, 0.008);
    lp.connect(g);
    for (const f of [freqA, freqB]) {
      const o = this.osc('square', f * 1.03, t, 0.2, lp);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    }
  }

  pickup(baseFreq: number): void {
    const t = this.ctx.currentTime;
    [1, 1.25, 1.5, 2].forEach((m, i) => {
      const tt = t + i * 0.035;
      this.osc('sine', baseFreq * m, tt, 0.08, this.env(tt, 0.12, 0.08, this.sfx));
    });
  }

  crash(): void {
    const t = this.ctx.currentTime;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4000, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    lp.connect(this.env(t, 0.6, 0.5, this.sfx));
    this.noiseSrc(t, 0.55, lp);
    const o = this.osc('sawtooth', 120, t, 0.4, this.env(t, 0.35, 0.4, this.sfx));
    o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
  }

  bump(): void {
    const t = this.ctx.currentTime;
    this.osc('square', 70, t, 0.06, this.env(t, 0.15, 0.06, this.sfx));
  }

  levelUp(): void {
    const t = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => {
      const tt = t + i * 0.07;
      this.osc('square', f, tt, 0.12, this.env(tt, 0.06, 0.12, this.sfx));
    });
  }
}
