/**
 * UserCard 목록을 카탈로그 + 시세 스냅샷과 결합해 대시보드 표시용 통계로 환산.
 * 가격 정보가 없는 카드는 0원으로 합산 (포트폴리오 추정만 한다는 점을 UI 에 명시).
 *
 * 모의 12주 변화율은 "지난 7일 평균 vs 그 이전 평균" 으로 추정하되,
 * 데이터가 부족하면 ±0% 로 폴백. 실제 시계열은 DB 시세 스냅샷이 쌓이면서 정밀해짐.
 */

import type { CardCatalogEntry } from '@/lib/cardsCatalog';

export interface CardWithPrice {
  /** UserCard 행 id (그리드 키 등) */
  id: number;
  cardId: string | null;
  catalog?: CardCatalogEntry;
  nickname?: string | null;
  gradeEstimate?: string | null;
  /** USD price (최근 시세 스냅샷). 데이터 없으면 0. */
  price: number;
  /** 7일 trend — 데이터 부족시 빈 배열 */
  trend: number[];
}

export function summarize(cards: CardWithPrice[]) {
  const totalVal = cards.reduce((sum, c) => sum + (c.price || 0), 0);
  const graded = cards.filter((c) => Boolean(c.gradeEstimate));
  const withPrice = cards.filter((c) => c.price > 0);
  const topCard = withPrice.length > 0
    ? withPrice.slice().sort((a, b) => b.price - a.price)[0]
    : null;

  // 가짜 변화율: 카드별 trend 끝값 - 시작값 합산.
  let weekDelta = 0;
  for (const c of cards) {
    if (c.trend.length >= 2) {
      weekDelta += c.trend[c.trend.length - 1] - c.trend[0];
    }
  }
  const prevVal = totalVal - weekDelta;
  const deltaPct = prevVal > 0 ? Math.round((weekDelta / prevVal) * 100) : 0;

  return {
    totalVal,
    weekDelta,
    deltaPct,
    cardCount: cards.length,
    gradedCount: graded.length,
    gradedPct: cards.length > 0 ? Math.round((graded.length / cards.length) * 100) : 0,
    topCard,
  };
}

/** 12주 미니 차트용 시퀀스 — 진짜 시계열이 없으면 마지막 값까지 부드럽게 상승하는 폴백. */
export function build12wSeries(totalVal: number, deltaPct: number): number[] {
  const start = totalVal * (1 - Math.min(0.4, Math.abs(deltaPct) / 100));
  const end = totalVal;
  if (totalVal <= 0) return new Array(12).fill(60);
  const series: number[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    series.push(start + (end - start) * t);
  }
  // 정규화 0..100
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  return series.map((v) => Math.round(((v - min) / span) * 60 + 40));
}
