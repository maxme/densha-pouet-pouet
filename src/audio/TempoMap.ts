// Converts between song time (seconds) and beats, with tempo changes.

export interface TempoSegment {
  beat: number;
  time: number;
  bpm: number;
}

export class TempoMap {
  readonly segments: TempoSegment[] = [];

  constructor(initialBpm: number) {
    this.segments.push({ beat: 0, time: 0, bpm: initialBpm });
  }

  /** Change the tempo starting at `beat` (must be after the last change). */
  addChange(beat: number, bpm: number): void {
    const last = this.segments[this.segments.length - 1];
    if (beat <= last.beat) throw new Error('Tempo changes must be added in order');
    const time = last.time + ((beat - last.beat) * 60) / last.bpm;
    this.segments.push({ beat, time, bpm });
  }

  private segmentForBeat(beat: number): TempoSegment {
    const s = this.segments;
    for (let i = s.length - 1; i > 0; i--) if (beat >= s[i].beat) return s[i];
    return s[0];
  }

  private segmentForTime(time: number): TempoSegment {
    const s = this.segments;
    for (let i = s.length - 1; i > 0; i--) if (time >= s[i].time) return s[i];
    return s[0];
  }

  timeAt(beat: number): number {
    const seg = this.segmentForBeat(beat);
    return seg.time + ((beat - seg.beat) * 60) / seg.bpm;
  }

  beatAt(time: number): number {
    const seg = this.segmentForTime(time);
    return seg.beat + ((time - seg.time) * seg.bpm) / 60;
  }

  bpmAt(beat: number): number {
    return this.segmentForBeat(beat).bpm;
  }
}
