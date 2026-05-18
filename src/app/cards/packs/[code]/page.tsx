import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { PackMarketSections } from '@/components/PackMarketSections';
import { getPackWithHits } from '@/lib/cardPackHits';

export const revalidate = 900;

interface Params {
  params: Promise<{ code: string }>;
}

export default async function PackDetailPage({ params }: Params) {
  const { code } = await params;
  const pack = await getPackWithHits(code, 30, { includeSales: true });
  if (!pack) notFound();

  const cards = pack.hits.filter((hit) => hit.itemKind === 'single');
  const boxes = pack.hits.filter((hit) => hit.itemKind === 'box');

  return (
    <>
      <StatusBar />
      <AppBar title={pack.shortName} showBack backHref="/cards/packs" />

      {/* Pack header */}
      <div className="sect">
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 14,
            background: pack.bg, color: 'var(--white)',
            boxShadow:
              '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.45),inset 0 -3px 0 rgba(0,0,0,.25),6px 6px 0 var(--ink)',
          }}
        >
          <div style={{ fontSize: 38 }}>{pack.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 13, letterSpacing: 0.5 }}>{pack.name}</div>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 9, opacity: 0.85, marginTop: 6, letterSpacing: 0.3 }}>
              {pack.releasedAt ? `${pack.releasedAt} 출시 · ` : ''}싱글카드 {cards.length}개
            </div>
          </div>
        </div>
      </div>

      <PackMarketSections packBg={pack.bg} cards={cards} boxes={boxes} />

      <div className="bggap" />
    </>
  );
}

export async function generateMetadata({ params }: Params) {
  const { code } = await params;
  const pack = await getPackWithHits(code, 1);
  if (!pack) return { title: '카드팩' };
  return {
    title: `${pack.name} · 힛카드 시세 — CardVault`,
    description: `${pack.name} 팩에서 나오는 힛카드들의 실시간 시세 (스니다 기준).`,
  };
}
