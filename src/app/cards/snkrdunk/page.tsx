import Link from 'next/link';
import { CardThumb } from '@/components/CardThumb';
import { Price } from '@/components/Price';
import { PIXEL_BORDER } from '@/components/pixelBorder';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { SnkrdunkSearchBar } from '@/components/SnkrdunkSearchBar';
import { shortenName as shortenNameShared } from '../../../../shared/util/shortenName';
import { autoPriceSize } from '../../../../shared/util/autoPriceSize';
import {
  downsamplePricePoints,
  type SnkrdunkApparel,
  type SnkrdunkSalesChart,
  type SnkrdunkSearchResult,
} from '@/lib/snkrdunk';
import { SNKRDUNK_FEATURED_CARDS, type SnkrdunkCardSeed } from '@/lib/snkrdunkCards';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { serverFetch } from '@/lib/apiServer';

// 추천 6장은 전체보기 리스트의 상단 6장과 동일해야 하므로 browse 순서를 그대로 사용.
// fetch 레이어의 revalidate 캐싱(=10분)에 따라간다.

interface DisplaySeed {
  apparelId: number;
  shortName: string;
  /** 일본어 원문 (소제목 노출용). 한국어와 같으면 표시 생략. */
  localizedName?: string;
  category: SnkrdunkCardSeed['category'] | null;
}

interface CardRow {
  seed: DisplaySeed;
  apparel: SnkrdunkApparel | null;
  chart: SnkrdunkSalesChart | null;
}

const CATEGORY_BG: Record<SnkrdunkCardSeed['category'], string> = {
  SAR: 'var(--orn)',
  프로모: 'var(--pur)',
  SR: 'var(--red)',
  원피스: 'var(--grn-dk)',
};

const FEATURED_BY_ID = new Map(SNKRDUNK_FEATURED_CARDS.map((s) => [s.apparelId, s]));

function fmtYen(n: number): string {
  if (!n) return '—';
  return `¥${n.toLocaleString('ja-JP')}`;
}

/** 검색 결과 name 에서 SAR/SR/AR/プロモ 등 카테고리 라벨을 추측. 없으면 null. */
function inferCategory(name: string): SnkrdunkCardSeed['category'] | null {
  if (/プロモ|PROMO/i.test(name)) return '프로모';
  if (/\bSAR\b/.test(name)) return 'SAR';
  if (/\bSR\b/.test(name)) return 'SR';
  return null;
}

/** "리자몽ex SAR (151) | ポケモンカードゲーム" 같은 긴 이름을 카드 라벨용으로 단축. */

function searchToSeed(r: SnkrdunkSearchResult): DisplaySeed {
  const jp = shortenNameShared(r.name, 28);
  const curated = FEATURED_BY_ID.get(r.apparelId);
  if (curated) {
    return {
      apparelId: r.apparelId,
      shortName: curated.shortName,
      localizedName: jp,
      category: curated.category,
    };
  }
  // 일본어 원문을 한국어로 자동 번역 — 사전 미수록 단어는 원문 유지.
  return {
    apparelId: r.apparelId,
    shortName: shortenNameShared(translateKnownCardNameToKo(r.name), 28),
    localizedName: jp,
    category: inferCategory(r.name),
  };
}

function Sparkline({
  points,
  width = 140,
  height = 36,
}: {
  points: Array<[number, number]>;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'var(--ink3)',
          background: 'var(--pap2)',
          letterSpacing: 0.3,
        }}
      >
        이력 부족
      </div>
    );
  }
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const yOf = (v: number) => height - ((v - min) / range) * height;
  const d = ys
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${yOf(v).toFixed(1)}`)
    .join(' ');
  const trendUp = ys[ys.length - 1] >= ys[0];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: 'block', background: 'var(--pap2)' }}
      aria-label="시세 차트"
    >
      <path
        d={d}
        fill="none"
        stroke={trendUp ? 'var(--red)' : 'var(--blu)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(points.length - 1) * stepX}
        cy={yOf(ys[ys.length - 1])}
        r="2.2"
        fill={trendUp ? 'var(--red)' : 'var(--blu)'}
      />
    </svg>
  );
}

async function pickFeaturedSeeds(): Promise<DisplaySeed[]> {
  const r = await serverFetch<{ results: SnkrdunkSearchResult[] }>(
    '/api/snkrdunk/browse?page=1',
    { auth: false },
  );
  const pool = r.data?.results ?? [];
  if (pool.length > 0) return pool.slice(0, 6).map(searchToSeed);
  return SNKRDUNK_FEATURED_CARDS.slice(0, 6).map((s) => ({
    apparelId: s.apparelId,
    shortName: s.shortName,
    category: s.category,
  }));
}

export default async function Page() {
  const seeds = await pickFeaturedSeeds();
  const rows: CardRow[] = await Promise.all(
    seeds.map(async (seed) => {
      const base = `/api/snkrdunk/apparels/${seed.apparelId}`;
      const [ar, cr] = await Promise.all([
        serverFetch<{ data: SnkrdunkApparel | null }>(base, { auth: false }),
        serverFetch<{ data: SnkrdunkSalesChart | null }>(`${base}/sales-chart`, { auth: false }),
      ]);
      return { seed, apparel: ar.data?.data ?? null, chart: cr.data?.data ?? null };
    }),
  );

  const okCount = rows.filter((r) => r.apparel).length;
  const totalListings = rows.reduce((s, r) => s + (r.apparel?.listingCount ?? 0), 0);

  return (
    <>
      <StatusBar />
      <AppBar title="스니덩크 시세" showBack backHref="/" />

      <div style={{ height: 14 }} />

      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          padding: '14px 16px',
          background: 'linear-gradient(135deg,var(--ink),var(--ink2))',
          color: 'var(--white)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow:
            '-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 3px 0 var(--ink2),8px 8px 0 var(--yel-dk)',
        }}
      >
        <div style={{ fontSize: 32 }}>🇯🇵</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 12,
              letterSpacing: 1,
              color: 'var(--yel)',
            }}
          >
            SNKRDUNK 일본 시세
          </div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 9,
              letterSpacing: 0.3,
              color: 'rgba(255,255,255,.7)',
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            상품 {okCount}/{rows.length}종 · 매물 총 {totalListings.toLocaleString()}건<br />
            v1 API 기준 · 10분 캐시 · JPY
          </div>
        </div>
      </div>

      <SnkrdunkSearchBar />

      <div className="sect">
        <SectionTitle
          title="추천 6종"
          right={
            <Link href="/cards/snkrdunk/all" className="more" style={{ textDecoration: 'none' }}>
              전체보기 →
            </Link>
          }
        />
        {rows.map(({ seed, apparel, chart }) => {
          const bg = seed.category ? CATEGORY_BG[seed.category] : 'var(--ink2)';
          const priceJpy = apparel?.minPrice ?? 0;
          const listingText = apparel?.listingCountText
            ? `매물 ${apparel.listingCountText}건`
            : '데이터 없음';
          // 다운샘플링 후 마지막 ~30 포인트만 사용 (스파크라인 폭 제한).
          const sparkPoints = chart ? downsamplePricePoints(chart.points).slice(-30) : [];

          return (
            <Link
              key={seed.apparelId}
              href={`/cards/snkrdunk/${seed.apparelId}`}
              className="shop-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <CardThumb
                className="sh-icon"
                style={{
                  width: 88,
                  height: 124,
                  background: bg,
                  color: 'var(--white)',
                  overflow: 'hidden',
                  alignSelf: 'stretch',
                }}
                src={apparel?.imageUrl ?? null}
                alt={seed.shortName}
              />
              <div className="sh-main">
                <div className="sh-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {seed.category && (
                    <span
                      style={{
                        fontFamily: 'var(--f1)',
                        fontSize: 9,
                        padding: '2px 5px',
                        background: bg,
                        color: 'var(--white)',
                        letterSpacing: 0.5,
                        boxShadow: PIXEL_BORDER,
                      }}
                    >
                      {seed.category}
                    </span>
                  )}
                  {seed.shortName}
                </div>
                {seed.localizedName && seed.localizedName !== seed.shortName ? (
                  <div
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: 9,
                      color: 'var(--ink3)',
                      letterSpacing: 0.2,
                      lineHeight: 1.4,
                      marginTop: 4,
                    }}
                  >
                    {seed.localizedName}
                  </div>
                ) : null}
                <div
                  className="sh-desc"
                  style={{
                    fontFamily: 'var(--f1)',
                    // JPY 기준 라벨 길이로 추정해 자동 축소. KRW 모드면 length 가 살짝
                    // 달라지지만 같은 자릿수 범위 안이라 결과는 거의 같음.
                    fontSize: autoPriceSize(
                      priceJpy > 0 ? `최저 ¥${priceJpy.toLocaleString('ja-JP')}` : '최저 —',
                      11,
                      7,
                    ),
                    color: 'var(--ink)',
                    marginTop: 6,
                    letterSpacing: 0.3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  최저 <Price jpy={priceJpy} empty="—" />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 9,
                    color: 'var(--ink3)',
                    marginTop: 4,
                  }}
                >
                  {listingText}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Sparkline points={sparkPoints} width={140} height={36} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div style={{ height: 80 }} />
    </>
  );
}
