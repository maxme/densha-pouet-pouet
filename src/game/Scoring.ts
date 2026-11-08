// Score, combo and wagon (life) bookkeeping.

import { MAX_WAGONS, START_WAGONS } from '../config';
import { Grade } from './Judge';

export class Scoring {
  score = 0;
  combo = 0;
  maxCombo = 0;
  wagons = START_WAGONS;
  perfects = 0;
  goods = 0;
  offs = 0;
  notes = 0;
  notesMissed = 0;
  hits = 0;

  get multiplier(): number {
    return Math.min(8, 1 + Math.floor(this.combo / 8));
  }

  /** Returns true if a wagon was earned. */
  laneChange(grade: Grade): boolean {
    if (grade === 'off') {
      this.offs++;
      this.combo = 0;
      return false;
    }
    if (grade === 'perfect') this.perfects++;
    else this.goods++;
    this.score += (grade === 'perfect' ? 100 : 50) * this.multiplier;
    return this.bumpCombo();
  }

  /** Returns true if a wagon was earned. */
  note(): boolean {
    this.notes++;
    this.score += 200 * this.multiplier;
    return this.bumpCombo();
  }

  missNote(): void {
    this.notesMissed++;
  }

  /** Returns true when the train is out of wagons. */
  hit(): boolean {
    this.hits++;
    this.combo = 0;
    this.wagons = Math.max(0, this.wagons - 1);
    return this.wagons === 0;
  }

  levelUp(level: number): void {
    this.score += 1000 * level;
    this.wagons = Math.min(MAX_WAGONS, this.wagons + 1);
  }

  private bumpCombo(): boolean {
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (this.combo % 32 === 0 && this.wagons < MAX_WAGONS) {
      this.wagons++;
      return true;
    }
    return false;
  }

  get rank(): string {
    const judged = this.perfects + this.goods + this.offs;
    const accuracy = judged === 0 ? 0 : (this.perfects + this.goods * 0.5) / judged;
    if (this.score > 60000 && accuracy > 0.85) return 'S';
    if (this.score > 30000 && accuracy > 0.7) return 'A';
    if (this.score > 12000) return 'B';
    if (this.score > 4000) return 'C';
    return 'D';
  }
}
