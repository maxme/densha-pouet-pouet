// Juice: screen shake, particles, pop-up texts, flashes.

import { Renderer } from './Renderer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Popup {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
  scale: number;
}

export class Effects {
  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private shakeAmount = 0;
  flash = 0;
  flashColor = '#ffffff';

  shake(amount: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  doFlash(color: string, amount = 1): void {
    this.flashColor = color;
    this.flash = Math.max(this.flash, amount);
  }

  burst(x: number, y: number, color: string, count: number, speed = 60, spread = Math.PI * 2, dir = -Math.PI / 2): void {
    for (let i = 0; i < count; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      const life = 0.25 + Math.random() * 0.35;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
  }

  popup(text: string, x: number, y: number, color: string, scale = 1): void {
    this.popups.push({ text, x, y, life: 0.6, color, scale });
  }

  /** Offset to apply to the world for screen shake. */
  offset(): [number, number] {
    if (this.shakeAmount < 0.3) return [0, 0];
    return [
      Math.round((Math.random() * 2 - 1) * this.shakeAmount),
      Math.round((Math.random() * 2 - 1) * this.shakeAmount),
    ];
  }

  update(dt: number): void {
    this.shakeAmount *= Math.pow(0.0005, dt);
    this.flash = Math.max(0, this.flash - dt * 4);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.popups) {
      p.life -= dt;
      p.y -= 18 * dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  renderParticles(r: Renderer): void {
    for (const p of this.particles) {
      if (p.life / p.max < 0.3 && Math.random() < 0.5) continue; // flicker out
      r.rect(p.x, p.y, p.size, p.size, p.color);
    }
  }

  renderPopups(r: Renderer): void {
    for (const p of this.popups) {
      const s = p.life > 0.5 ? p.scale + 1 : p.scale; // pop on spawn
      r.text(p.text, p.x, p.y, p.color, s, 'center', '#0e0b16');
    }
  }

  renderFlash(r: Renderer, w: number, h: number): void {
    if (this.flash <= 0) return;
    r.ctx.globalAlpha = Math.min(0.5, this.flash * 0.35);
    r.rect(0, 0, w, h, this.flashColor);
    r.ctx.globalAlpha = 1;
  }
}
