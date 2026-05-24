import Link from 'next/link';
import { Price } from '@/components/Price';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { CARD_PACKS } from '@/lib/cardPacks';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { serverFetch } from '@/lib/apiServer';

interface ApparelGroupResp {
  apparels?: Array<{ localizedName: string; imageUrl: string | null; minPrice: number }>;
}

export const metadata = {
  title: '가격탐색 · CardVault',
  description: '포켓몬 카드 박스를 선택하고 해당 박스의 싱글카드 시세를 확인하세요.',
};

export default async function PackExplorerPage() {
  const packs = await Promise.all(
    CARD_PACKS.map(async (pack) => {
      let box: { localizedName: string; imageUrl: string | null; minPrice: number } | null = null;
      if (pack.apparelGroupId) {
        const r = await serverFetch<{ data: ApparelGroupResp | null }>(
          `/api/snkrdunk/apparel-groups/${pack.apparelGroupId}?apparelCategoryId=14&page=1&perPage=1`,
          { auth: false },
        );
        box = r.data?.data?.apparels?.[0] ?? null;
      }
      return {
        ...pack,
        boxName: box?.localizedName ?? pack.searchQuery,
        boxKoName: box?.localizedName ? translateKnownCardNameToKo(box.localizedName) : pack.name,
        boxImageUrl: box?.imageUrl ?? null,
        boxPrice: box?.minPrice ?? 0,
      };
    }),
  );

  return (
    <>
      <StatusBar />
      <AppBar title="가격탐색" showBack backHref="/" />

      <div className="sect">
        <div
          style={{
            padding: '14px 14px 12px',
            background: 'var(--white)',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),5px 5px 0 var(--ink)',
          }}
        >
          <div style={{ fontFamily: 'var(--f1)', fontSize: 15, letterSpacing: 0.4 }}>
            포켓몬 카드 박스
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink3)', marginTop: 7, lineHeight: 1.6 }}>
            박스를 선택하면 해당 박스에 포함된 싱글카드 시세가 표시됩니다.
          </div>
        </div>
      </div>

      <div className="sect">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {packs.map((pack) => (
            <Link
              key={pack.code}
              href={`/cards/packs/${pack.code}`}
              className="pack-list-item"
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  background: pack.bg,
                  color: 'var(--white)',
                  fontSize: 23,
                  boxShadow:
                    '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35),3px 3px 0 var(--ink)',
                  overflow: 'hidden',
                }}
              >
                {pack.boxImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pack.boxImageUrl} alt={pack.boxKoName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  pack.emoji
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 13,
                    letterSpacing: 0.2,
                    whiteSpace: 'normal',
                    lineHeight: 1.45,
                  }}
                >
                  {pack.name}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', marginTop: 5, lineHeight: 1.45 }}>
                  {pack.boxKoName}
                  <br />
                  {pack.boxName}
                </div>
                <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {pack.boxPrice > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 7px',
                        background: 'var(--yel)',
                        color: 'var(--ink)',
                        fontFamily: 'var(--f1)',
                        fontSize: 10,
                        letterSpacing: 0.3,
                        boxShadow:
                          '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink),2px 2px 0 var(--ink)',
                      }}
                    >
                      <span style={{ fontSize: 8, opacity: 0.7 }}>박스</span>
                      <b><Price jpy={pack.boxPrice} /></b>
                    </span>
                  )}
                  {/* 출시일은 항상 표시 (박스 시세 유무와 무관) */}
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      background: 'var(--pap2)',
                      color: 'var(--ink2)',
                      fontFamily: 'var(--f1)',
                      fontSize: 9,
                      letterSpacing: 0.3,
                      boxShadow:
                        '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                    }}
                  >
                    {pack.releasedAt ? `${pack.releasedAt} 출시` : '출시일 확인 중'}
                  </span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 15, color: 'var(--ink3)' }}>›</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bggap" />
    </>
  );
}
