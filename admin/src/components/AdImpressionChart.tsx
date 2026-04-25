/**
 * 14일 광고 노출 SVG 막대 차트.
 * AdSense = 파랑, AdFit = 주황, House = 보라.
 */

interface Point {
  day: string; // 'MM-DD'
  adsense: number;
  adfit: number;
  house: number;
}

const COLORS = {
  adsense: '#4285F4',
  adfit: '#FAB200',
  house: '#9B6FD0',
};

export function AdImpressionChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return (
      <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
        아직 광고 노출 데이터가 없어요
      </div>
    );
  }

  const W = 720;
  const H = 220;
  const padL = 40;
  const padR = 16;
  const padT = 20;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(
    1,
    ...points.map((p) => p.adsense + p.adfit + p.house),
  );
  const n = points.length;
  const barW = (chartW / n) * 0.65;
  const stepX = chartW / n;

  const yOf = (v: number) => padT + chartH - (v / maxVal) * chartH;
  const xOf = (i: number) => padL + i * stepX + stepX / 2;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    y: padT + chartH - r * chartH,
    label: Math.round(maxVal * r).toString(),
  }));

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', minWidth: 560 }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="#E2E8F0" strokeWidth="1" />
            <text x={padL - 4} y={t.y + 3} fontSize="10" fill="#94A3B8" textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}

        {/* 누적 막대 (adsense → adfit → house 순으로 위로 쌓음) */}
        {points.map((p, i) => {
          const x = xOf(i) - barW / 2;
          let yCursor = padT + chartH;
          const segs: Array<{ key: string; v: number; color: string }> = [
            { key: 'adsense', v: p.adsense, color: COLORS.adsense },
            { key: 'adfit', v: p.adfit, color: COLORS.adfit },
            { key: 'house', v: p.house, color: COLORS.house },
          ];
          return segs
            .filter((s) => s.v > 0)
            .map((s) => {
              const h = (s.v / maxVal) * chartH;
              const y = yCursor - h;
              yCursor = y;
              return (
                <rect
                  key={`${i}-${s.key}`}
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  fill={s.color}
                  rx="2"
                />
              );
            });
        })}

        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={`x-${i}`}
              x={xOf(i)}
              y={H - 10}
              fontSize="9"
              fill="#64748B"
              textAnchor="middle"
            >
              {p.day}
            </text>
          ) : null,
        )}
      </svg>

      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          marginTop: 8,
          fontSize: 11,
          color: '#64748B',
          flexWrap: 'wrap',
        }}
      >
        <Legend color={COLORS.adsense} label="AdSense" />
        <Legend color={COLORS.adfit} label="AdFit" />
        <Legend color={COLORS.house} label="House (무료충전)" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 12, height: 12, background: color, borderRadius: 2 }} />
      {label}
    </span>
  );
}
