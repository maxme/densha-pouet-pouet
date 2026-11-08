// Master clock. Everything in the game reads the song position from here,
// derived from the audio hardware clock, so visuals stay locked to the music.

export class Conductor {
  /** AudioContext time at which song time 0 is *output* by the speakers. */
  private startCtxTime = 0;
  private last = -Infinity;

  constructor(readonly ctx: AudioContext, public userOffset = 0) {}

  /** Start the song `delay` seconds from now. */
  start(delay: number): void {
    this.startCtxTime = this.ctx.currentTime + delay;
    this.last = -Infinity;
  }

  /** Converts a song time into an AudioContext time for scheduling. */
  ctxTimeFor(songTime: number): number {
    return this.startCtxTime + songTime;
  }

  /** Context time that is currently being heard. */
  private heardCtxTime(): number {
    const ctx = this.ctx;
    if (ctx.state === 'running' && typeof ctx.getOutputTimestamp === 'function') {
      const ts = ctx.getOutputTimestamp();
      if (ts.contextTime && ts.performanceTime) {
        return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
      }
    }
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  }

  /** Song position (seconds) as currently heard by the player. Monotonic. */
  get songTime(): number {
    const t = this.heardCtxTime() - this.startCtxTime - this.userOffset;
    if (t > this.last) this.last = t;
    return this.last;
  }
}
