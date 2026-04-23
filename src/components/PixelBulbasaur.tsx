import { pixelRects } from './pixel-helper';

const GRID = [
  '....######..',
  '...#GGgGGG#.',
  '..#GdGGdGGG#',
  '..#gGGGGGgG#',
  '.##GGGGGGG##',
  '##BBBBBBBBB#',
  '#BEbBBBbEBB#',
  '#BBbBBBBBBB#',
  '#BBBBmmBBBB#',
  '##BBBBBBBB##',
  '.##......##.',
  '..##....##..',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  G: '#4AA869',
  g: '#7CCB8C',
  d: '#2D6E3F',
  B: '#7FCE92',
  b: '#4FA077',
  E: '#1A1A2E',
  m: '#3A1E1E',
};

export function PixelBulbasaur({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="이상해씨"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
