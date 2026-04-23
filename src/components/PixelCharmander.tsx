import { pixelRects } from './pixel-helper';

const GRID = [
  '...######...',
  '..#OOOOOO#..',
  '.#OoOoOoOOO#',
  '.#OEOOOEOOOO',
  '.#OOOOOOOOO#',
  '##OOOmmOOO##',
  '#OoCCCCCCOo#',
  '#OoCCCCCCOo#',
  '#OOCCCCCCOo#',
  '##OOOOOOOO##',
  '.##OO..OO##.',
  '...##..##.FR',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  O: '#FF9A3C',
  o: '#D96400',
  C: '#FFE0B0',
  E: '#1A1A2E',
  m: '#3A1E1E',
  F: '#FFD23F',
  R: '#E63946',
};

export function PixelCharmander({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="파이리"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
