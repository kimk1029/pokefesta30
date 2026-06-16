/** 서버 쿼리 결과 타입 (서버 구현은 server/lib/queries.ts). */

export interface MyCardRow {
  id: number;
  cardId: string | null;
  ocrSetCode: string | null;
  ocrCardNumber: string | null;
  snkrdunkApparelId: number | null;
  nickname: string | null;
  memo: string | null;
  gradeEstimate: string | null;
  centeringScore: number | null;
  photoUrl: string | null;
  /** 등록 시점 싱글 시세(JPY) 기준값 — 리스트 등락률용. 없으면 null. */
  registerPriceJpy: number | null;
  createdAt: string;
}

export interface MyCardWithPrice extends MyCardRow {
  latestPrice: number;
  /** 최근 7개 스냅샷 평균값들 (오래된 → 최신). 데이터 부족 시 빈 배열. */
  trend: number[];
  /** snkrdunkApparelId 가 있을 때만 채워짐. */
  snkrdunkName: string | null;
  snkrdunkImageUrl: string | null;
  /** 호환용 — priceSingleJpy 와 동일. */
  snkrdunkMinPriceJpy: number;
  /** 싱글카드 (raw, non-PSA10) 중앙값 시세. */
  priceSingleJpy: number;
  /** PSA10 중앙값 시세. 데이터 없으면 0. */
  pricePsa10Jpy: number;
}

export interface MyFavoriteRow {
  id: number;
  snkrdunkApparelId: number;
  createdAt: string;
  name: string | null;
  imageUrl: string | null;
  minPriceJpy: number;
}
