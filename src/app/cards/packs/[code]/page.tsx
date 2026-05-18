import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { getPackWithHits } from '@/lib/cardPackHits';

export const revalidate = 900;

interface Params {
  params: Promise<{ code: string }>;
}

export default async function PackDetailPage({ params }: Params) {
  const { code } = await params;
  const pack = await getPackWithHits(code, 30);
  if (!pack) notFound();

  const sortedHits = [...pack.hits].sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));

  return (
    <>
      <StatusBar />
      <AppBar title={pack.shortName} showBack backHref="/" />

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
              {pack.releasedAt ? `${pack.releasedAt} 출시 · ` : ''}{pack.hits.length}장
            </div>
          </div>
        </div>
      </div>

      <div className="sect">
        <SectionTitle title="힛카드 시세" right={<span className="more">가격순</span>} />
        {sortedHits.length === 0 ? (
          <div
            style={{
              padding: 30, textAlign: 'center', background: 'var(--white)',
              fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)',
              boxShadow:
                '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
            }}
          >
            매물 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {sortedHits.map((hit) => (
              <Link
                key={hit.apparelId}
                href={`/cards/snkrdunk/${hit.apparelId}`}
                style={{
                  textDecoration: 'none', color: 'inherit',
                  background: 'var(--white)',
                  boxShadow:
                    '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.7),5px 5px 0 var(--ink)',
                  borderTop: `4px solid ${pack.bg}`,
                }}
              >
                <div
                  style={{
                    height: 120, background: 'var(--pap2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}
                >
                  {hit.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hit.imageUrl}
                      alt={hit.shortName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 36 }}>🃏</span>
                  )}
                </div>
                <div style={{ padding: '8px 9px 10px', borderTop: '3px solid var(--ink)' }}>
                  <div
                    style={{
                      fontFamily: 'var(--f1)', fontSize: 9, letterSpacing: 0.2, marginBottom: 5,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {hit.shortName}
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--red)', letterSpacing: 0.3 }}>
                    {hit.minPrice > 0 ? `¥${hit.minPrice.toLocaleString('ja-JP')}` : '시세 없음'}
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 3, letterSpacing: 0.3 }}>
                    {hit.listingCountText ? `매물 ${hit.listingCountText}건` : '매물 없음'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

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
