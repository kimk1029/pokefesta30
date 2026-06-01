'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppBarUser } from '@/components/AppBarUser';
import { useCurrency } from '@/components/CurrencyProvider';
import type { HeroSlideData } from '@/components/HeroSlider';
import { HomeKoSearchBar } from '@/components/HomeKoSearchBar';
import { PortfolioLoginGate } from '@/components/PortfolioTotal';
import { usePriceMode } from '@/components/PriceModeProvider';
import { AppBar } from '@/components/ui/AppBar';
import { Panel } from '@/components/ui/Panel';
import { StatusBar } from '@/components/ui/StatusBar';
import { useTheme } from '@/components/ThemeProvider';
import { findCardEntry, type CardCatalogEntry } from '@/lib/cardsCatalog';
import type { MyCardWithPrice } from '@/lib/queries';

// ── 바로가기 클린 라인 아이콘 ───────────────────────────────────────────
// 모든 박스 테두리/그림자는 <Panel> 이 테마별로 관리한다(픽셀 인라인 섀도우 금지).

// 바로가기 색 키 → 클린 라인 아이콘 색(강/소프트 면).
const CLEAN_ICON_COLORS: Record<string, { fg: string; bg: string }> = {
  'var(--grn)': { fg: 'var(--accent)', bg: 'var(--accent-soft)' },
  'var(--gold)': { fg: 'var(--gold)', bg: 'var(--gold-soft)' },
  'var(--blu)': { fg: 'var(--blu)', bg: 'var(--blu-soft)' },
  'var(--red)': { fg: 'var(--red)', bg: 'var(--red-soft)' },
};

const lineIcon = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function ScanLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M4 9V6.5A1.5 1.5 0 0 1 5.5 5H8" />
      <path d="M16 5h2.5A1.5 1.5 0 0 1 20 6.5V9" />
      <path d="M20 15v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M8 19H5.5A1.5 1.5 0 0 1 4 17.5V15" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function PriceLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M4 13.5 11.5 6H18a1 1 0 0 1 1 1v6.5L11.5 21z" />
      <circle cx="14.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function AuctionLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M13.5 3.5 19 9l-2.5 2.5L11 6z" />
      <path d="M11.5 7.5 5 14" />
      <path d="M8 10.5 12 14.5" />
      <path d="M4 20.5h9" />
    </svg>
  );
}
function MarketLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M4.5 9 6 5h12l1.5 4" />
      <path d="M4.5 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 3 0" />
      <path d="M5.5 11v8h13v-8" />
      <path d="M10 19v-4h4v4" />
    </svg>
  );
}
function TradeLineIcon() {
  return (
    <svg {...lineIcon}>
      <path d="M5 8h12" />
      <path d="M14 5 17 8l-3 3" />
      <path d="M19 16H7" />
      <path d="M10 13 7 16l3 3" />
    </svg>
  );
}

export type SnkrdunkCategory = 'SAR' | '프로모' | 'SR' | '원피스';

export interface SnkrdunkRow {
  apparelId: number;
  shortName: string;
  /** 일본어 원문 (소제목 노출용). 비어 있으면 표시 생략. */
  localizedName?: string;
  category: SnkrdunkCategory | null;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

export interface PackHitCardRow {
  apparelId: number;
  shortName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

export interface PackRow {
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  bg: string;
  releasedAt?: string;
  hits: PackHitCardRow[];
  boxes?: PackHitCardRow[];
}

interface Props {
  cards: MyCardWithPrice[];
  heroBanners?: HeroSlideData[];
  isLoggedIn: boolean;
  snkrdunkRows?: SnkrdunkRow[];
  packs?: PackRow[];
}

const SNKR_CAT_BG: Record<SnkrdunkCategory, string> = {
  SAR: 'var(--orn)',
  프로모: 'var(--pur)',
  SR: 'var(--red)',
  원피스: 'var(--grn-dk)',
};
const SNKR_FALLBACK_BG = 'var(--ink2)';

type Rarity = 'C' | 'U' | 'R' | 'SR' | 'HR' | 'S';

const RAR_ORDER: Rarity[] = ['C', 'U', 'R', 'SR', 'HR', 'S'];
const RAR_COLORS: Record<Rarity, string> = {
  C: '#475569', U: '#22C55E', R: '#3A5BD9', SR: '#7C3AED', HR: '#EC4899', S: '#FFD23F',
};

const GAME_COLORS: Record<string, string> = {
  포켓몬: '#E63946', 유희왕: '#7C3AED', 원피스: '#F97316',
  MTG: '#22C55E', 스포츠: '#3A5BD9', 기타: '#94A3B8',
};

const POINTS = 1280;
const LEVEL_LABEL = 'LV.12 다이아 컬렉터';
const XP_CURRENT = 340;
const XP_MAX = 500;
const XP_WEEK = 80;
const TRADES_THIS_WEEK = 3;
type PortfolioChartMode = 'day' | 'week' | 'month';

interface PortfolioPoint {
  date: string;
  totalJpy: number;
}

const PORTFOLIO_MODE_LABEL: Record<PortfolioChartMode, string> = {
  day: '일',
  week: '주',
  month: '월',
};

const PORTFOLIO_MODE_HELP: Record<PortfolioChartMode, string> = {
  day: '일별 평가액',
  week: '주별 평가액',
  month: '월별 평가액',
};

/**
 * 컬렉션 전체의 일별 종합 가격(JPY 기준)을 계산.
 * - 스니덩크 카드(snkrdunkMinPriceJpy>0): JPY 그대로 사용.
 * - 카탈로그 카드(latestPrice>0, USD): trend[] 가 있으면 그걸로, 없으면 latestPrice 를 ~150 JPY 환율로 변환.
 * 결과는 오래된→최신 순서, 단위 = JPY.
 */
const USD_TO_JPY = 150;
function computeDailyTotals(
  cards: Array<{ latestPrice: number; trend: number[]; snkrdunkMinPriceJpy?: number }>,
  days: number,
): number[] {
  if (days <= 0) return [];
  const out = new Array(days).fill(0);
  for (const c of cards) {
    const snk = c.snkrdunkMinPriceJpy ?? 0;
    const t = Array.isArray(c.trend) ? c.trend : [];
    for (let i = 0; i < days; i++) {
      // i=0: 가장 오래된. i=days-1: 가장 최신.
      const tIdxFromEnd = days - 1 - i;
      const tIdx = t.length - 1 - tIdxFromEnd;
      const usdPrice = tIdx >= 0 && tIdx < t.length ? t[tIdx] : c.latestPrice;
      // snkrdunk JPY 가 우선, 없으면 USD * 환율.
      out[i] += snk > 0 ? snk : usdPrice * USD_TO_JPY;
    }
  }
  return out;
}

function dateKeyShift(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function syntheticPortfolioHistory(values: number[]): PortfolioPoint[] {
  return values.map((totalJpy, i) => ({
    date: dateKeyShift(values.length - 1 - i),
    totalJpy,
  }));
}

function weekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function aggregatePortfolioHistory(
  history: PortfolioPoint[],
  mode: PortfolioChartMode,
): PortfolioPoint[] {
  if (mode === 'day') return history.slice(-30);
  const limit = mode === 'week' ? 26 : 12;
  const keyOf = mode === 'week'
    ? (point: PortfolioPoint) => weekKey(point.date)
    : (point: PortfolioPoint) => point.date.slice(0, 7);
  const grouped = new Map<string, PortfolioPoint>();
  for (const point of history) {
    // 주식 차트의 종가처럼 해당 주/월의 마지막 스냅샷을 대표값으로 사용한다.
    grouped.set(keyOf(point), point);
  }
  return Array.from(grouped.values()).slice(-limit);
}

function KoreaMarketIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden
      style={{ display: 'block', shapeRendering: 'crispEdges' }}
    >
      <rect x="3" y="7" width="16" height="12" fill="#0F172A" />
      <rect x="5" y="9" width="12" height="8" fill="#FFFFFF" />
      <rect x="7" y="4" width="8" height="3" fill="#0F172A" />
      <rect x="8" y="2" width="6" height="3" fill="#FFFFFF" />
      <rect x="9" y="11" width="4" height="4" fill="#E63946" />
      <rect x="11" y="13" width="4" height="4" fill="#3A5BD9" />
      <rect x="6" y="11" width="2" height="2" fill="#0F172A" />
      <rect x="15" y="14" width="2" height="2" fill="#0F172A" />
    </svg>
  );
}
const ACTIVITY = [
  { icon: '🔥', c: 'var(--grn)', txt: '리자몽 EX 가격 ▲ +8%', time: '10분 전', pt: '+5P' },
  { icon: '📷', c: 'var(--blu)', txt: '카이바 슈라이 스캔 완료', time: '1시간 전', pt: '+10P' },
  { icon: '🤝', c: 'var(--gold)', txt: '피카츄 VMAX 거래 완료', time: '3시간 전', pt: '+15P' },
  { icon: '⭐', c: 'var(--pur)', txt: '레벨업! LV.12 달성', time: '어제', pt: '+50P' },
];

interface OwnedDisplay {
  id: number;
  cardId: string | null;
  catalog?: CardCatalogEntry;
  name: string;
  emoji: string;
  game: string;
  rar: Rarity;
  price: number;
  grade: number | null;
}

function rarOf(catalog: CardCatalogEntry | undefined): Rarity {
  if (!catalog) return 'C';
  switch (catalog.grade) {
    case 'S': return 'S';
    case 'A': return 'SR';
    case 'B': return 'R';
    default: return 'C';
  }
}

function parsePsa(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/PSA\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function fmt(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return Math.round(n).toLocaleString();
}

export function DashboardScreen({ cards, heroBanners, isLoggedIn, snkrdunkRows = [], packs = [] }: Props) {
  const { format } = useCurrency();
  const { theme } = useTheme();
  const isClean = theme === 'clean';
  const [chartMode, setChartMode] = useState<PortfolioChartMode>('day');
  const [activeGame, setActiveGame] = useState<string>('전체');

  // 실시간 포트폴리오 — 서버 일별 스냅샷 기반 등락 + history (KST 정각 reset).
  const [portfolio, setPortfolio] = useState<{
    totalJpy: number;
    totalPsa10Jpy: number;
    changeAbsJpy: number | null;
    changePct: number | null;
    history: PortfolioPoint[];
  } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/me/portfolio', { credentials: 'include', cache: 'no-store' });
        if (!alive || !r.ok) return;
        const j = (await r.json()) as {
          data?: {
            totalJpy: number;
            totalPsa10Jpy?: number;
            changeAbsJpy: number | null;
            changePct: number | null;
            history?: Array<{ date: string; totalJpy: number }>;
          };
        };
        if (!alive || !j.data) return;
        setPortfolio({
          totalJpy: j.data.totalJpy,
          totalPsa10Jpy: j.data.totalPsa10Jpy ?? 0,
          changeAbsJpy: j.data.changeAbsJpy,
          changePct: j.data.changePct,
          history: j.data.history ?? [],
        });
      } catch {
        /* 비로그인 등 — 폴백 (computeDailyTotals) 사용 */
      }
    })();
    return () => { alive = false; };
  }, []);

  // 가격 모드(싱글/PSA10) — /my/cards·상세와 동일한 전역 토글. 컬렉션에 PSA10 시세가
  // 하나라도 있어야 의미가 있으므로, 없으면 강제로 싱글. 모바일 홈과 동일 컨셉.
  const { mode: globalPriceMode, setMode: setPriceMode } = usePriceMode();
  const hasAnyPsa10 = cards.some((c) => c.pricePsa10Jpy > 0);
  const priceMode = hasAnyPsa10 ? globalPriceMode : 'single';
  // 한 카드의 표시 가격(JPY) — PSA10 모드면 PSA10 중앙값, 없으면 싱글로 폴백.
  const cardJpyByMode = (c: MyCardWithPrice): number => {
    const single = c.snkrdunkMinPriceJpy > 0 ? c.snkrdunkMinPriceJpy : c.latestPrice * USD_TO_JPY;
    return priceMode === 'psa10' && c.pricePsa10Jpy > 0 ? c.pricePsa10Jpy : single;
  };

  const owned: OwnedDisplay[] = cards.map((c) => {
    const catalog = c.cardId ? findCardEntry(c.cardId) : undefined;
    // price 는 JPY 단위로 통일 — 가격 모드(싱글/PSA10)에 따라 카드별 시세 선택.
    const priceJpy = cardJpyByMode(c);
    return {
      id: c.id,
      cardId: c.cardId,
      catalog,
      name: c.nickname || c.snkrdunkName || catalog?.name || '미식별 카드',
      emoji: catalog?.emoji ?? '🃏',
      game: catalog || c.snkrdunkApparelId ? '포켓몬' : '기타',
      rar: rarOf(catalog),
      price: priceJpy,
      grade: parsePsa(c.gradeEstimate),
    };
  });

  const graded = owned.filter((c) => c.grade !== null);
  const topCards = [...owned].sort((a, b) => b.price - a.price).slice(0, 3);

  const gamesPresent = Array.from(new Set(owned.map((c) => c.game)));
  const gameDist = gamesPresent.map((g) => ({
    g,
    n: owned.filter((c) => c.game === g).length,
    val: owned.filter((c) => c.game === g).reduce((a, c) => a + c.price, 0),
  }));

  // 컬렉션 평가액 차트 (오래된→최신). 서버 일별 스냅샷을 주식 차트처럼 일/주/월 종가로 집계한다.
  const fallbackChart = computeDailyTotals(cards, 30);
  const realHistory = portfolio?.history ?? [];
  const useReal = realHistory.length >= 2;
  const chartPoints = aggregatePortfolioHistory(
    useReal ? realHistory : syntheticPortfolioHistory(fallbackChart),
    chartMode,
  );
  const chartData = chartPoints.map((point) => point.totalJpy);
  // 모드별 총합 — 싱글: 기존 그대로(서버 총합 우선). PSA10: 서버 PSA10 총합이 있으면
  // 그걸, 없으면 보유 카드들의 PSA10(폴백 싱글) 합으로. (차트/등락은 서버 싱글 기준 유지.)
  const ownedTotalJpy = owned.reduce((a, c) => a + c.price, 0);
  const totalVal =
    priceMode === 'psa10'
      ? useReal && portfolio && portfolio.totalPsa10Jpy > 0
        ? portfolio.totalPsa10Jpy
        : ownedTotalJpy
      : useReal && portfolio
        ? portfolio.totalJpy
        : chartData[chartData.length - 1] ?? 0;
  const firstVal = chartData[0] ?? totalVal;
  const change = totalVal - firstVal;
  // 어제 대비 % (실 데이터). 없으면 차트 양끝 % 추정값.
  const changePct =
    portfolio?.changePct != null
      ? Math.round(portfolio.changePct)
      : firstVal > 0
        ? Math.round((change / firstVal) * 100)
        : 0;
  return (
    <>
      <StatusBar />
      <AppBar right={<AppBarUser />} />

      {/* ═══ HERO: PORTFOLIO CARD ═══ */}
      <Panel
        style={{
          margin: 'var(--gap) var(--gap) var(--cg)',
          background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1B2E89 100%)',
          padding: '18px 16px 16px', position: 'relative', overflow: 'hidden',
        }}
        pixelShadow="-4px 0 0 var(--ink),4px 0 0 var(--ink),0 -4px 0 var(--ink),0 4px 0 var(--ink),inset 0 4px 0 rgba(100,130,255,.18),inset 0 -5px 0 rgba(0,0,0,.55),9px 9px 0 var(--ink)"
      >
        {/* 픽셀 장식(스캔라인·코너 브래킷)은 클린에선 숨김 */}
        {!isClean && (
          <>
            {/* scanlines */}
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.07) 3px 4px)', pointerEvents: 'none' }} />
            {/* corner brackets */}
            <div style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, borderTop: '2px solid rgba(255,210,63,.5)', borderLeft: '2px solid rgba(255,210,63,.5)' }} />
            <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderTop: '2px solid rgba(255,210,63,.5)', borderRight: '2px solid rgba(255,210,63,.5)' }} />
            <div style={{ position: 'absolute', bottom: 6, left: 6, width: 14, height: 14, borderBottom: '2px solid rgba(255,210,63,.5)', borderLeft: '2px solid rgba(255,210,63,.5)' }} />
            <div style={{ position: 'absolute', bottom: 6, right: 6, width: 14, height: 14, borderBottom: '2px solid rgba(255,210,63,.5)', borderRight: '2px solid rgba(255,210,63,.5)' }} />
          </>
        )}

        {/* Label + value */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.35)', letterSpacing: 2 }}>
              TOTAL PORTFOLIO{hasAnyPsa10 ? ` · ${priceMode === 'psa10' ? 'PSA10' : '싱글'}` : ''}
            </div>
            {/* 싱글/PSA10 시세 토글 — PSA10 시세가 있는 카드가 하나라도 있을 때만.
                전역 모드라 /my/cards·상세와 동기화된다. */}
            {hasAnyPsa10 && (
              <div style={{ display: 'flex', gap: 2, position: 'relative', zIndex: 1 }}>
                {(['single', 'psa10'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPriceMode(m)}
                    style={{
                      padding: '3px 8px',
                      fontFamily: 'var(--f1)',
                      fontSize: 9,
                      letterSpacing: 0.5,
                      border: 'none',
                      cursor: 'pointer',
                      background: priceMode === m ? 'var(--gold)' : 'rgba(255,255,255,.08)',
                      color: priceMode === m ? 'var(--ink)' : 'rgba(255,210,63,.85)',
                    }}
                  >
                    {m === 'single' ? '싱글' : 'PSA10'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              fontFamily: 'var(--f1)', fontSize: 29, color: 'var(--gold)', letterSpacing: -2,
              textShadow: '0 0 24px rgba(255,210,63,.35),4px 4px 0 rgba(0,0,0,.5)', lineHeight: 1,
            }}>
              {format(totalVal)}
            </div>
            <div style={{ paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                  borderBottom: changePct >= 0 ? '8px solid #22C55E' : '8px solid transparent',
                  borderTop: changePct >= 0 ? 'none' : '8px solid #E63946',
                }} />
                <span style={{ fontFamily: 'var(--f1)', fontSize: 12, color: changePct >= 0 ? '#22C55E' : '#E63946', letterSpacing: .5 }}>
                  {changePct >= 0 ? '+' : ''}{changePct}%
                </span>
              </div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: .3 }}>
                {portfolio?.changePct != null ? 'vs 어제 (KST 정각)' : 'vs 지난주'}
              </div>
            </div>
          </div>
        </div>

        {/* Chart area — 컬렉션 일별 종합 가격 꺾은선 */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <PortfolioLineChart
            data={chartData}
            width={300}
            height={64}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, gap: 8 }}>
            <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.25)', letterSpacing: .3 }}>
              {PORTFOLIO_MODE_HELP[chartMode]}
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                  style={{
                    padding: '4px 9px', fontFamily: 'var(--f1)', fontSize: 10, letterSpacing: .5, cursor: 'pointer',
                    background: chartMode === mode ? 'var(--gold)' : 'rgba(255,255,255,.06)',
                    color: chartMode === mode ? 'var(--ink)' : 'rgba(255,255,255,.35)',
                    boxShadow: chartMode === mode
                      ? '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)'
                      : '0 0 0 1px rgba(255,255,255,.12)',
                    border: 'none',
                  }}
                >
                  {PORTFOLIO_MODE_LABEL[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 bottom stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, position: 'relative' }}>
          {[
            { l: '보유', v: owned.length + '장', c: 'rgba(255,255,255,.7)' },
            { l: '그레이딩', v: graded.length + '건', c: '#A78BFA' },
            { l: '포인트', v: POINTS.toLocaleString() + 'P', c: 'var(--gold)' },
            { l: '거래', v: TRADES_THIS_WEEK + '건', c: '#22C55E' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: 'rgba(255,255,255,.05)', padding: '9px 6px', boxShadow: '0 0 0 1px rgba(255,255,255,.08)', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 12, color: c, letterSpacing: .3, marginBottom: 5 }}>{v}</div>
              <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'rgba(255,255,255,.3)', letterSpacing: .3 }}>{l}</div>
            </div>
          ))}
        </div>
        {/* 미로그인 시 HERO 박스 전체에 dim+blur 오버레이 + 로그인 CTA */}
        {!isLoggedIn && <PortfolioLoginGate />}
      </Panel>

      {/* ═══ ACTION ZONE: SEARCH + SHORTCUTS ═══ */}
      <div style={{ margin: '0 var(--gap) var(--cg)' }}>
        <div className="sect-hd" style={{ marginBottom: 8 }}><h2>카드 검색</h2></div>
        <HomeKoSearchBar />
      </div>

      <div style={{ margin: '0 var(--gap) var(--cg)' }}>
        <div className="sect-hd" style={{ marginBottom: 8 }}><h2>바로가기</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6 }}>
          {([
            { icon: '📷' as ReactNode, cleanIcon: <ScanLineIcon />, lb: '스캔', bg: 'var(--grn)', href: '/cards/grading' },
            { icon: '¥' as ReactNode, cleanIcon: <PriceLineIcon />, lb: '시세확인', bg: 'var(--gold)', href: '/cards/packs' },
            { icon: '🔨' as ReactNode, cleanIcon: <AuctionLineIcon />, lb: 'MVC경매', bg: 'var(--blu)', href: '/cards/mvc-auction' },
            { icon: <KoreaMarketIcon />, cleanIcon: <MarketLineIcon />, lb: '국내마켓', bg: 'var(--red)', href: '/cards/bunjang' },
            { icon: '🤝' as ReactNode, cleanIcon: <TradeLineIcon />, lb: '거래', bg: 'var(--grn)', href: '/trade' },
          ]).map(({ icon, cleanIcon, lb, bg, href }) => {
            const cc = CLEAN_ICON_COLORS[bg] ?? CLEAN_ICON_COLORS['var(--grn)'];
            return (
              <Link key={lb} href={href} className="dash-quick">
                <div style={isClean
                  ? {
                      width: 40, height: 40, borderRadius: 14, background: cc.bg, color: cc.fg,
                      display: 'grid', placeItems: 'center',
                    }
                  : {
                      width: 32, height: 32, background: bg, display: 'grid', placeItems: 'center', fontSize: 17,
                      boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 3px 0 rgba(255,255,255,.3),inset 0 -2px 0 rgba(0,0,0,.25),3px 3px 0 var(--ink)',
                    }}>
                  {isClean ? cleanIcon : icon}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 10, lineHeight: 1.1, letterSpacing: 0, whiteSpace: 'nowrap' }}>{lb}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══ LEVEL · COMPACT ═══ — 한 줄로 LV/XP/포인트 모두 표시. */}
      <Panel style={{ margin: '0 var(--gap) var(--cg)', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              fontFamily: 'var(--f1)',
              fontSize: 11,
              color: 'var(--ink)',
              letterSpacing: 0.5,
              flexShrink: 0,
            }}
          >
            {LEVEL_LABEL}
          </div>
          <div
            style={{
              flex: 1,
              background: 'var(--pap2)',
              height: 8,
              position: 'relative',
              boxShadow: 'inset 1px 1px 0 rgba(0,0,0,.15)',
            }}
          >
            <div
              style={{
                width: `${Math.round((XP_CURRENT / XP_MAX) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg,var(--pur),var(--gold))',
              }}
            />
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', flexShrink: 0 }}>
            {XP_CURRENT}/{XP_MAX}
          </div>
          <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--gold-dk)', flexShrink: 0 }}>
            🪙{POINTS.toLocaleString()}
          </div>
        </div>
      </Panel>

      {/* ═══ 2×2 KEY METRICS ═══ */}
      <div className="sect">
        <div className="sect-hd"><h2>핵심 지표</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Block label="컬렉션 가치" value={format(totalVal)} sub={`▲ +${changePct}% 지난주`} color="var(--gold-dk)" icon="💰" />
          <Block label="그레이딩률" value={`${owned.length > 0 ? Math.round((graded.length / owned.length) * 100) : 0}%`} sub={`${graded.length} / ${owned.length}장`} color="var(--pur)" icon="🏆" />
          <Block label="최고가 카드" value={format(topCards[0]?.price || 0)} sub={topCards[0]?.name} color="var(--grn-dk)" icon="🎯" />
          <Block label="이번주 거래" value={`${TRADES_THIS_WEEK}건`} sub="+45P 포인트 획득" color="var(--blu)" icon="🤝" href="/feed" />
        </div>
      </div>

      {/* ═══ GAME DISTRIBUTION ═══ */}
      {gameDist.length > 0 && (
        <div className="sect">
          <div className="sect-hd"><h2>게임별 현황</h2></div>
          {/* Game selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 10, paddingBottom: 2 }}>
            {['전체', ...gameDist.map((x) => x.g)].map((g) => {
              const on = activeGame === g;
              const gameColor = g !== '전체' ? GAME_COLORS[g] || 'var(--white)' : 'var(--white)';
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGame(g)}
                  style={{
                    flexShrink: 0, fontFamily: 'var(--f1)', fontSize: 10, padding: '6px 11px', cursor: 'pointer',
                    letterSpacing: .3,
                    ...(isClean
                      ? {
                          borderRadius: 'var(--r-pill)',
                          border: `1px solid ${on ? 'transparent' : 'var(--pap3)'}`,
                          background: on ? (g !== '전체' ? gameColor : 'var(--accent)') : 'var(--white)',
                          color: on ? 'var(--white)' : 'var(--ink2)',
                          fontWeight: 700,
                          boxShadow: 'none',
                        }
                      : {
                          border: 'none',
                          background: on ? 'var(--ink)' : gameColor,
                          color: on ? 'var(--gold)' : (g !== '전체' ? 'var(--white)' : 'var(--ink)'),
                          boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),3px 3px 0 var(--ink)',
                        }),
                  }}
                >
                  {g === '전체' ? 'ALL' : g}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(activeGame === '전체' ? gameDist : gameDist.filter((x) => x.g === activeGame)).map(({ g, n, val }) => {
              const pct = owned.length > 0 ? Math.round((n / owned.length) * 100) : 0;
              const gGraded = owned.filter((c) => c.game === g && c.grade !== null).length;
              return (
                <Panel key={g} style={{
                  padding: '12px 12px',
                  // 클린에선 상단 색 액센트 제거 → 바로가기/핵심지표와 동일한 평평한 박스
                  ...(isClean ? {} : { borderTop: `4px solid ${GAME_COLORS[g] || 'var(--ink)'}` }),
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <div style={{ flex: 1, fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: .3 }}>{g}</div>
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 12, color: 'var(--ink3)', letterSpacing: .3 }}>{pct}%</div>
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 21, letterSpacing: -1, color: 'var(--ink)', marginBottom: 4 }}>
                    {n}<span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 4 }}>장</span>
                  </div>
                  <div style={{ fontFamily: 'var(--f1)', fontSize: 12, color: 'var(--grn-dk)', letterSpacing: .3, marginBottom: 8 }}>{format(val)}</div>
                  {/* rarity fill bar */}
                  <div style={{ display: 'flex', gap: 2, height: 8 }}>
                    {RAR_ORDER.map((r) => {
                      const rn = owned.filter((c) => c.game === g && c.rar === r).length;
                      if (!rn) return null;
                      return (
                        <div key={r} style={{
                          flex: rn, height: '100%', background: RAR_COLORS[r],
                          boxShadow: '-1px 0 0 var(--ink),0 -1px 0 var(--ink)',
                        }} />
                      );
                    })}
                  </div>
                  {gGraded > 0 && (
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--gold-dk)', marginTop: 6, letterSpacing: .3 }}>
                      🏆 그레이딩 {gGraded}건
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SNKRDUNK JP PRICES ═══ */}
      {snkrdunkRows.length > 0 && (
        <div className="sect">
          <div className="sect-hd">
            <h2>🔥 인기 카드들</h2>
            <Link href="/cards/snkrdunk" className="more">전체 ▶</Link>
          </div>
          {/* 좌/우 padding 으로 첫·마지막 카드의 box-shadow 가 잘리지 않도록 여백 확보. */}
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 6px 8px' }}>
            {snkrdunkRows.map((r) => {
              const bg = r.category ? SNKR_CAT_BG[r.category] : SNKR_FALLBACK_BG;
              const priceText = r.minPrice > 0 ? format(r.minPrice) : '—';
              const showJp = r.localizedName && r.localizedName !== r.shortName;
              return (
                <Panel
                  key={r.apparelId}
                  href={`/cards/snkrdunk/${r.apparelId}`}
                  style={{
                    flexShrink: 0, width: 108, cursor: 'pointer', overflow: 'hidden',
                    ...(isClean ? {} : { borderTop: `4px solid ${bg}` }),
                  }}
                >
                  <div style={{
                    height: 92, background: 'var(--pap2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}>
                    {r.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.imageUrl}
                        alt={r.shortName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 33 }}>🃏</span>
                    )}
                  </div>
                  <div style={{
                    padding: '7px 8px 9px',
                    borderTop: isClean ? '1px solid var(--pap3)' : '3px solid var(--ink)',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    <div style={{ minHeight: 16, marginBottom: 5 }}>
                      {r.category ? (
                        <span style={{
                          fontFamily: 'var(--f1)', fontSize: 9, padding: '2px 4px', display: 'inline-block',
                          background: bg, color: 'var(--white)', letterSpacing: 0.3,
                          boxShadow: '-1px 0 0 var(--ink),1px 0 0 var(--ink),0 -1px 0 var(--ink),0 1px 0 var(--ink)',
                        }}>{r.category}</span>
                      ) : null}
                    </div>
                    <div style={{
                      fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: 0.2, marginBottom: 3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{r.shortName}</div>
                    {showJp ? (
                      <div style={{
                        fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)',
                        letterSpacing: 0.2, marginBottom: 4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{r.localizedName}</div>
                    ) : null}
                    <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--red)', letterSpacing: 0.3 }}>
                      {priceText}
                    </div>
                    <div style={{
                      fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)',
                      marginTop: 3, letterSpacing: 0.3, minHeight: 11,
                    }}>
                      {r.listingCountText ? `매물 ${r.listingCountText}건` : ''}
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ACTIVITY LOG ═══ */}
      <div className="sect">
        <div className="sect-hd"><h2>최근 활동</h2></div>
        <Panel style={{ padding: '14px 14px 6px' }}>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i < ACTIVITY.length - 1
                ? (isClean ? '1px solid var(--line2)' : '2px solid var(--bg3)')
                : 'none',
            }}>
              <div style={isClean
                ? {
                    width: 34, height: 34, borderRadius: 12, background: a.c, color: 'var(--white)',
                    display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0,
                  }
                : {
                    width: 32, height: 32, background: a.c, display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0,
                    boxShadow: '-2px 0 0 var(--ink),2px 0 0 var(--ink),0 -2px 0 var(--ink),0 2px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.35),inset 0 -2px 0 rgba(0,0,0,.3),3px 3px 0 var(--ink)',
                  }}>
                {a.icon}
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: .3, lineHeight: 1.5 }}>{a.txt}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--gold-dk)', letterSpacing: .3 }}>{a.pt}</div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', letterSpacing: .3 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <div className="bggap" />
    </>
  );
}

interface BlockProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: string;
  href?: string;
}

function Block({ label, value, sub, color, icon, href }: BlockProps) {
  const inner = (
    <>
      {icon && <div style={{ position: 'absolute', right: 10, top: 10, fontSize: 19, opacity: .15 }}>{icon}</div>}
      <div style={{ fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)', letterSpacing: .5 }}>{label}</div>
      <div
        style={{
          fontFamily: 'var(--f1)',
          fontSize: 19,
          color: color || 'var(--ink)',
          letterSpacing: -1,
          lineHeight: 1.1,
          textShadow: color ? '1px 1px 0 rgba(0,0,0,.15)' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'var(--f1)',
            fontSize: 10,
            color: 'var(--ink3)',
            letterSpacing: 0.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </div>
      )}
    </>
  );
  // 4 칸 동일 높이 — minHeight 로 통일. 박스 테두리/그림자는 Panel 이 테마별로.
  const baseStyle: React.CSSProperties = {
    padding: '14px 12px',
    minHeight: 96,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 5,
    position: 'relative',
    overflow: 'hidden',
  };
  return (
    <Panel href={href} style={baseStyle}>
      {inner}
    </Panel>
  );
}

function PackHitsSectionBlock({ pack }: { pack: PackRow }) {
  const { format } = useCurrency();
  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          background: pack.bg, color: 'var(--white)',
          boxShadow:
            '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.45),inset 0 -2px 0 rgba(0,0,0,.25),4px 4px 0 var(--ink)',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 19 }}>{pack.emoji}</span>
        <span style={{ fontFamily: 'var(--f1)', fontSize: 12, letterSpacing: 0.5, flex: 1 }}>{pack.shortName}</span>
        {pack.releasedAt ? (
          <span style={{ fontFamily: 'var(--f1)', fontSize: 9, opacity: 0.8, letterSpacing: 0.3 }}>
            {pack.releasedAt.slice(0, 7).replace('-', '.')}
          </span>
        ) : null}
        <Link
          href={`/cards/packs/${pack.code}`}
          style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--white)', letterSpacing: 0.3, textDecoration: 'underline' }}
        >
          전체 ▶
        </Link>
      </div>
      {pack.hits.length === 0 ? (
        <div
          style={{
            padding: 24, textAlign: 'center', background: 'var(--white)',
            fontFamily: 'var(--f1)', fontSize: 10, color: 'var(--ink3)',
            boxShadow:
              '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),5px 5px 0 var(--ink)',
          }}
        >
          매물 확인 중…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
            paddingBottom: 4,
          }}
        >
          {pack.hits.map((hit) => (
            <Link
              key={hit.apparelId}
              href={`/cards/snkrdunk/${hit.apparelId}`}
              style={{
                minWidth: 0, textDecoration: 'none', color: 'inherit',
                background: 'var(--white)',
                boxShadow:
                  '-3px 0 0 var(--ink),3px 0 0 var(--ink),0 -3px 0 var(--ink),0 3px 0 var(--ink),inset 0 2px 0 rgba(255,255,255,.7),5px 5px 0 var(--ink)',
                borderTop: `4px solid ${pack.bg}`,
              }}
            >
              <div
                style={{
                  height: 92, background: 'var(--pap2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              >
                {hit.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hit.imageUrl} alt={hit.shortName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 33 }}>🃏</span>
                )}
              </div>
              <div style={{ padding: '7px 8px 9px', borderTop: '3px solid var(--ink)' }}>
                <div
                  style={{
                    fontFamily: 'var(--f1)', fontSize: 11, letterSpacing: 0.2, marginBottom: 4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {hit.shortName}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 11, color: 'var(--red)', letterSpacing: 0.3 }}>
                  {hit.minPrice > 0 ? format(hit.minPrice) : '—'}
                </div>
                <div style={{ fontFamily: 'var(--f1)', fontSize: 9, color: 'var(--ink3)', marginTop: 3, letterSpacing: 0.3, minHeight: 11 }}>
                  {hit.listingCountText ? `매물 ${hit.listingCountText}건` : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 포트폴리오 일별 종합 가격 꺾은선 차트.
 * data: 오래된→최신 순. 점은 첫/마지막/최고/최저만 표시.
 */
function PortfolioLineChart({
  data,
  width = 300,
  height = 64,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div
        style={{
          width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--f1)', fontSize: 10, color: 'rgba(255,255,255,.35)', letterSpacing: 0.3,
          borderBottom: '1px solid rgba(255,255,255,.1)',
        }}
      >
        시세 이력이 부족합니다
      </div>
    );
  }

  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const minV = Math.min(...data);
  const maxV = Math.max(...data);
  const range = maxV - minV || 1;
  const stepX = innerW / (data.length - 1);
  const xOf = (i: number) => pad + i * stepX;
  const yOf = (v: number) => pad + innerH - ((v - minV) / range) * innerH;

  const pointsAttr = data.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const areaPath = [
    `M${pad},${pad + innerH}`,
    ...data.map((v, i) => `L${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`),
    `L${pad + innerW},${pad + innerH}`,
    'Z',
  ].join(' ');

  const lastV = data[data.length - 1];
  const lastX = xOf(data.length - 1);
  const lastY = yOf(lastV);
  const trendUp = lastV >= data[0];
  const stroke = trendUp ? 'var(--gold)' : '#E63946';
  const fill = trendUp ? 'rgba(255,210,63,0.22)' : 'rgba(230,57,70,0.18)';

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block', borderBottom: '1px solid rgba(255,255,255,.1)' }}
      aria-label="포트폴리오 차트"
    >
      <path d={areaPath} fill={fill} stroke="none" />
      <polyline
        points={pointsAttr}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* 최신 시점 강조 */}
      <circle cx={lastX} cy={lastY} r={3.2} fill={stroke} stroke="var(--ink)" strokeWidth={1} />
    </svg>
  );
}
