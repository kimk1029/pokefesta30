/**
 * 오늘 지표 카드 — 큰 숫자 + 어제 대비 증감 배지.
 */
export function DeltaStat({
  label,
  value,
  prev,
  sub,
  accent,
}: {
  label: string;
  value: number;
  prev?: number | null;
  sub?: string;
  accent?: string;
}) {
  const hasPrev = prev != null;
  const delta = hasPrev ? value - (prev as number) : 0;
  const pct = hasPrev && (prev as number) > 0 ? Math.round((delta / (prev as number)) * 100) : null;
  const flat = delta === 0;
  const up = delta > 0;

  return (
    <div className="stat-card">
      <div className="lbl">{label}</div>
      <div className="val" style={accent ? { color: accent } : undefined}>
        {value.toLocaleString()}
      </div>
      <div className="delta-row">
        {hasPrev ? (
          <span className={`delta ${flat ? 'flat' : up ? 'up' : 'down'}`}>
            {flat ? '—' : up ? '▲' : '▼'} {Math.abs(delta).toLocaleString()}
            {pct != null && !flat ? ` ${up ? '+' : '-'}${Math.abs(pct)}%` : ''}
          </span>
        ) : null}
        <span className="delta-cmp">{hasPrev ? `어제 ${(prev as number).toLocaleString()}` : (sub ?? '')}</span>
      </div>
      {sub && hasPrev ? <div className="sub">{sub}</div> : null}
    </div>
  );
}
