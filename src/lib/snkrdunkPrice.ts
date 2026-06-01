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
  type SnkrdunkSaleEntry,
} from '@/lib/snkrdunk';

const PSA10_RE = /PSA\s*10\b/i;
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
