import { pixelRects } from './pixel-helper';

const GRID = [
  '....#..#....',
  '...#Y#.#Y#..',
  '..#YKK.KKY#.',
  '.#YYYYYYYYY#',
  '.#YEYYYYYEY#',
  '.#YRYYYYYRY#',
  '##YYYmmmYYY#',
  '#sYYYYYYYYs#',
  '#YYYYYYYYYY#',
  '##YYYYYYYY##',
  '..##YY.YY##.',
  '...#....#.#.',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  Y: '#F5D24A',
  s: '#D9B020',
  K: '#1A1A2E',
  E: '#1A1A2E',
  R: '#E63946',
  m: '#3A1E1E',
};

export function PixelPikachu({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="피카츄"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
