import { pixelRects } from './pixel-helper';

const GRID = [
  '....####....',
  '...#LLLL#...',
  '..#LELLEL#..',
  '..##LLLL##..',
  '..#LLLLLL#..',
  '..#LLLLLL#..',
  '.##GGGGGG##.',
  '.#GgGGGGgG#.',
  '.#GGGGGGGG#.',
  '##LLLLLLLLL#',
  '#LCCCCCCCCL#',
  '.##LLLLLL##.',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  L: '#9BC5E5',
  G: '#B3B8C0',
  g: '#6E7481',
  C: '#FFF3D0',
  E: '#1A1A2E',
};

export function PixelLapras({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="라프라스"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
