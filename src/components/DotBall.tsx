import Svg, { Rect } from 'react-native-svg';

interface Props {
  size?: number;
}

const G = 16;
const INK = '#1A1A2E';
const RED = '#E63946';
const RED_LT = '#FF6470';
const WHITE = '#FFFFFF';
const SHINE = '#FFD2C5';

/**
 * 16x16 pixel Pokeball — smaller dot pattern than PixelBall (10x10),
 * so the surface reads as a finer pixel ball when scaled up.
 */
function build(): Array<[number, number, string]> {
  // r = 7.5 from center (7.5,7.5)
  const cx = 7.5;
  const cy = 7.5;
  const r = 7.5;
  const cells: Array<[number, number, string]> = [];
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;

      const isRing = d > r - 1.05;
      const isEquator = Math.abs(dy) < 0.7;
      const isButtonOuter = d < 2.4;
      const isButtonInner = d < 1.4;
      const isShine = dx < -2 && dy < -2 && d < r - 0.5 && d > r - 3.0;
      const upper = dy < 0;

      let color: string;
      if (isRing) color = INK;
      else if (isEquator) color = INK;
      else if (isButtonInner) color = WHITE;
      else if (isButtonOuter) color = INK;
      else if (isShine) color = upper ? RED_LT : SHINE;
      else if (upper) color = RED;
      else color = WHITE;

      cells.push([x, y, color]);
    }
  }
  return cells;
}

const CELLS = build();

export function DotBall({ size = 56 }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${G} ${G}`}>
      {CELLS.map(([x, y, fill], i) => (
        <Rect key={i} x={x} y={y} width={1} height={1} fill={fill} />
      ))}
    </Svg>
  );
}
