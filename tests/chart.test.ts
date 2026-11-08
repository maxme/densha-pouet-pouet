import { describe, expect, it } from 'vitest';
import { Song } from '../src/audio/Song';
import { Chart } from '../src/game/Chart';
import { INTRO_BEATS, LANES } from '../src/config';

describe('Chart', () => {
  for (const seed of [1, 42, 1234, 99999]) {
    it(`is always playable (seed ${seed})`, () => {
      const song = new Song(seed);
      const chart = new Chart(song, seed);
      chart.generateUpTo(64 * 6);
      const { safeLanes, entities } = chart;

      for (let b = 1; b < safeLanes.length; b++) {
        expect(Math.abs(safeLanes[b] - safeLanes[b - 1])).toBeLessThanOrEqual(1);
        expect(safeLanes[b]).toBeGreaterThanOrEqual(0);
        expect(safeLanes[b]).toBeLessThan(LANES);
      }
      for (const e of entities) {
        if (e.kind !== 'note') {
          expect(e.beat).toBeGreaterThanOrEqual(INTRO_BEATS);
          expect(e.lane).not.toBe(safeLanes[e.beat]);
        }
      }
      // never more than LANES - 1 obstacles on a beat
      const perBeat = new Map<number, number>();
      for (const e of entities) if (e.kind !== 'note') perBeat.set(e.beat, (perBeat.get(e.beat) ?? 0) + 1);
      for (const n of perBeat.values()) expect(n).toBeLessThan(LANES);
      // sorted by beat (the game relies on it)
      for (let i = 1; i < entities.length; i++) expect(entities[i].beat).toBeGreaterThanOrEqual(entities[i - 1].beat);
    });
  }
});
