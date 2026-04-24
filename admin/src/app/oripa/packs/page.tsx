import { OripaPackCard } from '@/components/OripaPackCard';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PACK_DEFS, ensureSeeded, type PackPrize } from '@/lib/oripaPacks';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const seed = await ensureSeeded();
  const packs = seed.ok
    ? await prisma.oripaPack.findMany({ orderBy: { price: 'asc' } }).catch(() => [])
    : [];

  const defaultIds = new Set(DEFAULT_PACK_DEFS.map((p) => p.id));

  return (
    <>
      <h1 className="admin-h1">오리파 관리</h1>
      <p className="admin-sub">기본 3팩은 항상 존재 · 각 팩에서 가격/상품/이미지 관리 + 초기화</p>

      {!seed.ok && (
        <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '12px 14px', borderRadius: 6, fontSize: 12, marginBottom: 14 }}>
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
    </>
  );
}
