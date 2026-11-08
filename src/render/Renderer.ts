// Low-resolution canvas scaled up with crisp pixels.

import { VIEW_H, VIEW_W } from '../config';
import { Align, drawText } from './Font';

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const s = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    // Integer scale when possible for perfectly square pixels.
    const scale = s >= 1 ? Math.max(1, Math.floor(s)) : s;
    this.canvas.style.width = `${VIEW_W * scale}px`;
    this.canvas.style.height = `${VIEW_H * scale}px`;
  }

  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  text(str: string, x: number, y: number, color: string, scale = 1, align: Align = 'left', shadow?: string): void {
    drawText(this.ctx, str, x, y, color, scale, align, shadow);
  }

  clear(color: string): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
