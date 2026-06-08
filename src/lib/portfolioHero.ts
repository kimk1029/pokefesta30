/**
 * 토탈 포트폴리오 hero 의 데이터 계산 — 홈(DashboardScreen)과 내 컬렉션(MyCardsScreen)
 * 양쪽에서 동일하게 사용. 순수 함수만 모아 두 화면의 표시값이 어긋나지 않게 한다.
 */
import { findCardEntry, type CardCatalogEntry } from '@/lib/cardsCatalog';
import type { MyCardWithPrice } from '@/lib/queries';

export const USD_TO_JPY = 150;

export type PortfolioChartMode = 'day' | 'week' | 'month';

export interface PortfolioPoint {
  date: string;
  totalJpy: number;
}

export const PORTFOLIO_MODE_LABEL: Record<PortfolioChartMode, string> = {
  day: '일',
  week: '주',
  month: '월',
};

export type HeroRarity = 'C' | 'U' | 'R' | 'SR' | 'HR' | 'S';

export interface OwnedDisplay {
  id: number;
  cardId: string | null;
  catalog?: CardCatalogEntry;
  name: string;
  emoji: string;
  game: string;
  rar: HeroRarity;
  price: number;
  grade: number | null;
}

export interface ServerPortfolio {
  totalJpy: number;
  totalPsa10Jpy: number;
  changeAbsJpy: number | null;
  changePct: number | null;
  history: PortfolioPoint[];
}

export interface HeroData {
  owned: OwnedDisplay[];
  graded: OwnedDisplay[];
  topCards: OwnedDisplay[];
  hasAnyPsa10: boolean;
  priceMode: 'single' | 'psa10';
  totalVal: number;
  change: number;
  changePct: number;
  chartData: number[];
}

function rarOf(catalog: CardCatalogEntry | undefined): HeroRarity {
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

/**
 * 컬렉션 전체의 일별 종합 가격(JPY 기준)을 계산.
 * - 스니덩크 카드(snkrdunkMinPriceJpy>0): JPY 그대로 사용.
 * - 카탈로그 카드(latestPrice>0, USD): trend[] 가 있으면 그걸로, 없으면 latestPrice 를 ~150 JPY 환율로 변환.
 * 결과는 오래된→최신 순서, 단위 = JPY.
 */
export function computeDailyTotals(
  cards: Array<{ latestPrice: number; trend: number[]; snkrdunkMinPriceJpy?: number }>,
  days: number,
): number[] {
  if (days <= 0) return [];
  const out = new Array(days).fill(0);
  for (const c of cards) {
    const snk = c.snkrdunkMinPriceJpy ?? 0;
    const t = Array.isArray(c.trend) ? c.trend : [];
    for (let i = 0; i < days; i++) {
      const tIdxFromEnd = days - 1 - i;
      const tIdx = t.length - 1 - tIdxFromEnd;
      const usdPrice = tIdx >= 0 && tIdx < t.length ? t[tIdx] : c.latestPrice;
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
    grouped.set(keyOf(point), point);
  }
  return Array.from(grouped.values()).slice(-limit);
}

/**
 * 보유 카드 + 서버 포트폴리오 응답으로부터 hero 표시에 필요한 모든 값을 계산.
 * globalPriceMode 가 'psa10' 이어도 PSA10 시세가 하나도 없으면 강제로 'single'.
 */
export function buildHeroData(
  cards: MyCardWithPrice[],
  portfolio: ServerPortfolio | null,
  globalPriceMode: 'single' | 'psa10',
  chartMode: PortfolioChartMode,
): HeroData {
  const hasAnyPsa10 = cards.some((c) => c.pricePsa10Jpy > 0);
  const priceMode: 'single' | 'psa10' = hasAnyPsa10 ? globalPriceMode : 'single';

  const cardJpyByMode = (c: MyCardWithPrice): number => {
    const single = c.snkrdunkMinPriceJpy > 0 ? c.snkrdunkMinPriceJpy : c.latestPrice * USD_TO_JPY;
    return priceMode === 'psa10' && c.pricePsa10Jpy > 0 ? c.pricePsa10Jpy : single;
  };

  const owned: OwnedDisplay[] = cards.map((c) => {
    const catalog = c.cardId ? findCardEntry(c.cardId) : undefined;
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

  const fallbackChart = computeDailyTotals(cards, 30);
  const realHistory = portfolio?.history ?? [];
  const useReal = realHistory.length >= 2;
  const chartPoints = aggregatePortfolioHistory(
    useReal ? realHistory : syntheticPortfolioHistory(fallbackChart),
    chartMode,
  );
  const chartData = chartPoints.map((point) => point.totalJpy);

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
  const changePct =
    portfolio?.changePct != null
      ? Math.round(portfolio.changePct)
      : firstVal > 0
        ? Math.round((change / firstVal) * 100)
        : 0;

  return { owned, graded, topCards, hasAnyPsa10, priceMode, totalVal, change, changePct, chartData };
}
