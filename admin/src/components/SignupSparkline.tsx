/**
 * 최근 14일 가입자 막대 — 오늘 막대를 강조. 합계/일평균 요약 포함.
 */

interface Day {
  day: string; // 'MM-DD'
  signups: number;
}

export function SignupSparkline({ days }: { days: Day[] }) {
  const total = days.reduce((s, d) => s + d.signups, 0);
  const avg = days.length > 0 ? total / days.length : 0;

  const W = 720;
  const H = 160;
  const padL = 28;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(1, ...days.map((d) => d.signups));
  const n = days.length;
  const stepX = n > 0 ? chartW / n : chartW;
  const barW = stepX * 0.62;
  const yOf = (v: number) => padT + chartH - (v / maxVal) * chartH;
  const xOf = (i: number) => padL + i * stepX + stepX / 2;
  const avgY = padT + chartH - (avg / maxVal) * chartH;

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 18, marginBottom: 10, fontSize: 12, color: '#475569' }}>
        <span>14일 합계 <b style={{ color: '#0F172A' }}>{total.toLocaleString()}명</b></span>
        <span>일평균 <b style={{ color: '#0F172A' }}>{avg.toFixed(1)}명</b></span>
        <span>오늘 <b style={{ color: '#2563EB' }}>{(days[n - 1]?.signups ?? 0).toLocaleString()}명</b></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', minWidth: 560 }}>
        {/* 일평균 점선 */}
        <line x1={padL} x2={W - padR} y1={avgY} y2={avgY} stroke="#CBD5E1" strokeWidth="1" strokeDasharray="4 4" />
        <text x={W - padR} y={avgY - 4} fontSize="9" fill="#94A3B8" textAnchor="end">평균 {avg.toFixed(1)}</text>

        {days.map((d, i) => {
          const isToday = i === n - 1;
          const barH = padT + chartH - yOf(d.signups);
          return (
            <g key={i}>
              <rect
                x={xOf(i) - barW / 2}
                y={yOf(d.signups)}
                width={barW}
                height={Math.max(0, barH)}
                fill={isToday ? '#2563EB' : '#BFDBFE'}
                rx="2"
              >
                <title>{`${d.day} · 가입 ${d.signups}명`}</title>
              </rect>
              {d.signups > 0 ? (
                <text x={xOf(i)} y={yOf(d.signups) - 4} fontSize="9" fill={isToday ? '#2563EB' : '#94A3B8'} textAnchor="middle">
                  {d.signups}
                </text>
              ) : null}
              {i % 2 === 0 ? (
                <text x={xOf(i)} y={H - 8} fontSize="9" fill="#64748B" textAnchor="middle">{d.day}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
