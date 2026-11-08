import { Game } from './Game';
import { TitleScene } from './scenes/TitleScene';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas, (g) => new TitleScene(g));

// Debug handle for automated playtests (dev server only).
if (import.meta.env.DEV) (window as unknown as { __dpp: Game }).__dpp = game;
