import type { ReactNode } from 'react';

/**
 * Convert a 2-D string grid into crisp pixel <rect> SVG children.
 * '.' (or space) is transparent.
 */
export function pixelRects(
  grid: string[],
  colors: Record<string, string>,
): ReactNode[] {
  const out: ReactNode[] = [];
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = colors[ch];
      if (!fill) return;
      out.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    });
  });
  return out;
}
