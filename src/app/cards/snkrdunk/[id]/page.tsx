import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkSalesChart,
  fetchSnkrdunkSalesHistory,
  snkrdunkApparelUrl,
} from '@/lib/snkrdunk';
import { SNKRDUNK_FEATURED_CARDS } from '@/lib/snkrdunkCards';

interface PageProps {
  params: { id: string };
}

function fmtYen(n: number): string {
  if (!n) return '—';
  return `¥${n.toLocaleString('ja-JP')}`;
}

function fmtDateShort(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}.${m}.${day}`;
}

function PriceChart({
  points,
  width = 320,
  height = 140,
}: {
  points: Array<[number, number]>;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <div
        style={{
          width: '100%',
          height,
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--f1)',
          fontSize: 9,
          color: 'var(--ink3)',
          background: 'var(--pap2)',
          letterSpacing: 0.3,
        }}
      >
        시세 이력이 부족합니다
      </div>
    );
  }
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const rangeX = maxX - minX || 1;
  const xOf = (v: number) => ((v - minX) / rangeX) * width;
  const yOf = (v: number) => height - ((v - minY) / rangeY) * (height - 12) - 6;
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`)
    .join(' ');
  const areaPath =
    linePath +
    ` L${xOf(maxX).toFixed(1)},${height} L${xOf(minX).toFixed(1)},${height} Z`;
  const trendUp = ys[ys.length - 1] >= ys[0];
  const color = trendUp ? 'var(--red)' : 'var(--blu)';
  const areaFill = trendUp ? 'rgba(230,57,70,.18)' : 'rgba(58,91,217,.18)';

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        style={{ display: 'block', background: 'var(--pap2)' }}
        aria-label="시세 차트"
      >
        <path d={areaPath} fill={areaFill} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xOf(maxX)} cy={yOf(ys[ys.length - 1])} r="3" fill={color} />
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'var(--ink3)',
          letterSpacing: 0.3,
        }}
      >
        <span>{fmtDateShort(minX)}</span>
        <span>최저 ¥{minY.toLocaleString('ja-JP')} · 최고 ¥{maxY.toLocaleString('ja-JP')}</span>
        <span>{fmtDateShort(maxX)}</span>
      </div>
    </div>
  );
}

export default async function Page({ params }: PageProps) {
  const apparelId = Number(params.id);
  if (!Number.isInteger(apparelId) || apparelId <= 0) notFound();

  const seed = SNKRDUNK_FEATURED_CARDS.find((c) => c.apparelId === apparelId);
  const [apparel, salesHistory, salesChart] = await Promise.all([
    fetchSnkrdunkApparel(apparelId),
    fetchSnkrdunkSalesHistory(apparelId),
    fetchSnkrdunkSalesChart(apparelId),
  ]);
  if (!apparel) notFound();

  const displayName = seed?.shortName ?? apparel.localizedName;
  const allPoints = salesChart?.points ?? [];
  // 차트가 너무 빽빽해지지 않도록 마지막 90개로 슬라이스
  const points = allPoints.length > 90 ? allPoints.slice(-90) : allPoints;

  return (
    <>
      <StatusBar />
      <AppBar title="시세 상세" showBack backHref="/cards/snkrdunk" />

      <div style={{ height: 14 }} />

      {/* HERO: image + name + price */}
      <div
        style={{
          margin: '0 var(--gap) var(--cg)',
          background: 'var(--white)',
          padding: 16,
          display: 'flex',
          gap: 14,
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),5px 5px 0 var(--ink)',
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            flexShrink: 0,
            background: 'var(--pap2)',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink)',
          }}
        >
          {apparel.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={apparel.imageUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 36 }}>🃏</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {seed && (
            <span
              style={{
                display: 'inline-block',
                fontFamily: 'var(--f1)',
                fontSize: 8,
                padding: '2px 5px',
                background: 'var(--orn)',
                color: 'var(--white)',
                letterSpacing: 0.5,
                marginBottom: 6,
                boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
              }}
            >
              {seed.category}
            </span>
          )}
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 10,
              letterSpacing: 0.3,
              marginBottom: 6,
              lineHeight: 1.4,
            }}
          >
            {displayName}
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 14, color: 'var(--red)', letterSpacing: 0.3 }}>
            {fmtYen(apparel.minPrice)}
          </div>
          {apparel.listingCountText && (
            <div style={{ fontFamily: 'var(--f1)', fontSize: 8, color: 'var(--ink3)', marginTop: 4, letterSpacing: 0.3 }}>
              매물 {apparel.listingCountText}건
              {apparel.productNumber ? ` · ${apparel.productNumber}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* 스니다 바로가기 버튼 */}
      <a
        href={snkrdunkApparelUrl(apparelId)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          margin: '0 var(--gap) var(--cg)',
          padding: '12px 14px',
          background: 'var(--ink)',
          color: 'var(--gold)',
          textDecoration: 'none',
          fontFamily: 'var(--f1)',
          fontSize: 10,
          letterSpacing: 0.5,
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--yel-dk)',
        }}
      >
        <span>🇯🇵 스니다에서 구매·확인 ↗</span>
      </a>

      {/* Sales chart */}
      <div className="sect">
        <div className="sect-hd">
          <h2>시세 차트</h2>
          <span className="more">최근 {points.length}건</span>
        </div>
        <div
          style={{
            background: 'var(--white)',
            padding: 14,
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),5px 5px 0 var(--ink)',
          }}
        >
          <PriceChart points={points} />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="sect">
        <div className="sect-hd">
          <h2>최근 거래내역</h2>
          <span className="more">{salesHistory?.history.length ?? 0}건</span>
        </div>
        <div
          style={{
            background: 'var(--white)',
            padding: '6px 14px',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),5px 5px 0 var(--ink)',
          }}
        >
          {salesHistory && salesHistory.history.length > 0 ? (
            salesHistory.history.slice(0, 20).map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom:
                    i < Math.min(salesHistory.history.length, 20) - 1 ? '2px solid var(--bg3)' : 'none',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--ink)', letterSpacing: 0.3 }}>
                    {fmtYen(h.price)}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      color: 'var(--ink3)',
                      letterSpacing: 0.3,
                      marginTop: 3,
                    }}
                  >
                    {h.date}
                    {h.size ? ` · ${h.size}` : ''}
                    {h.condition ? ` · ${h.condition}` : ''}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '20px 0',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'var(--ink3)',
                textAlign: 'center',
                letterSpacing: 0.3,
              }}
            >
              거래내역이 없습니다
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 60 }} />

      <div
        style={{
          margin: '0 var(--gap)',
          padding: '10px 12px',
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'var(--ink3)',
          textAlign: 'center',
          letterSpacing: 0.3,
          lineHeight: 1.6,
        }}
      >
        데이터 출처: snkrdunk.com · 10분 캐시
        <br />
        <Link href="/cards/snkrdunk" style={{ color: 'var(--blu)' }}>
          ← 전체 시세 목록
        </Link>
      </div>

      <div style={{ height: 60 }} />
    </>
  );
}
