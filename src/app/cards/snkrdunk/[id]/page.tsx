import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { SnkrdunkImageZoom } from '@/components/SnkrdunkImageZoom';
import { CardActions } from '@/components/CardActions';
import {
  downsamplePricePoints,
  localizeSnkrdunkText,
  priceDownsampleUnit,
  priceUnitLabelKo,
  type SnkrdunkApparel,
  type SnkrdunkSalesChart,
  type SnkrdunkSalesHistory,
} from '@/lib/snkrdunk';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { SNKRDUNK_FEATURED_CARDS } from '@/lib/snkrdunkCards';
import { serverFetch } from '@/lib/apiServer';

interface PageProps {
  params: { id: string };
}

function fmtYen(n: number): string {
  if (!n) return '—';
  return `¥${n.toLocaleString('ja-JP')}`;
}

/**
 * 거래내역에서 PSA10 / 무등급(non-PSA) 의 최근 5건 평균을 계산.
 * 입력은 API 응답 그대로 (보통 최신순). PSA10 판정은 condition 우선, 없으면 label.
 */
function pickRecentAverage(
  history: ReadonlyArray<{ price: number; condition?: string; label?: string }>,
  predicate: (badge: string) => boolean,
  limit = 5,
): { avg: number; count: number } {
  const picked: number[] = [];
  for (const h of history) {
    const badge = (h.condition || h.label || '').trim();
    if (!predicate(badge)) continue;
    if (typeof h.price !== 'number' || h.price <= 0) continue;
    picked.push(h.price);
    if (picked.length >= limit) break;
  }
  if (picked.length === 0) return { avg: 0, count: 0 };
  const sum = picked.reduce((a, b) => a + b, 0);
  return { avg: Math.round(sum / picked.length), count: picked.length };
}

const PSA_GRADE_RE = /PSA\s*\d+/i;
const PSA10_RE = /PSA\s*10\b/i;

function fmtDateShort(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${yy}.${m}.${day}`;
}

function fmtYenCompact(n: number): string {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `¥${Math.round(n / 1000)}K`;
  return `¥${n.toLocaleString('en-US')}`;
}

/** 보기 좋게 반올림된 y 축 눈금 후보. */
function niceTicks(min: number, max: number, n = 4): number[] {
  if (!(max > min)) return [min];
  const range = max - min;
  const rough = range / (n - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(v);
  return out;
}

function PriceChart({
  points,
  unitLabel,
  rawCount,
  width = 320,
  height = 180,
}: {
  points: Array<[number, number]>;
  unitLabel: string;
  rawCount: number;
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

  const PAD_L = 50;
  const PAD_R = 10;
  const PAD_T = 14;
  const PAD_B = 28;
  const innerW = width - PAD_L - PAD_R;
  const innerH = height - PAD_T - PAD_B;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const dataMinY = Math.min(...ys);
  const dataMaxY = Math.max(...ys);
  const yTicks = niceTicks(dataMinY, dataMaxY, 4);
  const minY = yTicks[0];
  const maxY = yTicks[yTicks.length - 1];
  const rangeY = maxY - minY || 1;
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const rangeX = maxX - minX || 1;

  const xOf = (v: number) => PAD_L + ((v - minX) / rangeX) * innerW;
  const yOf = (v: number) => PAD_T + (1 - (v - minY) / rangeY) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p[0]).toFixed(1)},${yOf(p[1]).toFixed(1)}`)
    .join(' ');
  const areaPath =
    linePath +
    ` L${xOf(maxX).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${xOf(minX).toFixed(1)},${(
      PAD_T + innerH
    ).toFixed(1)} Z`;
  const trendUp = ys[ys.length - 1] >= ys[0];
  const color = trendUp ? 'var(--red)' : 'var(--blu)';
  const areaFill = trendUp ? 'rgba(230,57,70,.18)' : 'rgba(58,91,217,.18)';

  // x 축은 4등분 (시작, 1/3, 2/3, 끝).
  const xTickValues = [0, 1 / 3, 2 / 3, 1].map((t) => minX + t * rangeX);

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
        {/* Y 축 그리드 + 라벨 */}
        {yTicks.map((v) => {
          const y = yOf(v);
          return (
            <g key={`y-${v}`}>
              <line x1={PAD_L} y1={y} x2={width - PAD_R} y2={y} stroke="rgba(0,0,0,.08)" strokeWidth={1} />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                style={{ fontFamily: 'var(--f1)', fontSize: 7, fill: 'var(--ink3)' }}
              >
                {fmtYenCompact(v)}
              </text>
            </g>
          );
        })}

        {/* X 축 라벨 */}
        {xTickValues.map((tv, i) => {
          const x = xOf(tv);
          return (
            <g key={`x-${i}`}>
              <line
                x1={x}
                y1={PAD_T + innerH}
                x2={x}
                y2={PAD_T + innerH + 3}
                stroke="rgba(0,0,0,.3)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={PAD_T + innerH + 12}
                textAnchor={i === 0 ? 'start' : i === xTickValues.length - 1 ? 'end' : 'middle'}
                style={{ fontFamily: 'var(--f1)', fontSize: 7, fill: 'var(--ink3)' }}
              >
                {fmtDateShort(tv)}
              </text>
            </g>
          );
        })}

        {/* 데이터 line + area */}
        <path d={areaPath} fill={areaFill} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xOf(maxX)} cy={yOf(ys[ys.length - 1])} r="3" fill={color} />

        {/* 축 캡션 */}
        <text
          x={PAD_L}
          y={PAD_T - 4}
          textAnchor="start"
          style={{ fontFamily: 'var(--f1)', fontSize: 7, fill: 'var(--ink3)', letterSpacing: 0.3 }}
        >
          가격 (JPY)
        </text>
        <text
          x={width - PAD_R}
          y={height - 4}
          textAnchor="end"
          style={{ fontFamily: 'var(--f1)', fontSize: 7, fill: 'var(--ink3)', letterSpacing: 0.3 }}
        >
          거래일
        </text>
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontFamily: 'var(--f1)',
          fontSize: 8,
          color: 'var(--ink3)',
          letterSpacing: 0.3,
        }}
      >
        <span>
          기간: {fmtDateShort(minX)} ~ {fmtDateShort(maxX)} · {unitLabel} · 거래 {rawCount}건
        </span>
        <span>
          최저 ¥{dataMinY.toLocaleString('ja-JP')} · 최고 ¥{dataMaxY.toLocaleString('ja-JP')}
        </span>
      </div>
    </div>
  );
}

export default async function Page({ params }: PageProps) {
  const apparelId = Number(params.id);
  if (!Number.isInteger(apparelId) || apparelId <= 0) notFound();

  const seed = SNKRDUNK_FEATURED_CARDS.find((c) => c.apparelId === apparelId);
  const base = `/api/snkrdunk/apparels/${apparelId}`;
  const [apparelResp, historyResp, chartResp] = await Promise.all([
    serverFetch<{ data: SnkrdunkApparel | null }>(base, { auth: false }),
    serverFetch<{ data: SnkrdunkSalesHistory | null }>(`${base}/sales-history`, { auth: false }),
    serverFetch<{ data: SnkrdunkSalesChart | null }>(`${base}/sales-chart`, { auth: false }),
  ]);
  const apparel = apparelResp.data?.data ?? null;
  const salesHistory = historyResp.data?.data ?? null;
  const salesChart = chartResp.data?.data ?? null;
  if (!apparel) notFound();

  const displayName = seed?.shortName ?? apparel.localizedName;
  const koDisplayName = translateKnownCardNameToKo(apparel.localizedName);
  const allPoints = salesChart?.points ?? [];
  // 더 긴 기간을 한 화면에 보여주기 위해 기간 길이에 따라 주/월 평균으로 다운샘플링.
  // 짧은 데이터(≤60일)는 원본 그대로.
  const unit = priceDownsampleUnit(allPoints);
  const points = downsamplePricePoints(allPoints);
  const unitLabel =
    unit === 'monthly' ? '월 평균' : unit === 'weekly' ? '주 평균' : '거래 단위';
  const sectionMore =
    unit === 'raw'
      ? `최근 ${points.length}건`
      : `${points.length}${priceUnitLabelKo(unit)} 평균`;

  const history = salesHistory?.history ?? [];
  const rawAvg = pickRecentAverage(history, (b) => !PSA_GRADE_RE.test(b));
  const psa10Avg = pickRecentAverage(history, (b) => PSA10_RE.test(b));

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
        <SnkrdunkImageZoom src={apparel.imageUrl ?? null} alt={displayName} />
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
            {koDisplayName}
          </div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'var(--ink3)',
              letterSpacing: 0.2,
              marginBottom: 6,
              lineHeight: 1.45,
            }}
          >
            {apparel.localizedName}
          </div>
          {/* 일반/PSA10 평균을 한 줄에 — 라벨은 작게, 값은 컴팩트. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: '4px 10px',
              marginTop: 2,
              fontFamily: 'var(--f1)',
              fontSize: 11,
              letterSpacing: 0.3,
            }}
          >
            <span style={{ fontSize: 7, color: 'var(--ink3)' }}>일반</span>
            <span style={{ color: 'var(--red)' }}>{fmtYen(rawAvg.avg)}</span>
            <span style={{ fontSize: 7, color: 'var(--ink3)', marginLeft: 4 }}>PSA10</span>
            <span style={{ color: psa10Avg.avg > 0 ? 'var(--gold-dk, var(--orn))' : 'var(--ink3)' }}>
              {fmtYen(psa10Avg.avg)}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 8,
              color: 'var(--ink3)',
              marginTop: 6,
              letterSpacing: 0.3,
            }}
          >
            최저매물 {fmtYen(apparel.minPrice)}
            {apparel.listingCountText ? ` · 매물 ${apparel.listingCountText}건` : ''}
            {apparel.productNumber ? ` · ${apparel.productNumber}` : ''}
          </div>
        </div>
      </div>

      {/* 액션 — 컬렉션 추가 / 관심 / 스니덩크 외부링크 (한 줄, 컴팩트) */}
      <CardActions apparelId={apparelId} cardName={koDisplayName} />

      {/* Sales chart */}
      <div className="sect">
        <div className="sect-hd">
          <h2>시세 차트</h2>
          <span className="more">{sectionMore}</span>
        </div>
        <div
          style={{
            background: 'var(--white)',
            padding: 14,
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.9),5px 5px 0 var(--ink)',
          }}
        >
          <PriceChart points={points} unitLabel={unitLabel} rawCount={allPoints.length} />
        </div>
      </div>

      {/* Recent transactions — log style, one row per entry */}
      <div className="sect">
        <div className="sect-hd">
          <h2>최근 거래내역</h2>
          <span className="more">{salesHistory?.history.length ?? 0}건</span>
        </div>
        <div
          style={{
            background: 'var(--ink2)',
            padding: '6px 10px',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
          }}
        >
          {salesHistory && salesHistory.history.length > 0 ? (
            salesHistory.history.slice(0, 20).map((h, i, arr) => {
              const date = localizeSnkrdunkText(h.date);
              const label = localizeSnkrdunkText(h.label);
              const condition = h.condition;
              const badge = condition || label || '일반';
              const isPsa = /PSA\s*\d+/i.test(badge);
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 0',
                    borderBottom:
                      i < arr.length - 1 ? '1px solid rgba(255,255,255,.08)' : 'none',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      minWidth: 56,
                      textAlign: 'center',
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      padding: '2px 5px',
                      background: isPsa ? 'var(--gold)' : 'rgba(255,255,255,.12)',
                      color: isPsa ? 'var(--ink)' : 'var(--white)',
                      letterSpacing: 0.3,
                      border: isPsa ? '1px solid var(--ink)' : '1px solid rgba(255,255,255,.18)',
                    }}
                  >
                    {badge}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'var(--f1)',
                      fontSize: 10,
                      color: 'var(--gold)',
                      letterSpacing: 0.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {fmtYen(h.price)}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontFamily: 'var(--f1)',
                      fontSize: 8,
                      color: 'rgba(255,255,255,.55)',
                      letterSpacing: 0.3,
                    }}
                  >
                    {date}
                  </span>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: '20px 0',
                fontFamily: 'var(--f1)',
                fontSize: 9,
                color: 'rgba(255,255,255,.55)',
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
