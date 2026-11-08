// Procedural beatmap: obstacles to dodge and notes to collect, one row per beat.
// A "safe lane" walks across the track (at most one lane per beat) and is never
// blocked, so every chart is always playable.

import { INTRO_BEATS, LANES, START_LANE } from '../config';
import { Song } from '../audio/Song';
import { makeRng, Rng } from '../rng';

export type ObstacleKind = 'crate' | 'barrier' | 'cow';
export type EntityKind = ObstacleKind | 'note';

export interface Entity {
  beat: number;
  lane: number;
  kind: EntityKind;
  resolved: boolean;
  /** Set when a note is collected or an obstacle hit (for effects). */
  outcome?: 'collected' | 'missed' | 'hit' | 'dodged';
}

const OBSTACLES: ObstacleKind[] = ['crate', 'barrier', 'cow'];

export class Chart {
  readonly entities: Entity[] = [];
  /** safeLanes[b] = lane guaranteed free at beat b. */
  readonly safeLanes: number[] = [];
  private nextBeat = 0;
  private safe = START_LANE;
  private rng: Rng;

  constructor(private readonly song: Song, seed: number) {
    this.rng = makeRng(seed);
  }

  generateUpTo(beat: number): void {
    while (this.nextBeat <= beat) {
      this.generateBeat(this.nextBeat);
      this.nextBeat++;
    }
  }

  /** Drop entities that are far behind the train. */
  prune(currentBeat: number): void {
    let i = 0;
    while (i < this.entities.length && this.entities[i].beat < currentBeat - 3) i++;
    if (i > 0) this.entities.splice(0, i);
  }

  private generateBeat(b: number): void {
    const rng = this.rng;
    const intensity = this.song.intensityAtBeat(b);
    const level = this.song.levelAtBeat(b);
    const prevSafe = this.safe;

    if (b >= INTRO_BEATS) {
      const moveChance = [0.3, 0.4, 0.5, 0.6][intensity] + Math.min(0.15, (level - 1) * 0.03);
      if (rng() < moveChance) {
        const dir = this.safe === 0 ? 1 : this.safe === LANES - 1 ? -1 : rng() < 0.5 ? -1 : 1;
        this.safe += dir;
      }
    }
    this.safeLanes[b] = this.safe;

    if (b < INTRO_BEATS) {
      // Teach the player: a few notes on the starting lane during the countdown.
      if (b >= 4) this.push(b, this.safe, 'note');
      return;
    }

    // Obstacles
    let count: number;
    switch (intensity) {
      case 0:
        count = b % 2 === 0 && rng() < 0.5 ? 1 : 0;
        break;
      case 1:
        count = b % 2 === 0 || rng() < 0.3 ? 1 : 0;
        break;
      case 2:
        count = 1 + (rng() < 0.35 + level * 0.05 ? 1 : 0);
        break;
      default:
        count = 2 + (rng() < 0.2 + level * 0.06 ? 1 : 0);
    }
    // When the safe lane just moved, block the old lane: the player must move on the beat.
    const candidates: number[] = [];
    for (let l = 0; l < LANES; l++) if (l !== this.safe) candidates.push(l);
    if (prevSafe !== this.safe && intensity >= 1 && count > 0) {
      this.push(b, prevSafe, this.pickObstacle());
      candidates.splice(candidates.indexOf(prevSafe), 1);
      count--;
    }
    for (let i = 0; i < count && candidates.length > 0; i++) {
      const idx = Math.floor(rng() * candidates.length);
      const lane = candidates.splice(idx, 1)[0];
      this.push(b, lane, this.pickObstacle());
    }

    // Notes reward following the safe path, especially when it moves.
    const noteChance = prevSafe !== this.safe ? 0.85 : 0.4;
    if (rng() < noteChance) this.push(b, this.safe, 'note');
  }

  private pickObstacle(): ObstacleKind {
    return OBSTACLES[Math.floor(this.rng() * OBSTACLES.length)];
  }

  private push(beat: number, lane: number, kind: EntityKind): void {
    this.entities.push({ beat, lane, kind, resolved: false });
  }
}
