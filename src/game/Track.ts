// Draws the scrolling world: margins with scenery, 4 tracks, beat lines.

import { LANES, LANE_W, PX_PER_BEAT, TRACK_X, TRAIN_Y, VIEW_H, VIEW_W, laneX } from '../config';
import { hash } from '../rng';
import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';

/** Screen y for something happening at `beat` when the song is at `now` (beats). */
export function beatToY(beat: number, now: number): number {
  return TRAIN_Y - (beat - now) * PX_PER_BEAT;
}

export function drawTrack(r: Renderer, now: number, intensity: number, beatPhase: number): void {
  const pulse = Math.max(0, 1 - beatPhase * 4);

  // Margins
  r.rect(0, 0, VIEW_W, VIEW_H, C.bg);
  if (intensity === 3 && pulse > 0) {
    r.ctx.globalAlpha = 0.35 * pulse;
    r.rect(0, 0, TRACK_X, VIEW_H, C.darkRed);
    r.rect(TRACK_X + LANES * LANE_W, 0, TRACK_X, VIEW_H, C.darkRed);
    r.ctx.globalAlpha = 1;
  }

  // Track bed
  r.rect(TRACK_X, 0, LANES * LANE_W, VIEW_H, C.bg2);

  // Sleepers, every quarter beat
  const top = now - (VIEW_H - TRAIN_Y) / PX_PER_BEAT;
  const bottomBeat = now + TRAIN_Y / PX_PER_BEAT + 1;
  for (let q = Math.floor(top * 4) - 1; q <= Math.ceil(bottomBeat * 4); q++) {
    const y = beatToY(q / 4, now);
    for (let l = 0; l < LANES; l++) r.rect(laneX(l) - 10, y, 20, 2, C.dim);
  }

  // Beat lines: the visual metronome sliding into the judgement line
  for (let b = Math.floor(top) - 1; b <= Math.ceil(bottomBeat); b++) {
    const y = beatToY(b, now);
    const isBar = b % 4 === 0;
    const near = Math.abs(y - TRAIN_Y) < 30;
    const color = near ? C.fg : isBar ? C.mid : C.dim;
    for (let x = TRACK_X; x < TRACK_X + LANES * LANE_W; x += 4) r.rect(x, y, 2, 1, color);
  }

  // Rails
  for (let l = 0; l < LANES; l++) {
    const x = laneX(l);
    r.rect(x - 7, 0, 1, VIEW_H, C.mid);
    r.rect(x + 6, 0, 1, VIEW_H, C.mid);
  }

  // Scenery in the margins (poles, bushes, signals)
  for (let k = Math.floor(top * 2) - 2; k <= Math.ceil(bottomBeat * 2) + 2; k++) {
    const y = beatToY(k / 2, now);
    for (const side of [0, 1]) {
      const h = hash(k * 2 + side);
      const x = side === 0 ? 3 + Math.floor(h * 8) : TRACK_X + LANES * LANE_W + 3 + Math.floor(h * 8);
      if (h < 0.18) {
        // telegraph pole
        r.rect(x + 2, y - 10, 1, 12, C.mid);
        r.rect(x, y - 9, 5, 1, C.mid);
      } else if (h < 0.45) {
        // bush
        r.rect(x, y - 2, 6, 3, C.dim);
        r.rect(x + 1, y - 3, 4, 1, C.dim);
      } else if (h < 0.52) {
        // signal light, blinks on the beat
        r.rect(x + 2, y - 8, 1, 10, C.mid);
        r.rect(x + 1, y - 10, 3, 3, pulse > 0.2 ? C.red : C.darkRed);
      }
    }
  }

  // Judgement line markers
  const m = 2 + Math.round(pulse * 2);
  r.rect(TRACK_X - 2 - m, TRAIN_Y - 1, m, 3, C.gold);
  r.rect(TRACK_X + LANES * LANE_W + 2, TRAIN_Y - 1, m, 3, C.gold);
}
