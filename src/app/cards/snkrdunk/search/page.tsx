import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { serverFetch } from '@/lib/apiServer';
import { translate, translateKnownCardNameToKo } from '@/lib/cardTranslate';

export const dynamic = 'force-dynamic';

interface SearchResult {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

interface ApparelDetail {
  apparelId: number;
  name: string;
  localizedName?: string;
  imageUrl: string | null;
  minPrice: number;
  listingCount: number;
  listingCountText: string;
}

interface HydratedHit {
  apparelId: number;
  koName: string;
  jpName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

const ACCENT = '#1B2E89';

async function hydrateBatch(results: SearchResult[]): Promise<HydratedHit[]> {
  const out: HydratedHit[] = new Array(results.length);
  const CONCURRENCY = 6;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, results.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= results.length) return;
      const r = results[idx];
      const ar = await serverFetch<{ data: ApparelDetail | null }>(
        `/api/snkrdunk/apparels/${r.apparelId}`,
        { auth: false },
      );
      const apparel = ar.data?.data ?? null;
      const jp = apparel?.localizedName ?? apparel?.name ?? r.name;
      out[idx] = {
        apparelId: r.apparelId,
        koName: translateKnownCardNameToKo(jp) || jp,
        jpName: jp,
        imageUrl: apparel?.imageUrl ?? r.imageUrl,
        minPrice: apparel?.minPrice ?? 0,
        listingCountText: apparel?.listingCountText ?? '',
      };
    }
  });
  await Promise.all(workers);
  return out.filter(Boolean);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const ja = q ? translate(q, 'ja') : '';

  let hits: HydratedHit[] = [];
  if (ja) {
    const r = await serverFetch<{ results: SearchResult[] }>(
      `/api/snkrdunk/search?q=${encodeURIComponent(ja)}`,
      { auth: false },
    );
    const raw = r.data?.results ?? [];
    hits = raw.length > 0 ? await hydrateBatch(raw) : [];
  }

  // 매물 있는 카드 우선, 가격 높은 순.
  hits.sort((a, b) => {
    if (a.minPrice > 0 && b.minPrice === 0) return -1;
    if (a.minPrice === 0 && b.minPrice > 0) return 1;
    return b.minPrice - a.minPrice;
  });

  return (
    <>
      <StatusBar />
      <AppBar title="카드 검색" showBack backHref="/" />

      {/* 검색 폼 */}
      <form
        method="get"
        style={{
          margin: 'var(--cg) var(--gap)',
          padding: '14px 16px',
          background: 'var(--ink)',
          color: 'var(--white)',
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),8px 8px 0 var(--yel-dk)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--yel)',
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          한국어로 카드명 입력 → 🇯🇵 스니덩 검색
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="예) 리자몽, 피카츄, 이브이"
            autoFocus
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'var(--white)',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              color: 'var(--ink)',
              letterSpacing: 0.3,
              boxShadow: 'inset 2px 2px 0 rgba(0,0,0,.1),inset -2px -2px 0 rgba(255,255,255,.8)',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0 16px',
              background: 'var(--red)',
              color: 'var(--white)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--f1)',
              fontSize: 10,
              letterSpacing: 1,
              boxShadow: 'inset 0 3px 0 var(--red-lt),inset 0 -3px 0 var(--red-dk)',
            }}
          >
            검색
          </button>
        </div>
      </form>

      {!q ? (
        <div
          style={{
            margin: '0 var(--gap)',
            padding: 24,
            fontFamily: 'var(--f1)',
            fontSize: 9,
            color: 'var(--ink3)',
            textAlign: 'center',
            lineHeight: 1.8,
          }}
        >
          한국어로 카드명을 입력해보세요.<br />
          🇯🇵 자동으로 일본어로 번역해 스니덩에서 검색합니다.
        </div>
      ) : (
        <>
          {/* 번역 결과 / 카운트 */}
          <div
            style={{
              margin: '0 var(--gap) var(--cg)',
              padding: '10px 14px',
              background: 'var(--pap2)',
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'var(--ink2)',
              letterSpacing: 0.3,
              lineHeight: 1.8,
              boxShadow:
                '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
            }}
          >
            입력: <b style={{ color: 'var(--ink)' }}>{q}</b>
            {ja && ja !== q ? (
              <>
                <br />
                🇯🇵 JA: <b style={{ color: 'var(--red)' }}>{ja}</b>
              </>
            ) : null}
            <br />
            검색 결과 <b>{hits.length}건</b>
          </div>

          {hits.length === 0 ? (
            <div
              style={{
                margin: '0 var(--gap) var(--cg)',
                padding: 30,
                textAlign: 'center',
                background: 'var(--white)',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink3)',
                boxShadow:
                  '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
              }}
            >
              검색 결과가 없습니다
            </div>
          ) : (
            <div className="sect">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 14, letterSpacing: 0.4 }}>
                    싱글카드 시세
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 4 }}>
                    {hits.length}개 매물
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {hits.map((hit) => (
                  <SearchHitCard key={hit.apparelId} hit={hit} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bggap" />
    </>
  );
}

function SearchHitCard({ hit }: { hit: HydratedHit }) {
  const koTitle = hit.koName || hit.jpName;
  const jpTitle = hit.jpName && hit.jpName !== koTitle ? hit.jpName : null;
  const hasPrice = hit.minPrice > 0;
  return (
    <Link
      href={`/cards/snkrdunk/${hit.apparelId}`}
      className="pack-grid-card"
      style={{ borderTop: `4px solid ${ACCENT}` }}
    >
      <div
        style={{
          aspectRatio: '63 / 88',
          background: 'var(--pap2)',
          overflow: 'hidden',
        }}
      >
        {hit.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.imageUrl}
            alt={koTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
            <span style={{ fontSize: 36 }}>🃏</span>
          </div>
        )}
      </div>
      <div style={{ padding: '7px 8px 9px', borderTop: '3px solid var(--ink)' }}>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 10,
            letterSpacing: 0.2,
            marginBottom: jpTitle ? 3 : 6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 30,
            lineHeight: 1.45,
            wordBreak: 'keep-all',
          }}
        >
          {koTitle}
        </div>
        {jpTitle ? (
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'var(--ink3)',
              marginBottom: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.5,
            }}
          >
            {jpTitle}
          </div>
        ) : null}
        <div
          style={{
            display: 'inline-block',
            padding: '3px 6px',
            background: hasPrice ? 'var(--ink)' : 'var(--pap2)',
            color: hasPrice ? 'var(--gold)' : 'var(--ink3)',
            fontFamily: 'var(--f1)',
            fontSize: 10,
            letterSpacing: 0.3,
            boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
          }}
        >
          {hasPrice ? `¥${hit.minPrice.toLocaleString('ja-JP')}` : '시세 없음'}
        </div>
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 8,
            color: 'var(--ink3)',
            marginTop: 5,
            letterSpacing: 0.3,
            minHeight: 12,
          }}
        >
          {hit.listingCountText ? `매물 ${hit.listingCountText}건` : '매물 없음'}
        </div>
      </div>
    </Link>
  );
}
