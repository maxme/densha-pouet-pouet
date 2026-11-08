// Rates how close an input is to the beat.

import { GOOD_WINDOW, PERFECT_WINDOW } from '../config';
import { TempoMap } from '../audio/TempoMap';

export type Grade = 'perfect' | 'good' | 'off';

export interface Judgement {
  grade: Grade;
  /** Signed error in seconds: negative = early, positive = late. */
  error: number;
  beat: number;
}

export function judge(tempo: TempoMap, songTime: number): Judgement {
  const beat = Math.round(tempo.beatAt(songTime));
  const error = songTime - tempo.timeAt(beat);
  const abs = Math.abs(error);
  const grade: Grade = abs <= PERFECT_WINDOW ? 'perfect' : abs <= GOOD_WINDOW ? 'good' : 'off';
  return { grade, error, beat };
}
