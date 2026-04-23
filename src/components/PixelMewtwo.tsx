import { pixelRects } from './pixel-helper';

const GRID = [
  '...######...',
  '..#PPPPPPP#.',
  '.#PEPPPPPEP#',
  '.#PPPPPPPPP#',
  '.#PPPmmmPPP#',
  '##pPPPPPPPp#',
  '#PPPPPPPPPPP',
  '#PPPPPPPPPPP',
  '##PPPPPPPP##',
  '.#PPP#PPPPP.',
  '..#p##.##p#.',
  '...##...##..',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  P: '#C8C0DC',
  p: '#7B6E9E',
  E: '#E63946',
  m: '#3A1E1E',
};

export function PixelMewtwo({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="뮤츠"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
