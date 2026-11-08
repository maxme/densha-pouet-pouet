// Owns the canvas, the audio context and the current scene.

import { Synth } from './audio/Synth';
import { Action, bindInput } from './input/Input';
import { Renderer } from './render/Renderer';
import { Scene } from './scenes/Scene';
import { load, save } from './storage';

export interface Audio {
  ctx: AudioContext;
  synth: Synth;
}

export class Game {
  readonly renderer: Renderer;
  private scene!: Scene;
  private audioState: Audio | null = null;
  /** User latency calibration, in milliseconds (positive = hear later). */
  latencyMs = load('dpp.latency', 0);
  best = load('dpp.best', 0);

  constructor(canvas: HTMLCanvasElement, first: (g: Game) => Scene) {
    this.renderer = new Renderer(canvas);
    this.setScene(first(this));
    bindInput(canvas, (a: Action) => this.scene.onAction(a));
    document.addEventListener('visibilitychange', () => this.scene.onVisibility?.(!document.hidden));
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.scene.update(dt);
      this.scene.render(this.renderer);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  audio(): Audio {
    if (!this.audioState) {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      this.audioState = { ctx, synth: new Synth(ctx) };
    }
    if (this.audioState.ctx.state !== 'running') void this.audioState.ctx.resume();
    return this.audioState;
  }

  setScene(scene: Scene): void {
    this.scene?.dispose?.();
    this.scene = scene;
  }

  setLatency(ms: number): void {
    this.latencyMs = Math.max(-300, Math.min(300, ms));
    save('dpp.latency', this.latencyMs);
  }

  submitScore(score: number): boolean {
    if (score > this.best) {
      this.best = score;
      save('dpp.best', score);
      return true;
    }
    return false;
  }
}
