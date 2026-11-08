import { VIEW_W } from '../config';
import { Game } from '../Game';
import { drawTrack } from '../game/Track';
import { Train } from '../game/Train';
import { Action } from '../input/Input';
import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';
import { GameScene } from './GameScene';
import { Scene } from './Scene';

const DEMO_BPM = 112;

export class TitleScene implements Scene {
  private t = 0;
  private readonly train = new Train();
  private lastBeat = 0;

  constructor(private readonly game: Game) {}

  update(dt: number): void {
    this.t += dt;
    this.train.update(dt);
    const beat = Math.floor((this.t * DEMO_BPM) / 60);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.train.hop = 2;
      // Demo: the train dances across the tracks on the beat.
      if (beat % 2 === 0) {
        const dir = this.train.lane === 0 ? 1 : this.train.lane === 3 ? -1 : Math.random() < 0.5 ? -1 : 1;
        this.train.move(dir);
      }
    }
  }

  onAction(a: Action): void {
    if (a === 'latencyDown') this.game.setLatency(this.game.latencyMs - 10);
    else if (a === 'latencyUp') this.game.setLatency(this.game.latencyMs + 10);
    else if (a !== 'back') this.game.setScene(new GameScene(this.game));
  }

  render(r: Renderer): void {
    const beat = (this.t * DEMO_BPM) / 60;
    const phase = beat % 1;
    r.ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawTrack(r, beat, { intensity: 1, beatPhase: phase, time: this.t });
    this.train.draw(r, 3, phase, false);

    r.ctx.globalAlpha = 0.75;
    r.rect(0, 0, VIEW_W, 150, C.bg);
    r.ctx.globalAlpha = 1;

    const cx = VIEW_W / 2;
    const bounce = phase < 0.12 ? -1 : 0;
    r.text('DENSHA', cx, 22 + bounce, C.fg, 5, 'center', C.darkRed);
    r.text('POUET POUET', cx, 52, C.red, 3, 'center', C.dim);
    r.text('<- ->  SWITCH TRACKS', cx, 78, C.fg, 1, 'center');
    r.text('MOVE ON THE BEAT FOR COMBOS', cx, 88, C.cyan, 1, 'center');
    r.text('DODGE THE OBSTACLES', cx, 98, C.red, 1, 'center');
    r.text('GRAB THE NOTES', cx, 108, C.gold, 1, 'center');
    if (Math.floor(this.t * 2) % 2 === 0) r.text('SPACE / TAP TO DEPART', cx, 124, C.fg, 1, 'center');
    const lat = this.game.latencyMs;
    r.text(`LATENCY ${lat >= 0 ? '+' : ''}${lat}MS  [-/+]`, cx, 138, C.mid, 1, 'center');
    if (this.game.best > 0) r.text(`BEST ${this.game.best}`, cx, 6, C.gold, 1, 'center');
  }
}
