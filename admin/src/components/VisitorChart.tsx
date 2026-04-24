/**
 * 14일 방문자/로그인 SVG 막대+라인 차트.
 * 방문자(고유 IP) = 파랑 막대, 로그인(고유 user) = 빨강 라인.
 */

interface Point {
  day: string;   // 'MM-DD'
  visitors: number;
  logins: number;
}

export function VisitorChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return <div className="muted" style={{ padding: 20, textAlign: 'center' }}>아직 데이터가 없어요</div>;
  }

  const W = 720;
  const H = 200;
  const padL = 32;
  const padR = 16;
  const padT = 20;
  const padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(1, ...points.flatMap((p) => [p.visitors, p.logins]));
  const n = points.length;
  const barW = (chartW / n) * 0.7;
  const stepX = chartW / n;

  const yOf = (v: number) => padT + chartH - (v / maxVal) * chartH;
  const xOf = (i: number) => padL + i * stepX + stepX / 2;

  // Y 축 격자 4개 (0, 25%, 50%, 75%, 100%)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    y: padT + chartH - r * chartH,
    label: Math.round(maxVal * r).toString(),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(p.logins).toFixed(1)}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', minWidth: 560 }}>
        {/* 그리드 */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="#E2E8F0" strokeWidth="1" />
            <text x={padL - 4} y={t.y + 3} fontSize="10" fill="#94A3B8" textAnchor="end">{t.label}</text>
          </g>
        ))}

        {/* 방문자 막대 */}
        {points.map((p, i) => (
          <rect
            key={`b-${i}`}
            x={xOf(i) - barW / 2}
            y={yOf(p.visitors)}
            width={barW}
            height={padT + chartH - yOf(p.visitors)}
            fill="#3B82F6"
            rx="2"
          />
        ))}

        {/* 로그인 라인 */}
        <path d={linePath} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={`c-${i}`} cx={xOf(i)} cy={yOf(p.logins)} r="3" fill="#EF4444" />
        ))}

        {/* X 축 라벨 (하루 걸러 1개만 표시해 겹침 방지) */}
        {points.map((p, i) => (
          i % 2 === 0 ? (
            <text key={`x-${i}`} x={xOf(i)} y={H - 10} fontSize="9" fill="#64748B" textAnchor="middle">{p.day}</text>
          ) : null
        ))}
      </svg>

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 11, color: '#64748B' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: '#3B82F6', borderRadius: 2 }} /> 방문자 (고유 IP)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 2, background: '#EF4444' }} /> 로그인 (고유 유저)
        </span>
      </div>
    </div>
  );
}
