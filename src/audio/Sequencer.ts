// Look-ahead scheduler: plays the procedural song on a 16th-note grid.

import { BARS_PER_LEVEL, BEATS_PER_BAR } from '../config';
import { Conductor } from './Conductor';
import { noteFreq, Song } from './Song';
import { Synth } from './Synth';

const LOOKAHEAD = 0.15; // seconds
const TICK_MS = 25;

export class Sequencer {
  private step = 0; // global 16th-note index
  private timer: number | undefined;

  constructor(
    private readonly song: Song,
    private readonly synth: Synth,
    private readonly conductor: Conductor,
    /** Which music layers the player has unlocked (0-4), and fever state. */
    private readonly mix: () => { layer: number; fever: boolean },
  ) {}

  start(): void {
    this.step = 0;
    this.stop();
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  stop(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
  }

  private schedule(): void {
    const ctx = this.synth.ctx;
    if (ctx.state !== 'running') return;
    for (;;) {
      const beat = this.step / 4;
      const at = this.conductor.ctxTimeFor(this.song.tempo.timeAt(beat));
      if (at > ctx.currentTime + LOOKAHEAD) break;
      if (at >= ctx.currentTime - 0.02) this.playStep(this.step, at);
      this.step++;
    }
  }

  private playStep(globalStep: number, t: number): void {
    const s = this.synth;
    const song = this.song;
    const stepsPerBar = BEATS_PER_BAR * 4;
    const bar = Math.floor(globalStep / stepsPerBar);
    const step = globalStep % stepsPerBar;
    const intensity = song.intensityAtBar(bar);
    const level = song.levelAtBar(bar);
    const chord = song.chordAtBar(bar);
    const beatDur = 60 / song.tempo.bpmAt(globalStep / 4);
    const sixteenth = beatDur / 4;
    const lastBarOfLevel = (bar + 1) % BARS_PER_LEVEL === 0;
    const { layer: unlocked, fever } = this.mix();
    const layer = fever ? 4 : unlocked;

    // Layer 0 — drums, always on.
    if (step % 4 === 0 && (intensity >= 1 || step === 0 || step === 8)) s.kick(t);
    if (intensity >= 1 && (step === 4 || step === 12)) s.snare(t);
    if (intensity >= 2 && lastBarOfLevel && step >= 12) s.snare(t, 0.4 + (step - 12) * 0.2);
    if (step % 2 === 0) {
      s.hat(t, step % 4 === 2 ? 1 : 0.5, (intensity >= 2 || fever) && step % 4 === 2);
    } else if (intensity >= 2 && layer >= 2) {
      s.hat(t, 0.35);
    }

    // Layer 1 — bass: pumping eighths following the chord root.
    if (layer >= 1 && step % 2 === 0) {
      const octave = step % 4 === 2 && intensity >= 1 ? 12 : 0;
      s.bass(t, noteFreq(chord.root + octave - 12), sixteenth * 1.6);
    }

    // Layer 2 — chord pad.
    if (layer >= 2 && step === 0) {
      const freqs = chord.tones.map((tone) => noteFreq(chord.root + tone + 12));
      s.pad(t, freqs, beatDur * 3.5);
    }

    // Layer 3 — lead melody.
    if (layer >= 3 && intensity >= 1) {
      const phrase = song.melody(level);
      const note = phrase[(bar % 2) * 16 + step];
      if (note !== null) {
        const up = layer >= 4 || intensity === 3 ? 24 : 12;
        s.lead(t, noteFreq(note + up), sixteenth * 1.8);
      }
    }

    // Layer 4 — sparkling arpeggio (and extra drive in Super Express).
    if (layer >= 4 && step % 2 === 1) {
      const tones = [...chord.tones, 12];
      const tone = tones[((step - 1) / 2) % tones.length];
      s.lead(t, noteFreq(chord.root + tone + 36), sixteenth * 0.8);
    }
    if (fever && step % 4 === 2) s.snare(t, 0.25);
  }
}
