import Svg, { Polyline, Polygon, Line } from 'react-native-svg';
import { colors } from '@/theme/tokens';

interface Props {
  history: number[];
  width?: number;
  height?: number;
  trendUp?: boolean;
}

/**
 * 시세 스파크라인 — 영역 fill + 선.
 */
export function CardPriceChart({
  history,
  width = 220,
  height = 60,
  trendUp = true,
}: Props) {
  if (history.length < 2) return null;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = max - min || 1;
  const stepX = width / (history.length - 1);
  const points = history.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 8) - 4;
    return [x, y];
  });
  const lineStr = points.map(([x, y]) => `${x},${y}`).join(' ');
  const areaStr = `0,${height} ${lineStr} ${width},${height}`;
  const stroke = trendUp ? colors.red : colors.blu;
  const fill = trendUp ? colors.redLt : colors.bluLt;

  return (
    <Svg width={width} height={height}>
      <Line
        x1={0}
        y1={height - 1}
        x2={width}
        y2={height - 1}
        stroke={colors.ink}
        strokeWidth={1}
      />
      <Polygon points={areaStr} fill={fill} fillOpacity={0.45} />
      <Polyline points={lineStr} fill="none" stroke={stroke} strokeWidth={2} />
    </Svg>
  );
}
