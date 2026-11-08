// Beatmap generator: chains hand-written patterns (see Patterns.ts) chosen
// by the song's intensity, with short transitions that walk the player to
// the next pattern's starting lane.

import { INTRO_BEATS, LANES, START_LANE } from '../config';
import { Song } from '../audio/Song';
import { makeRng, Rng } from '../rng';
import { Pattern, PATTERNS } from './Patterns';

export type ObstacleKind = 'crate' | 'barrier' | 'cow' | 'express';
export type EntityKind = ObstacleKind | 'note' | 'switchL' | 'switchR';

export interface Entity {
  beat: number;
  lane: number;
  kind: EntityKind;
  /** Length in beats (express trains only). */
  len: number;
  resolved: boolean;
  warned?: boolean;
  outcome?: 'collected' | 'missed' | 'hit' | 'dodged' | 'smashed' | 'switched';
}

export interface Row {
  beat: number;
  blocked: boolean[];
  push: number[]; // -1 / 0 / +1 per lane (track switches)
}

const STATIC: ObstacleKind[] = ['crate', 'barrier', 'cow'];

export function isObstacle(kind: EntityKind): boolean {
  return kind !== 'note' && kind !== 'switchL' && kind !== 'switchR';
}

export class Chart {
  readonly entities: Entity[] = [];
  /** Every generated row, for validation in tests (only when recordRows). */
  readonly rows: Row[] = [];
  private cursor = INTRO_BEATS;
  private safe = START_LANE;
  private lastPattern = '';
  private rng: Rng;

  constructor(private readonly song: Song, seed: number, private readonly recordRows = false) {
    this.rng = makeRng(seed);
    for (let b = 4; b < INTRO_BEATS; b++) this.push(b, START_LANE, 'note');
  }

  generateUpTo(beat: number): void {
    while (this.cursor <= beat) this.generateChunk();
  }

  prune(currentBeat: number): void {
    let i = 0;
    while (i < this.entities.length && this.entities[i].beat + this.entities[i].len < currentBeat - 3) i++;
    if (i > 0) this.entities.splice(0, i);
  }

  private generateChunk(): void {
    const intensity = this.song.intensityAtBeat(this.cursor);
    const choices = PATTERNS.filter(
      (p) => p.minI <= intensity && intensity <= p.maxI && p.name !== this.lastPattern,
    );
    const pattern = choices[Math.floor(this.rng() * choices.length)];
    this.lastPattern = pattern.name;
    const mirror = this.rng() < 0.5;
    const rows = pattern.rows.map((r) => (mirror ? mirrorRow(r) : r));

    // Walk to the pattern's starting lane, one lane per beat.
    const start = pathLane(rows[0]) ?? this.safe;
    while (this.safe !== start) {
      const old = this.safe;
      this.safe += Math.sign(start - this.safe);
      const row: string[] = Array.from({ length: LANES }, (_, l) => (l === this.safe ? 'o' : '.'));
      if (intensity >= 1) row[old] = 'x';
      this.emitRow(row.join(''), this.cursor, 1, []);
      this.cursor += 1;
    }
    this.emitPattern(pattern, rows);
  }

  private emitPattern(p: Pattern, rows: string[]): void {
    rows.forEach((row, i) => {
      const beat = this.cursor + i * p.step;
      this.emitRow(row, beat, p.step, rows.slice(i + 1));
      const lane = pathLane(row);
      if (lane !== null) this.safe = lane;
      for (let l = 0; l < LANES; l++) {
        if (row[l] === '<') this.safe = l === this.safe ? l - 1 : this.safe;
        if (row[l] === '>') this.safe = l === this.safe ? l + 1 : this.safe;
      }
    });
    this.cursor += rows.length * p.step;
  }

  private emitRow(row: string, beat: number, step: number, following: string[]): void {
    const blocked: boolean[] = [];
    const push: number[] = [];
    for (let l = 0; l < LANES; l++) {
      const c = row[l];
      blocked.push(c === 'x' || c === 'E' || c === '|');
      push.push(c === '<' ? -1 : c === '>' ? 1 : 0);
      if (c === 'o') this.push(beat, l, 'note');
      else if (c === 'x') this.push(beat, l, STATIC[Math.floor(this.rng() * STATIC.length)]);
      else if (c === '<') this.push(beat, l, 'switchL');
      else if (c === '>') this.push(beat, l, 'switchR');
      else if (c === 'E') {
        let n = 0;
        while (n < following.length && following[n][l] === '|') n++;
        this.push(beat, l, 'express', n * step);
      }
    }
    if (this.recordRows) this.rows.push({ beat, blocked, push });
  }

  private push(beat: number, lane: number, kind: EntityKind, len = 0): void {
    this.entities.push({ beat, lane, kind, len, resolved: false });
  }
}

function pathLane(row: string): number | null {
  for (let l = 0; l < row.length; l++) if (row[l] === 'o' || row[l] === '-') return l;
  return null;
}

function mirrorRow(row: string): string {
  return row
    .split('')
    .reverse()
    .map((c) => (c === '<' ? '>' : c === '>' ? '<' : c))
    .join('');
}
