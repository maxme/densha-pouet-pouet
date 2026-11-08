// Draws the scrolling world: margins with scenery, 4 tracks, beat lines.

import { LANES, LANE_W, PX_PER_BEAT, TRACK_X, TRAIN_Y, VIEW_H, VIEW_W, laneX } from '../config';
import { hash } from '../rng';
import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';

/** Screen y for something happening at `beat` when the song is at `now` (beats). */
export function beatToY(beat: number, now: number, ppb = PX_PER_BEAT): number {
  return TRAIN_Y - (beat - now) * ppb;
}

export interface TrackStyle {
  intensity: number;
  beatPhase: number;
  ppb?: number;
  /** 0..1: amount of speed lines. */
  speed?: number;
  fever?: boolean;
  /** Seconds, for animations independent of the beat. */
  time?: number;
}

const TRACK_W = LANES * LANE_W;
const RIGHT_X = TRACK_X + TRACK_W;

export function drawTrack(r: Renderer, now: number, style: TrackStyle): void {
  const { intensity, beatPhase, ppb = PX_PER_BEAT, speed = 0, fever = false, time = 0 } = style;
  const pulse = Math.max(0, 1 - beatPhase * 4);

  // Margins
  r.rect(0, 0, VIEW_W, VIEW_H, fever ? C.darkRed : C.bg);
  if ((intensity === 3 || fever) && pulse > 0) {
    r.ctx.globalAlpha = 0.35 * pulse;
    r.rect(0, 0, TRACK_X, VIEW_H, fever ? C.red : C.darkRed);
    r.rect(RIGHT_X, 0, TRACK_X, VIEW_H, fever ? C.red : C.darkRed);
    r.ctx.globalAlpha = 1;
  }

  // Track bed
  r.rect(TRACK_X, 0, TRACK_W, VIEW_H, fever ? '#2a0f22' : C.bg2);

  const top = now - (VIEW_H - TRAIN_Y) / ppb;
  const bottomBeat = now + TRAIN_Y / ppb + 1;

  // Sleepers, every quarter beat
  for (let q = Math.floor(top * 4) - 1; q <= Math.ceil(bottomBeat * 4); q++) {
    const y = beatToY(q / 4, now, ppb);
    for (let l = 0; l < LANES; l++) r.rect(laneX(l) - 10, y, 20, 2, C.dim);
  }

  // Beat lines: the visual metronome sliding into the judgement line
  for (let b = Math.floor(top) - 1; b <= Math.ceil(bottomBeat); b++) {
    const y = beatToY(b, now, ppb);
    const isBar = b % 4 === 0;
    const near = Math.abs(y - TRAIN_Y) < 30;
    const color = near ? C.fg : isBar ? C.mid : C.dim;
    for (let x = TRACK_X; x < RIGHT_X; x += 4) r.rect(x, y, 2, isBar ? 2 : 1, color);
  }

  // Rails
  for (let l = 0; l < LANES; l++) {
    const x = laneX(l);
    r.rect(x - 7, 0, 1, VIEW_H, fever ? C.red : C.mid);
    r.rect(x + 6, 0, 1, VIEW_H, fever ? C.red : C.mid);
  }

  // Scenery in the margins (poles, bushes, signals)
  for (let k = Math.floor(top * 2) - 2; k <= Math.ceil(bottomBeat * 2) + 2; k++) {
    const y = beatToY(k / 2, now, ppb);
    for (const side of [0, 1]) {
      const h = hash(k * 2 + side);
      const x = side === 0 ? 3 + Math.floor(h * 8) : RIGHT_X + 3 + Math.floor(h * 8);
      if (h < 0.18) {
        r.rect(x + 2, y - 10, 1, 12, C.mid);
        r.rect(x, y - 9, 5, 1, C.mid);
      } else if (h < 0.45) {
        r.rect(x, y - 2, 6, 3, C.dim);
        r.rect(x + 1, y - 3, 4, 1, C.dim);
      } else if (h < 0.52) {
        r.rect(x + 2, y - 8, 1, 10, C.mid);
        r.rect(x + 1, y - 10, 3, 3, pulse > 0.2 ? C.red : C.darkRed);
      }
    }
  }

  // Speed lines rushing past
  const lines = Math.floor(speed * 14);
  for (let i = 0; i < lines; i++) {
    const h = hash(i * 7919 + 13);
    const len = 12 + Math.floor(h * 30);
    const x = i % 2 === 0 ? 1 + Math.floor(h * (TRACK_X - 2)) : RIGHT_X + 1 + Math.floor(h * (TRACK_X - 2));
    const y = ((time * (500 + h * 400) + h * 1000) % (VIEW_H + len)) - len;
    r.rect(x, y, 1, len, fever ? C.gold : C.fg);
  }

  // Judgement line markers
  const m = 2 + Math.round(pulse * 2);
  r.rect(TRACK_X - 2 - m, TRAIN_Y - 1, m, 3, C.gold);
  r.rect(RIGHT_X + 2, TRAIN_Y - 1, m, 3, C.gold);
}
