import { pixelRects } from './pixel-helper';

const GRID = [
  '.....Y.Y....',
  '....YFYFY...',
  '...YFFYFFY..',
  '..#FOOOOOF#.',
  '.#OOEOOOOEO#',
  '.#OOOOmmOOO#',
  '##OOOOOOOOO#',
  '#OOOOOOOOOOO',
  '#OOOOOOOOOOO',
  '##OOOOOOOO##',
  '..##OO.OO##.',
  '....#...#...',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  O: '#F26B24',
  F: '#A73E0A',
  Y: '#FFD23F',
  E: '#1A1A2E',
  m: '#3A1E1E',
};

export function PixelMoltres({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="파이어"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
