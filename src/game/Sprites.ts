// Pixel sprites for obstacles and notes.

import { C } from '../render/Palette';
import { Renderer } from '../render/Renderer';
import { EntityKind } from './Chart';

export function drawEntity(r: Renderer, kind: EntityKind, fx: number, fy: number, beatPhase: number): void {
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
      r.rect(x - 13, y - 5, 2, 9, C.fg);
      r.rect(x + 11, y - 5, 2, 9, C.fg);
      for (let i = 0; i < 6; i++) r.rect(x - 12 + i * 4, y - 2, 4, 4, i % 2 === 0 ? C.red : C.fg);
      const on = beatPhase < 0.5;
      r.rect(x - 13, y - 7, 2, 2, on ? C.gold : C.dim);
      r.rect(x + 11, y - 7, 2, 2, on ? C.dim : C.gold);
      break;
    }
    case 'cow': {
      // legs
      r.rect(x - 6, y + 4, 2, 2, C.mid);
      r.rect(x + 4, y + 4, 2, 2, C.mid);
      // body
      r.rect(x - 7, y - 4, 14, 8, C.fg);
      r.rect(x - 4, y - 3, 3, 3, C.bg);
      r.rect(x + 2, y, 3, 2, C.bg);
      // head
      const nod = beatPhase < 0.2 ? 1 : 0;
      r.rect(x - 11, y - 3 + nod, 5, 5, C.fg);
      r.rect(x - 11, y + 1 + nod, 5, 2, C.red);
      r.rect(x - 10, y - 2 + nod, 1, 1, C.bg);
      r.rect(x - 11, y - 4 + nod, 1, 1, C.gold);
      r.rect(x - 7, y - 4 + nod, 1, 1, C.gold);
      // tail
      r.rect(x + 7, y - 3, 2, 1, C.fg);
      break;
    }
  }
}
