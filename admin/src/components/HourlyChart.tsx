/**
 * 오늘 24시간 접속 분포 — 시간대별 방문자(고유 IP) 막대 + 로그인 라인.
 * 피크 시간대를 강조 색으로 표시.
 */

interface Hour {
  hour: number;
  visitors: number;
  logins: number;
  views: number;
}

export function HourlyChart({ hours }: { hours: Hour[] }) {
  const total = hours.reduce((s, h) => s + h.visitors, 0);
  if (total === 0) {
    return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>오늘 접속 기록이 아직 없어요</div>;
  }

  const W = 720;
  const H = 200;
  const padL = 30;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(1, ...hours.map((h) => h.visitors));
  const n = 24;
  const stepX = chartW / n;
  const barW = stepX * 0.66;

  const yOf = (v: number) => padT + chartH - (v / maxVal) * chartH;
  const xOf = (i: number) => padL + i * stepX + stepX / 2;

  const peakHour = hours.reduce((best, h) => (h.visitors > best.visitors ? h : best), hours[0]);

  const yTicks = [0, 0.5, 1].map((r) => ({
    y: padT + chartH - r * chartH,
    label: Math.round(maxVal * r).toString(),
  }));

  const loginsMax = Math.max(1, ...hours.map((h) => h.logins));
  const lineY = (v: number) => padT + chartH - (v / loginsMax) * chartH;
  const linePath = hours
    .map((h, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${lineY(h.logins).toFixed(1)}`)
    .join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', minWidth: 560 }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="#EEF2F7" strokeWidth="1" />
            <text x={padL - 4} y={t.y + 3} fontSize="10" fill="#94A3B8" textAnchor="end">{t.label}</text>
          </g>
        ))}

        {hours.map((h, i) => {
          const isPeak = i === peakHour.hour && h.visitors > 0;
          const barH = padT + chartH - yOf(h.visitors);
          return (
            <rect
              key={`b-${i}`}
              x={xOf(i) - barW / 2}
              y={yOf(h.visitors)}
              width={barW}
              height={Math.max(0, barH)}
              fill={isPeak ? '#F59E0B' : '#3B82F6'}
              rx="2"
            >
              <title>{`${i}시 · 방문 ${h.visitors} · 로그인 ${h.logins} · PV ${h.views}`}</title>
            </rect>
          );
        })}

        {/* 로그인 라인 */}
        <path d={linePath} fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />

        {/* X 축 — 3시간 간격 라벨 */}
        {hours.map((h, i) =>
          i % 3 === 0 ? (
            <text key={`x-${i}`} x={xOf(i)} y={H - 8} fontSize="9" fill="#64748B" textAnchor="middle">{i}시</text>
          ) : null,
        )}
      </svg>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 11, color: '#64748B', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#3B82F6', borderRadius: 2 }} /> 방문자
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#F59E0B', borderRadius: 2 }} /> 피크 {peakHour.hour}시 ({peakHour.visitors}명)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 2, background: '#EF4444' }} /> 로그인
        </span>
      </div>
    </div>
  );
}
