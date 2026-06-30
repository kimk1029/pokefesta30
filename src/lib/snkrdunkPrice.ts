/**
 * 스니덩크 카드 시세 계산 — "최근 체결 중앙값" 단일 진실의 원천.
 *
 * 스캔 매칭 후보 / 내 컬렉션(getMyCardsWithPrices) / 포트폴리오가 모두 이 함수를
 * 써서 같은 카드에 같은 가격을 보여주도록 한다(불일치 방지).
 *
 * 규칙:
 *  - raw(비등급) 최근 체결 중앙값을 단가로 사용.
 *  - PSA 등급 체결은 분리(별도 PSA10 중앙값). raw 단가 계산에서 제외.
 *  - sales-chart/used 시리즈엔 등급 체결이 섞여 끝점이 튀므로, raw 중앙값의 2.5배
 *    초과 포인트는 등급 거래로 보고 제외.
 *  - raw 체결이 없으면: (등급 체결만 있으면) 0 으로 둬 오염 차단, 아니면 차트 끝점
 *    → 최저매물(minPrice) 순으로 폴백.
 */
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkSalesHistory,
  fetchSnkrdunkSalesChart,
  isGradedSnkrdunkBadge,
  type SnkrdunkSaleEntry,
} from '@/lib/snkrdunk';

const PSA10_RE = /PSA\s*10\b/i;
const PSA9_RE = /PSA\s*9\b/i;
const PSA_ANY_RE = /PSA\s*\d+/i;

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export interface ApparelPrices {
  /** raw(비등급) 최근 체결 중앙값. 데이터 없으면 0. */
  single: number;
  /** PSA10 최근 체결 중앙값. 없으면 0. */
  psa10: number;
  /** 차트 일별 시세 시리즈(오래된→최신), 등급 오염 포인트 제외. */
  trendJpy: number[];
}

/** 이미 받아온 sales history/chart + minPrice 로 시세를 계산(순수 함수). */
export function computeApparelPrices(
  history: SnkrdunkSaleEntry[],
  chartPoints: Array<[number, number]>,
  minPrice: number,
): ApparelPrices {
  const pickPrices = (predicate: (badge: string) => boolean) =>
    history
      .filter((h) => typeof h.price === 'number' && h.price > 0)
      .filter((h) => predicate((h.condition || h.label || '').trim()))
      .map((h) => h.price)
      .slice(0, 7);

  const psa10Prices = pickPrices((b) => PSA10_RE.test(b));
  const rawMedian = median(pickPrices((b) => !PSA_ANY_RE.test(b)));
  const rawCeil = rawMedian > 0 ? rawMedian * 2.5 : Infinity;
  const trendJpy = (chartPoints ?? [])
    .map((p) => p[1])
    .filter((n) => typeof n === 'number' && n > 0 && n <= rawCeil);
  const hasGradedSales = pickPrices((b) => PSA_ANY_RE.test(b)).length > 0;

  let single = rawMedian;
  if (single === 0 && !hasGradedSales) {
    single = trendJpy.length > 0 ? trendJpy[trendJpy.length - 1] : 0;
    if (single === 0 && typeof minPrice === 'number' && minPrice > 0) {
      single = minPrice;
    }
  }
  return { single, psa10: median(psa10Prices), trendJpy };
}

/** 한 등급의 최근가/평균/최저/건수 집계. (history 는 최신순 전제) — 시세상세와 공유. */
export interface SnkrGradeAgg {
  /** 'PSA 10' | 'PSA 9' | 'RAW' */
  key: string;
  recent: number;
  avg: number;
  low: number;
  count: number;
}

/** 거래내역에서 한 등급의 최근가/평균/최저/건수 집계. (history 는 최신순 전제) */
export function gradeAgg(
  history: ReadonlyArray<{ price: number; condition?: string; label?: string }>,
  predicate: (badge: string) => boolean,
  key: string,
): SnkrGradeAgg {
  const matches = history
    .filter((h) => typeof h.price === 'number' && h.price > 0)
    .filter((h) => predicate((h.condition || h.label || '').trim()))
    .map((h) => h.price);
  if (matches.length === 0) return { key, recent: 0, avg: 0, low: 0, count: 0 };
  const top5 = matches.slice(0, 5);
  const avg = Math.round(top5.reduce((a, b) => a + b, 0) / top5.length);
  const low = Math.min(...matches.slice(0, 10));
  return { key, recent: matches[0], avg, low, count: matches.length };
}

/**
 * 시세상세 헤드라인과 동일한 '대표 시세' — 거래가 가장 많은 등급의 최근 체결가
 * (없으면 평균 → 최저매물 순 폴백). CardDetailView 의 기본 헤드라인 계산과 일치.
 */
export function headlinePriceFromHistory(history: SnkrdunkSaleEntry[], minPrice: number): number {
  const grades = [
    gradeAgg(history, (b) => PSA10_RE.test(b), 'PSA 10'),
    gradeAgg(history, (b) => PSA9_RE.test(b), 'PSA 9'),
    gradeAgg(history, (b) => !isGradedSnkrdunkBadge(b), 'RAW'),
  ];
  const sel =
    grades.slice().sort((a, b) => b.count - a.count).find((g) => g.count > 0) ??
    grades[grades.length - 1];
  return sel?.recent || sel?.avg || minPrice || 0;
}

/**
 * 판매 차트 포인트에서 등락률(%)을 계산. 등급 체결 스파이크는 중앙값 2.5배 초과 컷으로
 * 제외(used 차트 오염 방지). 유효 포인트가 2개 미만이면 undefined.
 * 기간 시작(첫 유효 포인트) → 최신 시세 변화율.
 */
export function trendChangePct(points: Array<[number, number]>): number | undefined {
  const ys = (points ?? []).map((p) => p[1]).filter((n) => typeof n === 'number' && n > 0);
  if (ys.length < 2) return undefined;
  const med = median(ys);
  const ceil = med > 0 ? med * 2.5 : Infinity;
  const clean = ys.filter((n) => n <= ceil);
  if (clean.length < 2) return undefined;
  const first = clean[0];
  const last = clean[clean.length - 1];
  if (first <= 0) return undefined;
  return ((last - first) / first) * 100;
}

/** apparelId 로 apparel/sales 를 받아 시세를 계산. */
export async function fetchApparelPrices(apparelId: number): Promise<ApparelPrices> {
  const [a, hist, chart] = await Promise.all([
    fetchSnkrdunkApparel(apparelId),
    fetchSnkrdunkSalesHistory(apparelId).catch(() => null),
    fetchSnkrdunkSalesChart(apparelId).catch(() => null),
  ]);
  return computeApparelPrices(hist?.history ?? [], chart?.points ?? [], a?.minPrice ?? 0);
}

/** 스캔 후보용 — raw 싱글 체결 중앙값(JPY)만. 데이터 없으면 0. */
export async function fetchApparelSingleJpy(apparelId: number): Promise<number> {
  const { single } = await fetchApparelPrices(apparelId);
  return single;
}
