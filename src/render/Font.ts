// Tiny 3x5 bitmap font so text stays crisp at low resolution.

const GLYPHS: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001110',
  '!': '010010010000010', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000',
  '+': '000010111010000', '*': '000101010101000', '?': '110001010000010', '/': '001001010100100',
  '>': '100010001010100', '<': '001010100010001', "'": '010010000000000', '=': '000111000111000',
  '[': '110100100100110', ']': '011001001001011', '%': '101001010100101', ',': '000000000010100',
};

export type Align = 'left' | 'center' | 'right';

export function textWidth(str: string, scale = 1): number {
  return str.length === 0 ? 0 : (str.length * 4 - 1) * scale;
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
  align: Align = 'left',
  shadow?: string,
): void {
  const text = str.toUpperCase();
  const w = textWidth(text, scale);
  let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  const cy = Math.round(y);
  if (shadow) drawRaw(ctx, text, cx + scale, cy + scale, shadow, scale);
  drawRaw(ctx, text, cx, cy, color, scale);
}

function drawRaw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale: number): void {
  ctx.fillStyle = color;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) {
      for (let i = 0; i < 15; i++) {
        if (g[i] === '1') ctx.fillRect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
      }
    }
    x += 4 * scale;
  }
}
