import { OripaPackCard } from '@/components/OripaPackCard';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PACK_DEFS, ensureSeeded, type PackPrize } from '@/lib/oripaPacks';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  update: { label: '설정 변경', color: '#3B82F6' },
  update_with_reset: { label: '설정 + 새 판', color: '#10B981' },
  reset_tickets: { label: '티켓 새 판', color: '#F59E0B' },
};

export default async function Page() {
  const seed = await ensureSeeded();
  const [packs, history] = await Promise.all([
    seed.ok
      ? prisma.oripaPack.findMany({ orderBy: { price: 'asc' } }).catch(() => [])
      : Promise.resolve([]),
    seed.ok
      ? prisma.oripaPackHistory
          .findMany({ orderBy: { createdAt: 'desc' }, take: 30 })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const defaultIds = new Set(DEFAULT_PACK_DEFS.map((p) => p.id));
  const packNameById = new Map(packs.map((p) => [p.id, p.name]));

  return (
    <>
      <h1 className="admin-h1">오리파 관리</h1>
      <p className="admin-sub">
        기본 3팩은 항상 존재 · 가격/상품 변경 후 "저장 + 새 판" 누르면 티켓 100칸 초기화
      </p>

      {!seed.ok && (
        <div
          style={{
            background: '#FEF2F2',
            color: '#B91C1C',
            padding: '12px 14px',
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          ⚠ <code>oripa_packs</code> 테이블이 없습니다. <code>npx prisma db push</code> 먼저 실행.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {packs.map((p) => {
          const prizes = (Array.isArray(p.prizes) ? p.prizes : []) as unknown as PackPrize[];
          return (
            <OripaPackCard
              key={p.id}
              isDefault={defaultIds.has(p.id)}
              initial={{
                id: p.id,
                tier: p.tier,
                emoji: p.emoji,
                name: p.name,
                desc: p.desc,
                price: p.price,
                ticketsCount: p.ticketsCount,
                prizes,
                active: p.active,
              }}
            />
          );
        })}
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14 }}>📜 변경 이력 (최근 30건)</h2>
        {history.length === 0 ? (
          <div className="muted" style={{ padding: 12 }}>아직 기록 없음</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>시각</th>
                <th style={{ width: 120 }}>팩</th>
                <th style={{ width: 110 }}>액션</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const meta = ACTION_LABEL[h.action] ?? { label: h.action, color: '#64748B' };
                return (
                  <tr key={h.id}>
                    <td>{fmtDate(h.createdAt)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {packNameById.get(h.packId) ?? h.packId}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: meta.color,
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748B' }}>
                      {h.note ?? renderSnapshotSummary(h.snapshot as unknown)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function renderSnapshotSummary(snap: unknown): string {
  if (!snap || typeof snap !== 'object') return '-';
  const s = snap as Record<string, unknown>;
  if (s.before && typeof s.before === 'object') {
    const before = s.before as { price?: number; active?: boolean };
    const after = (s.after as { price?: number; active?: boolean }) ?? {};
    const parts: string[] = [];
    if (after.price !== undefined && after.price !== before.price) {
      parts.push(`price ${before.price ?? '?'} → ${after.price}`);
    }
    if (after.active !== undefined && after.active !== before.active) {
      parts.push(`active ${before.active ? '✓' : '✗'} → ${after.active ? '✓' : '✗'}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'misc';
  }
  if (typeof s.ticketsCount === 'number') return `${s.ticketsCount} 칸 초기화`;
  return '-';
}
