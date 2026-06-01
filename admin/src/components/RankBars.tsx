/**
 * 랭킹 가로 막대 — 라벨 + 비율 막대 + 횟수. (인기 클릭/검색어/페이지)
 */
interface Item {
  label: string;
  value: number;
}

export function RankBars({
  items,
  color = '#3B82F6',
  unit = '',
  mono = false,
  empty = '데이터 없음',
}: {
  items: Item[];
  color?: string;
  unit?: string;
  mono?: boolean;
  empty?: string;
}) {
  if (items.length === 0) {
    return <div className="muted" style={{ padding: 16, textAlign: 'center' }}>{empty}</div>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 18,
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 700,
              color: i < 3 ? color : '#94A3B8',
              textAlign: 'right',
            }}
          >
            {i + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                color: '#334155',
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : undefined,
              }}
              title={it.label}
            >
              {it.label}
            </div>
            <div style={{ height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.max(3, (it.value / max) * 100)}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
          <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#0F172A', minWidth: 44, textAlign: 'right' }}>
            {it.value.toLocaleString()}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}
