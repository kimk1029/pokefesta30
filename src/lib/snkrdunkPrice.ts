/**
 * 스니덩크 카드 시세 계산 — 정본은 [[/shared/snkrdunkPrice.ts]] (웹·모바일·서버 공유).
 * 이 파일은 기존 `@/lib/snkrdunkPrice` import 경로 호환 re-export shim +
 * 웹/서버 fetcher 를 쓰는 편의 함수(fetchApparelPrices)만 보유.
 */
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkSalesHistory,
  fetchSnkrdunkSalesChart,
} from '@/lib/snkrdunk';
import { computeApparelPrices, type ApparelPrices } from '../../shared/snkrdunkPrice';

export * from '../../shared/snkrdunkPrice';

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
