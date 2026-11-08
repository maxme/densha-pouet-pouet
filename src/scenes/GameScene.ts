import { Conductor } from '../audio/Conductor';
import { Sequencer } from '../audio/Sequencer';
import { noteFreq, Song } from '../audio/Song';
import {
  BEATS_PER_BAR,
  BEATS_PER_LEVEL,
  GOOD_WINDOW,
  HIT_GRACE,
  TRAIN_Y,
  VIEW_H,
  VIEW_W,
  laneX,
} from '../config';
import { Audio, Game } from '../Game';
import { Chart, Entity } from '../game/Chart';
import { judge } from '../game/Judge';
import { Scoring } from '../game/Scoring';
import { drawEntity } from '../game/Sprites';
import { beatToY, drawTrack } from '../game/Track';
import { Train } from '../game/Train';
import { Action } from '../input/Input';
import { Effects } from '../render/Effects';
import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';
import { GameOverScene } from './GameOverScene';
import { Scene } from './Scene';
import { TitleScene } from './TitleScene';

const PRE_ROLL = 0.6;

export class GameScene implements Scene {
  private readonly song: Song;
  private readonly chart: Chart;
  private readonly conductor: Conductor;
  private readonly sequencer: Sequencer;
  private readonly audio: Audio;
  private readonly train = new Train();
  private readonly scoring = new Scoring();
  private readonly fx = new Effects();
  private now = -10; // current beat
  private time = -PRE_ROLL; // current song time
  private lastBeat = -1;
  private invuln = 0;
  private crashTimer = -1;
  private paused = false;
  private banner: { text: string; color: string; life: number } | null = null;

  constructor(private readonly game: Game) {
    const seed = Math.floor(Math.random() * 1e9);
    this.song = new Song(seed);
    this.chart = new Chart(this.song, seed ^ 0x5f3759df);
    this.audio = game.audio();
    this.conductor = new Conductor(this.audio.ctx, game.latencyMs / 1000);
    this.conductor.start(PRE_ROLL);
    this.sequencer = new Sequencer(this.song, this.audio.synth, this.conductor);
    this.sequencer.start();
  }

  private get crashing(): boolean {
    return this.crashTimer >= 0;
  }

  update(dt: number): void {
    if (this.paused) return;
    this.fx.update(dt);
    this.train.update(dt);
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    if (this.crashing) {
      this.crashTimer -= dt;
      if (this.crashTimer < 0) this.game.setScene(new GameOverScene(this.game, this.scoring, this.song.levelAtBeat(this.now)));
      return;
    }

    this.time = this.conductor.songTime;
    this.now = this.song.tempo.beatAt(this.time);
    this.invuln -= dt;

    this.chart.generateUpTo(Math.ceil(this.now) + 10);
    this.chart.prune(this.now);

    const beatInt = Math.floor(this.now);
    while (this.lastBeat < beatInt) {
      this.lastBeat++;
      this.onBeat(this.lastBeat);
    }

    this.resolveEntities();
  }

  private onBeat(b: number): void {
    this.train.hop = 2;
    const countdown = ['3', '2', '1', 'GO!'];
    if (b >= 4 && b < 8) this.showBanner(countdown[b - 4], b === 7 ? C.gold : C.fg, 0.4);
    if (b > 0 && b % BEATS_PER_LEVEL === 0) {
      const level = this.song.levelAtBeat(b);
      this.scoring.levelUp(level);
      this.audio.synth.levelUp();
      this.showBanner(`STATION ${level}`, C.gold, 1.6);
      this.fx.doFlash(C.gold, 1);
      this.fx.popup('+1 CAR', VIEW_W / 2, 140, C.gold);
    }
    if (this.song.intensityAtBeat(b) === 3) this.fx.shake(1);
  }

  private resolveEntities(): void {
    const t = this.time;
    const tempo = this.song.tempo;
    for (const e of this.chart.entities) {
      if (e.beat > this.now + 1) break; // entities are sorted by beat
      if (e.resolved) continue;
      const et = tempo.timeAt(e.beat);
      if (e.kind === 'note') {
        if (Math.abs(t - et) <= GOOD_WINDOW && this.train.lane === e.lane) this.collect(e);
        else if (t > et + GOOD_WINDOW) {
          e.resolved = true;
          e.outcome = 'missed';
          this.scoring.missNote();
        }
      } else if (t >= et + HIT_GRACE) {
        e.resolved = true;
        if (this.train.lane === e.lane && this.invuln <= 0) this.hit(e);
        else e.outcome = 'dodged';
      }
    }
  }

  private collect(e: Entity): void {
    e.resolved = true;
    e.outcome = 'collected';
    const mult = this.scoring.multiplier;
    const earned = this.scoring.note();
    const bar = Math.floor(e.beat / BEATS_PER_BAR);
    this.audio.synth.pickup(noteFreq(this.song.hornNotes(bar)[0] + 12));
    this.fx.burst(laneX(e.lane), TRAIN_Y - 8, C.gold, 10, 70);
    this.fx.popup(`+${200 * mult}`, laneX(e.lane), TRAIN_Y - 30, C.gold);
    if (earned) this.wagonEarned();
  }

  private hit(e: Entity): void {
    e.outcome = 'hit';
    const over = this.scoring.hit();
    this.audio.synth.crash();
    this.fx.shake(8);
    this.fx.doFlash(C.red, 1.2);
    this.fx.burst(laneX(e.lane), TRAIN_Y - 6, C.red, 24, 110);
    this.fx.burst(laneX(e.lane), TRAIN_Y - 6, C.fg, 10, 80);
    this.invuln = 0.6;
    if (over) {
      this.crashTimer = 1.6;
      this.sequencer.stop();
      this.showBanner('DERAILED!', C.red, 1.6);
      for (let i = 0; i < 4; i++) this.fx.burst(this.train.x, TRAIN_Y + i * 18, C.red, 16, 140);
    } else {
      this.fx.popup('CRASH!', laneX(e.lane), TRAIN_Y - 40, C.red, 1);
    }
  }

  private wagonEarned(): void {
    this.fx.popup('+1 CAR', this.train.x, TRAIN_Y - 50, C.gold);
    this.audio.synth.levelUp();
  }

  private showBanner(text: string, color: string, life: number): void {
    this.banner = { text, color, life };
  }

  onAction(a: Action): void {
    if (a === 'back') {
      this.game.setScene(new TitleScene(this.game));
      return;
    }
    if (a === 'confirm') {
      this.togglePause(!this.paused);
      return;
    }
    if (this.paused) {
      this.togglePause(false);
      return;
    }
    if (this.crashing || (a !== 'left' && a !== 'right')) return;

    const dir = a === 'left' ? -1 : 1;
    const fromX = this.train.x;
    if (!this.train.move(dir)) {
      this.audio.synth.bump();
      this.fx.shake(2);
      return;
    }
    const t = this.conductor.songTime;
    const j = judge(this.song.tempo, t);
    const earned = this.scoring.laneChange(j.grade);

    const bar = Math.floor(Math.max(0, j.beat) / BEATS_PER_BAR);
    const [n1, n2] = this.song.hornNotes(bar);
    const detune = j.grade === 'off' ? 0.94 : 1; // off-beat = off-key pouet
    this.audio.synth.horn(noteFreq(n1) * detune, noteFreq(n2) * detune, j.grade === 'off' ? 0.6 : 1);

    const sparkDir = dir < 0 ? 0 : Math.PI; // sparks fly away from the move
    const px = laneX(this.train.lane);
    if (j.grade === 'perfect') {
      this.fx.burst(fromX, TRAIN_Y + 8, C.cyan, 14, 90, 1.2, sparkDir);
      this.fx.popup('PERFECT', px, TRAIN_Y - 22, C.cyan);
      this.fx.shake(1.5);
    } else if (j.grade === 'good') {
      this.fx.burst(fromX, TRAIN_Y + 8, C.fg, 6, 60, 1.2, sparkDir);
      this.fx.popup('GOOD', px, TRAIN_Y - 22, C.fg);
    } else {
      this.fx.popup(j.error < 0 ? 'EARLY' : 'LATE', px, TRAIN_Y - 22, C.mid);
    }
    if (earned) this.wagonEarned();
  }

  private togglePause(p: boolean): void {
    if (this.crashing) return;
    this.paused = p;
    if (p) void this.audio.ctx.suspend();
    else void this.audio.ctx.resume();
  }

  onVisibility(visible: boolean): void {
    if (!visible) this.togglePause(true);
  }

  dispose(): void {
    this.sequencer.stop();
    if (this.paused) void this.audio.ctx.resume();
  }

  render(r: Renderer): void {
    const now = this.now;
    const phase = ((now % 1) + 1) % 1;
    const intensity = this.song.intensityAtBeat(now);
    const [ox, oy] = this.fx.offset();
    r.ctx.setTransform(1, 0, 0, 1, ox, oy);

    drawTrack(r, now, intensity, now < 0 ? 1 : phase);

    for (const e of this.chart.entities) {
      if (e.outcome === 'collected' || e.outcome === 'hit') continue;
      const y = beatToY(e.beat, now);
      if (y < -20) break;
      if (y > VIEW_H + 20) continue;
      drawEntity(r, e.kind, laneX(e.lane), y, phase);
    }

    const blink = this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0;
    if (!(this.crashing && this.scoring.wagons === 0 && this.crashTimer < 1.2)) {
      this.train.draw(r, this.scoring.wagons, phase, blink);
    }
    this.fx.renderParticles(r);
    this.fx.renderPopups(r);

    r.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.renderHud(r);
    this.fx.renderFlash(r, VIEW_W, VIEW_H);

    if (this.banner) {
      const s = this.banner.text.length > 4 ? 3 : 5;
      r.text(this.banner.text, VIEW_W / 2, 100, this.banner.color, s, 'center', C.bg);
    }
    if (this.paused) {
      r.ctx.globalAlpha = 0.7;
      r.rect(0, 0, VIEW_W, VIEW_H, C.bg);
      r.ctx.globalAlpha = 1;
      r.text('PAUSE', VIEW_W / 2, 120, C.fg, 4, 'center');
      r.text('SPACE / TAP: RESUME', VIEW_W / 2, 150, C.mid, 1, 'center');
      r.text('ESC: MENU', VIEW_W / 2, 160, C.mid, 1, 'center');
    }
  }

  private renderHud(r: Renderer): void {
    const s = this.scoring;
    r.rect(0, 0, VIEW_W, 11, C.bg);
    r.rect(0, 11, VIEW_W, 1, C.dim);
    r.text(String(s.score).padStart(7, '0'), 3, 3, C.fg);
    const level = this.song.levelAtBeat(Math.max(0, this.now));
    r.text(`STATION ${level}`, VIEW_W - 3, 3, C.gold, 1, 'right');
    r.text(`${Math.round(this.song.tempo.bpmAt(Math.max(0, this.now)))} BPM`, VIEW_W / 2, 3, C.mid, 1, 'center');

    if (s.combo >= 2) {
      const pop = this.now % 1 < 0.1 ? 1 : 0;
      r.text(String(s.combo), VIEW_W / 2, 18 - pop, C.cyan, 3, 'center', C.bg);
      r.text('COMBO', VIEW_W / 2, 35, C.mid, 1, 'center');
      if (s.multiplier > 1) r.text(`X${s.multiplier}`, VIEW_W / 2 + 26, 20, C.gold, 2, 'left', C.bg);
    }
  }
}
