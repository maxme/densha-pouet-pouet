import { describe, expect, it } from 'vitest';
import { Song } from '../src/audio/Song';
import { Chart, isObstacle } from '../src/game/Chart';
import { PATTERNS } from '../src/game/Patterns';
import { LANES, START_LANE } from '../src/config';

/** Lanes the player can be on after each row, moving at most one lane per row. */
function reachable(chart: Chart): Set<number>[] {
  let current = new Set([START_LANE]);
  const out: Set<number>[] = [];
  for (const row of chart.rows) {
    const next = new Set<number>();
    for (const p of current) {
      for (const l of [p - 1, p, p + 1]) {
        if (l < 0 || l >= LANES || row.blocked[l]) continue;
        const pushed = l + row.push[l];
        if (pushed >= 0 && pushed < LANES) next.add(pushed);
      }
    }
    out.push(next);
    current = next;
  }
  return out;
}

describe('Patterns', () => {
  for (const p of PATTERNS) {
    it(`${p.name} is well formed`, () => {
      let path: number | null = null;
      for (const row of p.rows) {
        expect(row).toHaveLength(LANES);
        expect(row).toMatch(/^[.ox\-E|<>]+$/);
        const lane = row.split('').findIndex((c) => c === 'o' || c === '-');
        if (lane >= 0) {
          if (path !== null) expect(Math.abs(lane - path)).toBeLessThanOrEqual(1);
          path = lane;
        }
        const pushed = row.indexOf('<') >= 0 ? row.indexOf('<') - 1 : row.indexOf('>') >= 0 ? row.indexOf('>') + 1 : -1;
        if (pushed >= 0) path = pushed;
      }
      expect(pathLaneOf(p.rows[0])).not.toBeNull();
    });
  }
});

function pathLaneOf(row: string): number | null {
  const i = row.split('').findIndex((c) => c === 'o' || c === '-');
  return i >= 0 ? i : null;
}

describe('Chart', () => {
  for (const seed of [1, 42, 1234, 99999, 31337]) {
    it(`is always playable (seed ${seed})`, () => {
      const chart = new Chart(new Song(seed), seed, true);
      chart.generateUpTo(32 * 12);
      const reach = reachable(chart);
      reach.forEach((set) => expect(set.size).toBeGreaterThan(0));
      for (let i = 1; i < chart.rows.length; i++) expect(chart.rows[i].beat).toBeGreaterThan(chart.rows[i - 1].beat);
      for (let i = 1; i < chart.entities.length; i++) {
        expect(chart.entities[i].beat).toBeGreaterThanOrEqual(chart.entities[i - 1].beat);
      }
      expect(chart.entities.some((e) => e.kind === 'express')).toBe(true);
      expect(chart.entities.filter((e) => isObstacle(e.kind)).length).toBeGreaterThan(50);
    });
  }
});
