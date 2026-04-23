import { pixelRects } from './pixel-helper';

const GRID = [
  '............',
  '....####....',
  '..##PPPP##..',
  '.#PPPPPPPP#.',
  '.#PEPPPPPEP#',
  '##PPPmmmPPP#',
  '#PPPPPPPPPPP',
  '#pPPPPPPPPpP',
  '#PPPPPPPPPP#',
  '.#PPPPPPPP#.',
  '..##PPPP##..',
  '....####....',
];

const COLORS: Record<string, string> = {
  '#': '#1A1A2E',
  P: '#EA9EC4',
  p: '#C46EA0',
  E: '#1A1A2E',
  m: '#3A1E1E',
};

export function PixelDitto({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      aria-label="메타몽"
      role="img"
    >
      {pixelRects(GRID, COLORS)}
    </svg>
  );
}
