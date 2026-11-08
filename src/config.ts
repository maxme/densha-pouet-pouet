// Global game constants.

export const VIEW_W = 180;
export const VIEW_H = 320;

export const LANES = 4;
export const LANE_W = 36;
export const TRACK_X = (VIEW_W - LANES * LANE_W) / 2; // left edge of the track
export const TRAIN_Y = 250; // y of the locomotive nose (the "judgement line")
export const PX_PER_BEAT = 40; // vertical distance between two beats

export const START_LANE = 1;
export const START_WAGONS = 3;
export const MAX_WAGONS = 6;

/** Timing windows, in seconds (half-width). */
export const PERFECT_WINDOW = 0.06;
export const GOOD_WINDOW = 0.12;
/** Time after an obstacle's beat during which you can still dodge it. */
export const HIT_GRACE = 0.09;

/** Song structure. */
export const BEATS_PER_BAR = 4;
export const BARS_PER_LEVEL = 16;
export const BEATS_PER_LEVEL = BEATS_PER_BAR * BARS_PER_LEVEL;
export const INTRO_BEATS = 8; // no obstacles during the first 2 bars
export const BASE_BPM = 112;
export const BPM_STEP = 8;
export const MAX_BPM = 176;

export function laneX(lane: number): number {
  return TRACK_X + lane * LANE_W + LANE_W / 2;
}
