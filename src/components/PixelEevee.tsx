import { pixelRects } from './pixel-helper';

const GRID = [
  '...##..##...',
  '..#t#..#t#..',
  '.#ttTTTTtt#.',
  '.#TEtttttTE#',
  '.#TtttRtttT#',
  '##TtCCCCCtT#',
  '#TCCCCCCCCT#',
  '#TCCCCCCCCT#',
  '.#TCCCCCCT#.',
  '.##TTTTTT##.',
  '..##T..T##..',
  '...#....#...',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  T: '#C69872',
  t: '#8B6440',
  C: '#FFE9B0',
  E: '#1A1A2E',
  R: '#3A1E1E',
};

export function PixelEevee({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="이브이"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
