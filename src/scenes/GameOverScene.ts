import { VIEW_W } from '../config';
import { Game } from '../Game';
import { Scoring } from '../game/Scoring';
import { Action } from '../input/Input';
import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';
import { GameScene } from './GameScene';
import { Scene } from './Scene';
import { TitleScene } from './TitleScene';

export class GameOverScene implements Scene {
  private t = 0;
  private readonly newBest: boolean;

  constructor(private readonly game: Game, private readonly s: Scoring, private readonly level: number) {
    this.newBest = game.submitScore(s.score);
  }

  update(dt: number): void {
    this.t += dt;
  }

  onAction(a: Action): void {
    if (this.t < 0.8) return;
    if (a === 'back') this.game.setScene(new TitleScene(this.game));
    else this.game.setScene(new GameScene(this.game));
  }

  render(r: Renderer): void {
    r.clear(C.bg);
    const cx = VIEW_W / 2;
    r.text('TERMINUS!', cx, 24, C.red, 3, 'center');
    r.text(`STATION ${this.level}`, cx, 46, C.gold, 1, 'center');

    r.text('RANK', cx, 64, C.mid, 1, 'center');
    const wobble = Math.round(Math.sin(this.t * 6) * 1);
    r.text(this.s.rank, cx, 74 + wobble, C.cyan, 6, 'center', C.dim);

    r.text('SCORE', cx, 114, C.mid, 1, 'center');
    r.text(String(this.s.score), cx, 122, C.fg, 3, 'center');
    if (this.newBest && Math.floor(this.t * 4) % 2 === 0) r.text('NEW BEST!', cx, 142, C.gold, 1, 'center');
    else r.text(`BEST ${this.game.best}`, cx, 142, C.mid, 1, 'center');

    const rows: [string, string, string][] = [
      ['PERFECT', String(this.s.perfects), C.cyan],
      ['GOOD', String(this.s.goods), C.fg],
      ['OFF BEAT', String(this.s.offs), C.mid],
      ['NOTES', String(this.s.notes), C.gold],
      ['MAX COMBO', String(this.s.maxCombo), C.fg],
      ['CLOSE CALLS', String(this.s.closeCalls), C.cyan],
      ['SMASHES', String(this.s.smashes), C.gold],
      ['CRASHES', String(this.s.hits), C.red],
    ];
    rows.forEach(([label, value, color], i) => {
      const y = 158 + i * 10;
      r.text(label, 30, y, color);
      r.text(value, VIEW_W - 30, y, color, 1, 'right');
    });

    if (this.t > 0.8 && Math.floor(this.t * 2) % 2 === 0) {
      r.text('SPACE / TAP: RETRY', cx, 250, C.fg, 1, 'center');
    }
    r.text('ESC: MENU', cx, 262, C.mid, 1, 'center');
  }
}
