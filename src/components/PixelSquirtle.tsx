import { pixelRects } from './pixel-helper';

const GRID = [
  '...######...',
  '..#BBBBBB#..',
  '.#BbBBbBBBB#',
  '.#BEBbbBEBB#',
  '.#BBBBBBBBB#',
  '##BBBmmBBB##',
  '#SHHHHHHHHS#',
  '#SHhhHHhhHS#',
  '#SHHHHHHHHS#',
  '##sHHHHHHs##',
  '.##ss..ss##.',
  '..##....##..',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  B: '#6FC0E5',
  b: '#3A8FC2',
  E: '#1A1A2E',
  m: '#3A1E1E',
  H: '#B8844A',
  h: '#E6B67A',
  S: '#1A1A2E',
  s: '#6E4418',
};

export function PixelSquirtle({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="꼬부기"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
