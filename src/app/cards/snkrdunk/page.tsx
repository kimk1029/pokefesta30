import Link from 'next/link';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { SnkrdunkSearchBar } from '@/components/SnkrdunkSearchBar';
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkSalesChart,
  type SnkrdunkApparel,
  type SnkrdunkSalesChart,
} from '@/lib/snkrdunk';
import { SNKRDUNK_FEATURED_CARDS, type SnkrdunkCardSeed } from '@/lib/snkrdunkCards';

interface CardRow {
  seed: SnkrdunkCardSeed;
  apparel: SnkrdunkApparel | null;
  chart: SnkrdunkSalesChart | null;
}

const CATEGORY_BG: Record<SnkrdunkCardSeed['category'], string> = {
  SAR: 'var(--orn)',
  프로모: 'var(--pur)',
  SR: 'var(--red)',
  원피스: 'var(--grn-dk)',
};

function fmtYen(n: number): string {
  if (!n) return '—';
  return `¥${n.toLocaleString('ja-JP')}`;
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
          fontSize: 7,
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

export default async function Page() {
  const rows: CardRow[] = await Promise.all(
    SNKRDUNK_FEATURED_CARDS.map(async (seed) => {
      const [apparel, chart] = await Promise.all([
        fetchSnkrdunkApparel(seed.apparelId),
        fetchSnkrdunkSalesChart(seed.apparelId),
      ]);
      return { seed, apparel, chart };
    }),
  );

  const okCount = rows.filter((r) => r.apparel).length;
  const totalListings = rows.reduce((s, r) => s + (r.apparel?.listingCount ?? 0), 0);

  return (
    <>
      <StatusBar />
      <AppBar title="스니다 시세" showBack backHref="/" />

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
        <div style={{ fontSize: 31 }}>🇯🇵</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 11,
              letterSpacing: 1,
              color: 'var(--yel)',
            }}
          >
            SNKRDUNK 일본 시세
          </div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 8,
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
        <SectionTitle title="추천 6종" right={<span className="more">{rows.length}종</span>} />
        {rows.map(({ seed, apparel, chart }) => {
          const bg = CATEGORY_BG[seed.category];
          const priceText = apparel ? fmtYen(apparel.minPrice) : '—';
          const listingText = apparel?.listingCountText
            ? `매물 ${apparel.listingCountText}건`
            : '데이터 없음';
          const last30 = chart ? chart.points.slice(-30) : [];

          return (
            <Link
              key={seed.apparelId}
              href={`/cards/snkrdunk/${seed.apparelId}`}
              className="shop-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="sh-icon"
                style={{
                  background: bg,
                  color: 'var(--white)',
                  overflow: 'hidden',
                }}
              >
                {apparel?.imageUrl ? (
                  // 외부 이미지는 next/image 도메인 화이트리스트가 필요해서 일반 <img> 사용
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={apparel.imageUrl}
                    alt={seed.shortName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 22 }}>🃏</span>
                )}
              </div>
              <div className="sh-main">
                <div className="sh-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      padding: '2px 5px',
                      background: bg,
                      color: 'var(--white)',
                      letterSpacing: 0.5,
                      boxShadow:
                        '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                    }}
                  >
                    {seed.category}
                  </span>
                  {seed.shortName}
                </div>
                <div
                  className="sh-desc"
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 10,
                    color: 'var(--ink)',
                    marginTop: 6,
                    letterSpacing: 0.3,
                  }}
                >
                  최저 {priceText}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--f1)',
                    fontSize: 8,
                    color: 'var(--ink3)',
                    marginTop: 4,
                  }}
                >
                  {listingText}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Sparkline points={last30} width={140} height={36} />
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
