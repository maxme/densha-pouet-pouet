// Keyboard + touch input mapped to abstract actions.

export type Action = 'left' | 'right' | 'confirm' | 'latencyDown' | 'latencyUp' | 'back';

export function bindInput(canvas: HTMLCanvasElement, onAction: (a: Action) => void): void {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    let a: Action | null = null;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
      case 'KeyQ':
        a = 'left';
        break;
      case 'ArrowRight':
      case 'KeyD':
        a = 'right';
        break;
      case 'Space':
      case 'Enter':
        a = 'confirm';
        break;
      case 'Minus':
      case 'NumpadSubtract':
      case 'BracketLeft':
        a = 'latencyDown';
        break;
      case 'Equal':
      case 'NumpadAdd':
      case 'BracketRight':
        a = 'latencyUp';
        break;
      case 'Escape':
        a = 'back';
        break;
    }
    if (a) {
      e.preventDefault();
      onAction(a);
    }
  });

  // Touch / mouse: left half = left, right half = right (also confirms on menus).
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const left = e.clientX - rect.left < rect.width / 2;
    onAction(left ? 'left' : 'right');
  });
  // Taps outside the canvas (letterbox) count too.
  document.body.addEventListener('pointerdown', (e) => {
    if (e.target === canvas) return;
    onAction(e.clientX < window.innerWidth / 2 ? 'left' : 'right');
  });
}
