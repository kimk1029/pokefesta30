import { pixelRects } from './pixel-helper';

const GRID = [
  '..########..',
  '.#SSSSSSSSS#',
  '#SeSSSSSSeSS',
  '#SSSSmMmSSSS',
  '#SSCCCCCCSSS',
  '#SCCCCCCCCSS',
  '#SCCCCCCCCSS',
  '#SCCCCCCCCSS',
  '#SCCCCCCCCCS',
  '##SSSSSSSSS#',
  '.##SSSSSSS##',
  '...##....##.',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  S: '#7BA5A8',
  C: '#E8D7A0',
  e: '#1A1A2E',
  m: '#3A1E1E',
  M: '#3A1E1E',
};

export function PixelSnorlax({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="잠만보"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
