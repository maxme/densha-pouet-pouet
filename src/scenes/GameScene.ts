import { Conductor } from '../audio/Conductor';
import { Sequencer } from '../audio/Sequencer';
import { noteFreq, Song } from '../audio/Song';
import {
  BEATS_PER_BAR,
  BEATS_PER_LEVEL,
  CLOSE_CALL_AFTER,
  EXPRESS_SPEED,
  FEVER_BEATS,
  GOOD_WINDOW,
  HIT_GRACE,
  LANES,
  PX_PER_BEAT,
  TRAIN_Y,
  VIEW_H,
  VIEW_W,
  laneX,
} from '../config';
import { Audio, Game } from '../Game';
import { Chart, Entity } from '../game/Chart';
import { judge } from '../game/Judge';
import { Scoring } from '../game/Scoring';
import { drawEntity, drawWarning } from '../game/Sprites';
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
const LAYER_NAMES = ['', '+BASS', '+SYNTH', '+MELODY', '+FULL BAND'];

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
  private clock = 0; // wall-clock seconds, for animations
  private lastBeat = -1;
  private invuln = 0;
  private crashTimer = -1;
  private paused = false;
  private banner: { text: string; color: string; life: number } | null = null;
  private ppb = PX_PER_BEAT;
  private feverEnd = 0;
  private hornIndex = 0;
  private lastLayer = 0;
  /** Song time at which the train last left each lane. */
  private leftLaneAt: number[] = new Array(LANES).fill(-Infinity);

  constructor(private readonly game: Game) {
    const seed = Math.floor(Math.random() * 1e9);
    this.song = new Song(seed);
    this.chart = new Chart(this.song, seed ^ 0x5f3759df);
    this.audio = game.audio();
    this.conductor = new Conductor(this.audio.ctx, game.latencyMs / 1000);
    this.conductor.start(PRE_ROLL);
    this.sequencer = new Sequencer(this.song, this.audio.synth, this.conductor, () => ({
      layer: this.scoring.layer,
      fever: this.scoring.fever,
    }));
    this.sequencer.start();
  }

  private get crashing(): boolean {
    return this.crashTimer >= 0;
  }

  update(dt: number): void {
    if (this.paused) return;
    this.clock += dt;
    this.fx.update(dt);
    this.train.update(dt);
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }

    if (this.crashing) {
      this.crashTimer -= dt;
      if (this.crashTimer < 0) {
        this.game.setScene(new GameOverScene(this.game, this.scoring, this.song.levelAtBeat(this.now)));
      }
      return;
    }

    this.time = this.conductor.songTime;
    this.now = this.song.tempo.beatAt(this.time);
    this.invuln -= dt;

    // Speed grows with the combo, and even more in Super Express.
    const s = this.scoring;
    const target = PX_PER_BEAT + Math.min(14, s.combo * 0.35) + (s.fever ? 10 : 0);
    this.ppb += (target - this.ppb) * Math.min(1, dt * 3);

    this.chart.generateUpTo(Math.ceil(this.now) + 14);
    this.chart.prune(this.now);

    const beatInt = Math.floor(this.now);
    while (this.lastBeat < beatInt) {
      this.lastBeat++;
      this.onBeat(this.lastBeat);
    }

    this.resolveEntities();
    this.updateFever();
    this.updateLayers();
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
    if (this.song.intensityAtBeat(b) === 3 || this.scoring.fever) this.fx.shake(1);

    // Warn about express trains 3 beats ahead.
    for (const e of this.chart.entities) {
      if (e.beat > b + 4) break;
      if (e.kind === 'express' && !e.warned && e.beat - b <= 3) {
        e.warned = true;
        this.audio.synth.warnHorn();
      }
    }
  }

  private resolveEntities(): void {
    const t = this.time;
    const tempo = this.song.tempo;
    const lane = this.train.lane;
    for (const e of this.chart.entities) {
      if (e.beat > this.now + 1) break; // entities are sorted by beat
      if (e.resolved) continue;
      const et = tempo.timeAt(e.beat);
      switch (e.kind) {
        case 'note':
          if (Math.abs(t - et) <= GOOD_WINDOW && lane === e.lane) this.collect(e);
          else if (t > et + GOOD_WINDOW) {
            e.resolved = true;
            e.outcome = 'missed';
            this.scoring.missNote();
          }
          break;
        case 'switchL':
        case 'switchR':
          if (t >= et) {
            e.resolved = true;
            if (lane === e.lane) this.throwSwitch(e);
          }
          break;
        case 'express': {
          const end = tempo.timeAt(e.beat + e.len) + HIT_GRACE;
          if (t >= et + HIT_GRACE && lane === e.lane) this.impact(e);
          else if (t >= end) this.dodge(e, et);
          break;
        }
        default:
          if (t >= et + HIT_GRACE) {
            if (lane === e.lane) this.impact(e);
            else this.dodge(e, et);
          }
      }
    }
  }

  private dodge(e: Entity, et: number): void {
    e.resolved = true;
    e.outcome = 'dodged';
    const left = this.leftLaneAt[e.lane];
    if (left > et + CLOSE_CALL_AFTER && left <= et + HIT_GRACE) {
      this.scoring.closeCall();
      this.fx.popup('CLOSE CALL!', laneX(e.lane), TRAIN_Y - 46, C.cyan, 1, 'close');
      this.fx.burst(laneX(e.lane), TRAIN_Y, C.cyan, 8, 70);
    }
  }

  /** The train touches an obstacle: crash, or smash it in Super Express. */
  private impact(e: Entity): void {
    e.resolved = true;
    if (this.scoring.fever) {
      e.outcome = 'smashed';
      this.scoring.smash();
      this.audio.synth.smash();
      this.fx.shake(3);
      this.fx.doPunch(0.6);
      this.fx.burst(laneX(e.lane), TRAIN_Y - 8, C.fg, 14, 130);
      this.fx.burst(laneX(e.lane), TRAIN_Y - 8, C.red, 10, 100);
      this.fx.popup('SMASH!', laneX(e.lane), TRAIN_Y - 40, C.gold, 1, 'smash');
      return;
    }
    if (this.invuln > 0) {
      e.outcome = 'dodged';
      return;
    }
    this.hit(e);
  }

  private throwSwitch(e: Entity): void {
    const from = this.train.lane;
    if (this.train.move(e.kind === 'switchL' ? -1 : 1)) {
      this.leftLaneAt[from] = this.time;
      e.outcome = 'switched';
      this.audio.synth.clack();
      this.fx.burst(laneX(from), TRAIN_Y + 6, C.cyan, 8, 60);
      this.fx.popup('SWITCH!', laneX(this.train.lane), TRAIN_Y - 34, C.cyan, 1, 'judge');
    }
  }

  private collect(e: Entity): void {
    e.resolved = true;
    e.outcome = 'collected';
    const mult = this.scoring.multiplier;
    const earned = this.scoring.note();
    const bar = Math.floor(e.beat / BEATS_PER_BAR);
    this.audio.synth.pickup(noteFreq(this.song.hornNote(bar, 0) + 12));
    this.fx.burst(laneX(e.lane), TRAIN_Y - 8, C.gold, 10, 70);
    this.fx.popup(`+${200 * mult}`, laneX(e.lane), TRAIN_Y - 30, C.gold, 1, 'note');
    if (earned) this.carEarned();
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
    this.hornIndex = 0;
    if (over) {
      this.crashTimer = 1.6;
      this.sequencer.stop();
      this.showBanner('DERAILED!', C.red, 1.6);
      for (let i = 0; i < 4; i++) this.fx.burst(this.train.x, TRAIN_Y + i * 18, C.red, 16, 140);
    } else {
      this.fx.popup('CRASH!', laneX(e.lane), TRAIN_Y - 40, C.red, 1, 'judge');
    }
  }

  private updateFever(): void {
    const s = this.scoring;
    if (!s.fever && s.steam >= 1) {
      s.fever = true;
      this.feverEnd = Math.ceil(this.now) + FEVER_BEATS;
      this.audio.synth.feverStart();
      this.showBanner('SUPER EXPRESS!', C.gold, 1.4);
      this.fx.doFlash(C.gold, 1.5);
      this.fx.doPunch(1);
      this.fx.shake(5);
    } else if (s.fever) {
      s.steam = Math.max(0, (this.feverEnd - this.now) / FEVER_BEATS);
      if (this.clock % 0.05 < 0.017) this.fx.burst(this.train.x, TRAIN_Y - 2, C.fg, 1, 30, 0.8, Math.PI / 2);
      if (this.now >= this.feverEnd) {
        s.fever = false;
        s.steam = 0;
        this.fx.popup('EXPRESS OVER', VIEW_W / 2, 120, C.mid);
      }
    }
  }

  private updateLayers(): void {
    const layer = this.scoring.layer;
    if (layer > this.lastLayer && !this.scoring.fever) {
      this.fx.popup(LAYER_NAMES[layer], VIEW_W / 2, 60, C.cyan, 1, 'layer');
    }
    this.lastLayer = layer;
  }

  private carEarned(): void {
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
    const fromLane = this.train.lane;
    if (!this.train.move(dir)) {
      this.audio.synth.bump();
      this.fx.shake(2);
      return;
    }
    const t = this.conductor.songTime;
    this.leftLaneAt[fromLane] = t;
    const j = judge(this.song.tempo, t);
    const earned = this.scoring.laneChange(j.grade);

    // The horn plays the melody, one note per on-beat move.
    const bar = Math.floor(Math.max(0, j.beat) / BEATS_PER_BAR);
    if (j.grade === 'off') {
      const f = noteFreq(this.song.hornNote(bar, 0)) * 0.94; // off-key pouet
      this.audio.synth.horn(f, f * 0.5, 0.6);
      this.hornIndex = 0;
    } else {
      const f = noteFreq(this.song.hornNote(bar, this.hornIndex++));
      this.audio.synth.horn(f, f * 0.5, 1);
    }

    const sparkDir = dir < 0 ? 0 : Math.PI; // sparks fly away from the move
    const px = laneX(this.train.lane);
    if (j.grade === 'perfect') {
      this.fx.burst(fromX, TRAIN_Y + 8, C.cyan, 14, 90, 1.2, sparkDir);
      this.fx.popup('PERFECT', px, TRAIN_Y - 22, C.cyan, 1, 'judge');
      this.fx.shake(1.5);
      this.fx.doPunch(0.5);
    } else if (j.grade === 'good') {
      this.fx.burst(fromX, TRAIN_Y + 8, C.fg, 6, 60, 1.2, sparkDir);
      this.fx.popup('GOOD', px, TRAIN_Y - 22, C.fg, 1, 'judge');
    } else {
      this.fx.popup(j.error < 0 ? 'EARLY' : 'LATE', px, TRAIN_Y - 22, C.mid, 1, 'judge');
    }
    if (earned) this.carEarned();
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
    const ppb = this.ppb;
    const phase = ((now % 1) + 1) % 1;
    const fever = this.scoring.fever;
    const intensity = this.song.intensityAtBeat(now);
    const [ox, oy] = this.fx.offset();

    // World transform: shake + zoom punch centred on the locomotive.
    const z = 1 + 0.05 * this.fx.punch;
    const cx = this.train.x;
    r.ctx.setTransform(z, 0, 0, z, ox + cx * (1 - z), oy + TRAIN_Y * (1 - z));

    drawTrack(r, now, {
      intensity,
      beatPhase: now < 0 ? 1 : phase,
      ppb,
      speed: Math.max(0, Math.min(1, (ppb - 44) / 18)),
      fever,
      time: this.clock,
    });

    for (const e of this.chart.entities) {
      if (e.outcome === 'collected' || e.outcome === 'hit' || e.outcome === 'smashed') continue;
      const away = e.beat - now;
      if (e.kind === 'express') {
        const y = TRAIN_Y - away * ppb * EXPRESS_SPEED;
        if (y < 0 && away < 5) drawWarning(r, laneX(e.lane), phase);
        if (y > -20) drawEntity(r, 'express', laneX(e.lane), y, phase, away, e.len * ppb * EXPRESS_SPEED);
        continue;
      }
      const y = beatToY(e.beat, now, ppb);
      if (y < -20) break;
      if (y > VIEW_H + 20) continue;
      drawEntity(r, e.kind, laneX(e.lane), y, phase, away);
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
      const len = this.banner.text.length;
      const s = len > 11 ? 2 : len > 4 ? 3 : 5;
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
    r.text(String(s.score).padStart(7, '0'), 3, 3, C.fg);
    const level = this.song.levelAtBeat(Math.max(0, this.now));
    r.text(`STATION ${level}`, VIEW_W - 3, 3, C.gold, 1, 'right');
    r.text(`${Math.round(this.song.tempo.bpmAt(Math.max(0, this.now)))} BPM`, VIEW_W / 2, 3, C.mid, 1, 'center');

    // Steam gauge
    r.rect(0, 11, VIEW_W, 3, C.dim);
    const w = Math.round(VIEW_W * s.steam);
    const full = s.fever && Math.floor(this.clock * 10) % 2 === 0;
    r.rect(0, 11, w, 3, s.fever ? (full ? C.gold : C.red) : s.steam > 0.8 ? C.gold : C.cyan);
    if (!s.fever && s.steam > 0) r.text('STEAM', 3, 16, C.mid);

    if (s.combo >= 2) {
      const pop = this.now % 1 < 0.1 ? 1 : 0;
      r.text(String(s.combo), VIEW_W / 2, 20 - pop, C.cyan, 3, 'center', C.bg);
      r.text('COMBO', VIEW_W / 2, 37, C.mid, 1, 'center');
      if (s.multiplier > 1) r.text(`X${s.multiplier}`, VIEW_W / 2 + 26, 22, C.gold, 2, 'left', C.bg);
    }
  }
}
