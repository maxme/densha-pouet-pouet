import { describe, expect, it } from 'vitest';
import { TempoMap } from '../src/audio/TempoMap';
import { judge } from '../src/game/Judge';

describe('TempoMap', () => {
  it('converts both ways across tempo changes', () => {
    const t = new TempoMap(120);
    t.addChange(8, 60);
    expect(t.timeAt(4)).toBeCloseTo(2);
    expect(t.timeAt(8)).toBeCloseTo(4);
    expect(t.timeAt(10)).toBeCloseTo(6);
    for (const b of [0, 3.5, 8, 9.25, 20]) expect(t.beatAt(t.timeAt(b))).toBeCloseTo(b);
  });
});

describe('judge', () => {
  const tempo = new TempoMap(120); // 0.5 s per beat
  it('grades by distance to the nearest beat', () => {
    expect(judge(tempo, 2.0).grade).toBe('perfect');
    expect(judge(tempo, 2.05).grade).toBe('perfect');
    expect(judge(tempo, 1.92).grade).toBe('good');
    expect(judge(tempo, 2.25).grade).toBe('off');
  });
  it('reports early / late', () => {
    expect(judge(tempo, 1.95).error).toBeLessThan(0);
    expect(judge(tempo, 2.05).error).toBeGreaterThan(0);
    expect(judge(tempo, 1.95).beat).toBe(4);
  });
});
