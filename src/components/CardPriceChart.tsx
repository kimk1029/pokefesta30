import type { HistoryPoint } from '@/lib/cardPrices';

interface Props {
  history: HistoryPoint[];
  width?: number;
  height?: number;
}

/**
 * SVG 스파크라인 — avg 라인 + low/high 영역.
 * 데이터가 1개 이하면 "이력 부족" 문구.
 */
export function CardPriceChart({ history, width = 120, height = 40 }: Props) {
  if (history.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--f1)',
          fontSize: 7,
          color: 'var(--ink3)',
          background: 'var(--pap2)',
          letterSpacing: 0.3,
        }}
      >
        이력 부족
      </div>
    );
  }

  const avgs = history.map((p) => p.avg);
  const lows = history.map((p) => p.low);
  const highs = history.map((p) => p.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = max - min || 1;
  const stepX = width / (history.length - 1);

  const yOf = (v: number) => height - ((v - min) / range) * height;

  const avgPath = avgs.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const areaPath = [
    ...highs.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${yOf(v).toFixed(1)}`),
    ...[...lows].reverse().map((v, i) => `L${((history.length - 1 - i) * stepX).toFixed(1)},${yOf(v).toFixed(1)}`),
    'Z',
  ].join(' ');

  const firstAvg = avgs[0];
  const lastAvg = avgs[avgs.length - 1];
  const trendUp = lastAvg >= firstAvg;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: 'block', background: 'var(--pap2)' }}
      aria-label="시세 차트"
    >
      <path d={areaPath} fill={trendUp ? 'rgba(230,57,70,.18)' : 'rgba(58,91,217,.18)'} />
      <path
        d={avgPath}
        fill="none"
        stroke={trendUp ? 'var(--red)' : 'var(--blu)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(history.length - 1) * stepX}
        cy={yOf(lastAvg)}
        r="2.2"
        fill={trendUp ? 'var(--red)' : 'var(--blu)'}
      />
    </svg>
  );
}
