// The player's train: a locomotive followed by wagons that snake behind it.

import { LANES, START_LANE, TRAIN_Y, laneX } from '../config';
import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';

const MOVE_TIME = 0.09; // seconds for the visual lane change
const WAGON_GAP = 18;
const WAGON_DELAY = 0.045;

function easeOutBack(t: number): number {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class Train {
  lane = START_LANE;
  x = laneX(START_LANE);
  private fromX = this.x;
  private toX = this.x;
  private moveT = 1;
  private clock = 0;
  private history: { t: number; x: number }[] = [];
  hop = 0;

  /** Returns false if blocked by the edge of the track. */
  move(dir: -1 | 1): boolean {
    const next = this.lane + dir;
    if (next < 0 || next >= LANES) return false;
    this.lane = next;
    this.fromX = this.x;
    this.toX = laneX(next);
    this.moveT = 0;
    return true;
  }

  update(dt: number): void {
    this.clock += dt;
    if (this.moveT < 1) {
      this.moveT = Math.min(1, this.moveT + dt / MOVE_TIME);
      this.x = this.fromX + (this.toX - this.fromX) * easeOutBack(this.moveT);
    }
    this.hop = Math.max(0, this.hop - dt * 8);
    this.history.push({ t: this.clock, x: this.x });
    while (this.history.length > 2 && this.history[1].t < this.clock - 1) this.history.shift();
  }

  private xAt(t: number): number {
    const h = this.history;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t) return h[i].x;
    return h.length ? h[0].x : this.x;
  }

  draw(r: Renderer, wagons: number, beatPhase: number, blink: boolean): void {
    // Wagons first, so the locomotive is on top.
    for (let i = wagons - 1; i >= 0; i--) {
      const wx = this.xAt(this.clock - (i + 1) * WAGON_DELAY);
      const wy = TRAIN_Y + 20 + i * WAGON_GAP + (i % 2 === 0 ? Math.round(this.hop) : 0);
      if (!blink) drawWagon(r, wx, wy);
    }
    if (blink) return;
    const y = TRAIN_Y - 6 - Math.round(this.hop);
    drawLoco(r, this.x, y, beatPhase);
  }
}

function drawLoco(r: Renderer, fx: number, y: number, beatPhase: number): void {
  const x = Math.round(fx);
  // Headlight beam pulsing on the beat
  const glow = Math.max(0, 1 - beatPhase * 3);
  if (glow > 0) {
    r.ctx.globalAlpha = 0.18 * glow;
    r.ctx.fillStyle = C.gold;
    r.ctx.beginPath();
    r.ctx.moveTo(x - 2, y);
    r.ctx.lineTo(x - 14, y - 60);
    r.ctx.lineTo(x + 14, y - 60);
    r.ctx.lineTo(x + 2, y);
    r.ctx.fill();
    r.ctx.globalAlpha = 1;
  }
  // wheels
  r.rect(x - 8, y + 5, 1, 4, C.mid);
  r.rect(x + 7, y + 5, 1, 4, C.mid);
  r.rect(x - 8, y + 15, 1, 4, C.mid);
  r.rect(x + 7, y + 15, 1, 4, C.mid);
  // cowcatcher
  r.rect(x - 3, y - 2, 6, 2, C.red);
  r.rect(x - 6, y, 12, 2, C.red);
  // body
  r.rect(x - 7, y + 2, 14, 20, C.fg);
  r.rect(x - 7, y + 21, 14, 1, C.mid);
  // windshield
  r.rect(x - 5, y + 5, 10, 4, C.bg);
  r.rect(x - 4, y + 5, 2, 1, C.cyan);
  // stripe
  r.rect(x - 7, y + 12, 14, 2, C.red);
  // roof vent
  r.rect(x - 3, y + 16, 6, 3, C.mid);
  // headlight
  if (glow > 0.3) r.rect(x - 2, y + 1, 4, 3, C.gold);
  else r.rect(x - 1, y + 2, 2, 2, C.gold);
}

function drawWagon(r: Renderer, fx: number, y: number): void {
  const x = Math.round(fx);
  r.rect(x - 1, y - 3, 2, 3, C.mid); // coupling
  r.rect(x - 7, y, 14, 15, C.fg);
  r.rect(x - 5, y + 2, 4, 4, C.bg);
  r.rect(x + 1, y + 2, 4, 4, C.bg);
  r.rect(x - 5, y + 8, 4, 3, C.bg);
  r.rect(x + 1, y + 8, 4, 3, C.bg);
  r.rect(x - 7, y + 12, 14, 1, C.red);
  r.rect(x - 8, y + 3, 1, 3, C.mid);
  r.rect(x + 7, y + 3, 1, 3, C.mid);
  r.rect(x - 8, y + 9, 1, 3, C.mid);
  r.rect(x + 7, y + 9, 1, 3, C.mid);
}
