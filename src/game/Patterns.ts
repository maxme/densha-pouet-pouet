// Hand-written chart patterns. Each string is one row (one step in time),
// one character per lane, rows listed in time order:
//   .  empty           o  note on the path      -  path, no note
//   x  static obstacle (crate / barrier / cow)
//   E  head of an oncoming express train, |  rest of its body (blocked)
//   <  >  track switch that pushes the train one lane left / right
// Patterns are randomly mirrored. Tests check that every row stays reachable.

import { Intensity } from '../audio/Song';

export interface Pattern {
  name: string;
  minI: Intensity;
  maxI: Intensity;
  /** Beats per row: 1 = quarter notes, 0.5 = eighth notes. */
  step: 1 | 0.5;
  rows: string[];
}

export const PATTERNS: Pattern[] = [
  // --- breathers
  { name: 'cruise', minI: 0, maxI: 0, step: 1, rows: ['.o..', '.o..', '..o.', '..o.'] },
  { name: 'hop', minI: 0, maxI: 0, step: 1, rows: ['.o..', '....', '..o.', '....', '...o', '....', '..o.', '....'] },

  // --- groove
  { name: 'stairs', minI: 1, maxI: 2, step: 1, rows: ['o...', 'xo..', '.xo.', '..xo', '...-', '..ox', '.ox.', 'ox..'] },
  { name: 'zigzag', minI: 1, maxI: 2, step: 1, rows: ['.o..', '.xo.', '.ox.', '.xo.', '.ox.', '.xo.', '.ox.', '.-..'] },
  { name: 'gates', minI: 1, maxI: 1, step: 1, rows: ['.o..', '....', 'xoxx', '....', '..o.', '....', 'xxox', '....'] },
  { name: 'cows', minI: 1, maxI: 3, step: 1, rows: ['o..x', '-.x.', '.o..', 'x-.x', '.-x.', 'o...'] },
  { name: 'switchback', minI: 1, maxI: 3, step: 1, rows: ['.o..', '.>..', '..o.', '.x-x', '..<.', '.o..', 'x-xx', '....'] },
  { name: 'express-dodge', minI: 1, maxI: 3, step: 1, rows: ['..o.', '..o.', '.oE.', '.-|.', '.o|.', '..o.', 'xo.x', '.-..'] },

  // --- build-up
  { name: 'trill', minI: 2, maxI: 3, step: 0.5, rows: ['.o..', '.xo.', '.ox.', '.xo.', '.ox.', '.xo.', '.ox.', '.x-.'] },
  { name: 'eighth-stairs', minI: 2, maxI: 3, step: 0.5, rows: ['o...', 'xo..', '.xo.', '..xo', '...-', '..ox', '.ox.', 'ox..'] },
  { name: 'walls', minI: 2, maxI: 3, step: 1, rows: ['.o..', 'xoxx', 'xxox', 'xxxo', 'xxox', 'xoxx', 'oxxx', 'xoxx'] },

  // --- full throttle
  { name: 'fast-walls', minI: 3, maxI: 3, step: 0.5, rows: ['.o..', 'xoxx', 'xxox', 'xoxx', 'oxxx', 'xoxx', 'xxox', 'xxxo', '..x-', '....'] },
  { name: 'double-express', minI: 3, maxI: 3, step: 1, rows: ['.o..', '.o..', 'EoE.', '|-|.', '|o|.', '.-..', 'x-xE', '.o.|'] },
];
