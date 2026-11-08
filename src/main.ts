import { Game } from './Game';
import { TitleScene } from './scenes/TitleScene';

const canvas = document.getElementById('game') as HTMLCanvasElement;
new Game(canvas, (g) => new TitleScene(g));
