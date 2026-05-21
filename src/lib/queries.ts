/** 서버 쿼리 결과 타입 (서버 구현은 server/lib/queries.ts). */

export interface MyCardRow {
  id: number;
  cardId: string | null;
  ocrSetCode: string | null;
  ocrCardNumber: string | null;
  nickname: string | null;
  memo: string | null;
  gradeEstimate: string | null;
  centeringScore: number | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface MyCardWithPrice extends MyCardRow {
  latestPrice: number;
  /** 최근 7개 스냅샷 평균값들 (오래된 → 최신). 데이터 부족 시 빈 배열. */
  trend: number[];
}
