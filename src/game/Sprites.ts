// Pixel sprites for obstacles, notes and track switches.

import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';
import { drawText } from '../render/Font';
import { EntityKind } from './Chart';

/**
 * @param beatsAway how many beats until the entity reaches the train
 * @param lenPx     on-screen length (express trains)
 */
export function drawEntity(
  r: Renderer,
  kind: EntityKind,
  fx: number,
  fy: number,
  beatPhase: number,
  beatsAway: number,
  lenPx = 0,
): void {
  const x = Math.round(fx);
  const y = Math.round(fy);
  switch (kind) {
    case 'note': {
      const bob = beatPhase < 0.15 ? -1 : 0;
      const ny = y + bob;
      r.rect(x - 3, ny + 1, 4, 3, C.gold);
      r.rect(x - 4, ny + 2, 1, 1, C.gold);
      r.rect(x, ny - 6, 1, 8, C.gold);
      r.rect(x + 1, ny - 6, 2, 1, C.gold);
      r.rect(x + 3, ny - 5, 1, 2, C.gold);
      if (beatPhase < 0.15) {
        r.rect(x - 6, ny - 1, 1, 1, C.fg);
        r.rect(x + 5, ny - 2, 1, 1, C.fg);
      }
      break;
    }
    case 'crate': {
      r.rect(x - 7, y - 6, 14, 12, C.red);
      r.rect(x - 6, y - 5, 12, 10, C.darkRed);
      for (let i = 0; i < 10; i++) {
        r.rect(x - 5 + i, y - 5 + i, 1, 1, C.red);
        r.rect(x + 4 - i, y - 5 + i, 1, 1, C.red);
      }
      break;
    }
    case 'barrier': {
      // The gate closes as it approaches: open > 2 beats away, shut at 1.
      const closed = Math.max(0, Math.min(1, 2 - beatsAway));
      r.rect(x - 13, y - 5, 2, 9, C.fg);
      r.rect(x + 11, y - 5, 2, 9, C.fg);
      const half = Math.round(12 * closed);
      for (let i = 0; i < half; i += 4) {
        const w = Math.min(4, half - i);
        const col = (i / 4) % 2 === 0 ? C.red : C.fg;
        r.rect(x - 11 + i, y - 2, w, 4, col);
        r.rect(x + 11 - i - w, y - 2, w, 4, col);
      }
      const on = beatPhase < 0.5;
      r.rect(x - 13, y - 7, 2, 2, on ? C.gold : C.dim);
      r.rect(x + 11, y - 7, 2, 2, on ? C.dim : C.gold);
      break;
    }
    case 'cow': {
      const step = beatPhase < 0.5 ? 0 : 1;
      r.rect(x - 6, y + 4, 2, 2 + step, C.mid);
      r.rect(x + 4, y + 4, 2, 3 - step, C.mid);
      r.rect(x - 7, y - 4, 14, 8, C.fg);
      r.rect(x - 4, y - 3, 3, 3, C.bg);
      r.rect(x + 2, y, 3, 2, C.bg);
      const nod = beatPhase < 0.2 ? 1 : 0;
      r.rect(x - 11, y - 3 + nod, 5, 5, C.fg);
      r.rect(x - 11, y + 1 + nod, 5, 2, C.red);
      r.rect(x - 10, y - 2 + nod, 1, 1, C.bg);
      r.rect(x - 11, y - 4 + nod, 1, 1, C.gold);
      r.rect(x - 7, y - 4 + nod, 1, 1, C.gold);
      r.rect(x + 7, y - 3 - nod, 2, 1, C.fg);
      break;
    }
    case 'express': {
      // Oncoming train, nose at y (bottom), body extending upwards.
      const top = y - Math.max(22, lenPx);
      for (let wy = y - 22; wy > top; wy -= 18) {
        r.rect(x - 7, wy - 15, 14, 15, C.mid);
        r.rect(x - 5, wy - 12, 4, 3, C.bg);
        r.rect(x + 1, wy - 12, 4, 3, C.bg);
        r.rect(x - 7, wy - 4, 14, 1, C.red);
        r.rect(x - 1, wy, 2, 2, C.dim);
      }
      r.rect(x - 7, y - 22, 14, 20, C.mid);
      r.rect(x - 7, y - 10, 14, 2, C.red);
      r.rect(x - 5, y - 8, 10, 4, C.bg);
      r.rect(x - 6, y - 2, 12, 2, C.red);
      r.rect(x - 3, y, 6, 2, C.red);
      const blink = beatPhase < 0.5;
      r.rect(x - 6, y - 4, 3, 2, blink ? C.gold : C.fg);
      r.rect(x + 3, y - 4, 3, 2, blink ? C.fg : C.gold);
      // Headlight glow
      r.ctx.globalAlpha = 0.2;
      r.ctx.fillStyle = C.gold;
      r.ctx.beginPath();
      r.ctx.moveTo(x - 4, y);
      r.ctx.lineTo(x - 14, y + 50);
      r.ctx.lineTo(x + 14, y + 50);
      r.ctx.lineTo(x + 4, y);
      r.ctx.fill();
      r.ctx.globalAlpha = 1;
      break;
    }
    case 'switchL':
    case 'switchR': {
      const dir = kind === 'switchL' ? -1 : 1;
      // Diverging rail
      for (let i = 0; i < 12; i++) r.rect(x + dir * i * 2, y + 6 - i, 1, 1, C.cyan);
      r.rect(x - 4, y + 4, 9, 4, C.dim);
      drawText(r.ctx, dir < 0 ? '<' : '>', x, y - 6, beatPhase < 0.5 ? C.cyan : C.fg, 2, 'center', C.bg);
      break;
    }
  }
}

/** Blinking "!" at the top of a lane when an express is coming. */
export function drawWarning(r: Renderer, x: number, beatPhase: number): void {
  if (beatPhase > 0.6) return;
  r.ctx.globalAlpha = 0.25;
  r.rect(x - 16, 12, 32, 40, C.red);
  r.ctx.globalAlpha = 1;
  drawText(r.ctx, '!', x, 18, C.red, 3, 'center', C.bg);
}
