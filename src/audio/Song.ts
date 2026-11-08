// Procedural song: structure, harmony and melody, shared by the sequencer
// (what you hear) and the chart generator (what you play).

import {
  BARS_PER_LEVEL,
  BASE_BPM,
  BEATS_PER_BAR,
  BEATS_PER_LEVEL,
  BPM_STEP,
  MAX_BPM,
} from '../config';
import { makeRng } from '../rng';
import { TempoMap } from './TempoMap';

/** 0 = calm, 1 = groove, 2 = build, 3 = full throttle. */
export type Intensity = 0 | 1 | 2 | 3;

const SECTION_SHAPE: Intensity[] = [0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];

interface Chord {
  root: number; // semitones above A
  tones: number[]; // semitone offsets from root
}

// Am - F - C - G : the classic anthem loop.
const PROGRESSION: Chord[] = [
  { root: 0, tones: [0, 3, 7] },
  { root: -4, tones: [0, 4, 7] },
  { root: 3, tones: [0, 4, 7] },
  { root: -2, tones: [0, 4, 7] },
];

// A minor pentatonic, two octaves.
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];

const A2 = 110;

export function noteFreq(semitonesFromA2: number): number {
  return A2 * Math.pow(2, semitonesFromA2 / 12);
}

export class Song {
  readonly tempo: TempoMap;
  private melodies = new Map<number, (number | null)[]>();

  constructor(readonly seed: number) {
    this.tempo = new TempoMap(BASE_BPM);
    for (let level = 1; level < 64; level++) {
      const bpm = Math.min(MAX_BPM, BASE_BPM + level * BPM_STEP);
      this.tempo.addChange(level * BEATS_PER_LEVEL, bpm);
    }
  }

  levelAtBar(bar: number): number {
    return Math.floor(bar / BARS_PER_LEVEL) + 1;
  }

  levelAtBeat(beat: number): number {
    return this.levelAtBar(Math.floor(beat / BEATS_PER_BAR));
  }

  intensityAtBar(bar: number): Intensity {
    if (bar < 0) return 0;
    return SECTION_SHAPE[bar % BARS_PER_LEVEL];
  }

  intensityAtBeat(beat: number): Intensity {
    return this.intensityAtBar(Math.floor(beat / BEATS_PER_BAR));
  }

  chordAtBar(bar: number): Chord {
    return PROGRESSION[((bar % 4) + 4) % 4];
  }

  /** Two-bar melodic phrase (32 sixteenth steps) for a level; null = rest. */
  melody(level: number): (number | null)[] {
    let m = this.melodies.get(level);
    if (!m) {
      const rng = makeRng(this.seed * 31 + level * 977);
      m = [];
      let idx = 4;
      for (let step = 0; step < 32; step++) {
        const strong = step % 4 === 0;
        const eighth = step % 2 === 0;
        const p = strong ? 0.75 : eighth ? 0.45 : 0.12;
        if (rng() < p) {
          idx = Math.max(0, Math.min(PENTA.length - 1, idx + Math.floor(rng() * 5) - 2));
          m.push(PENTA[idx]);
        } else {
          m.push(null);
        }
      }
      this.melodies.set(level, m);
    }
    return m;
  }

  /** Two notes (semitones from A2) for the horn, matching the current chord. */
  hornNotes(bar: number): [number, number] {
    const c = this.chordAtBar(bar);
    return [c.root + 24 + c.tones[0], c.root + 24 + c.tones[1]];
  }
}
