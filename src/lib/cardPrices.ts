/** 카드 시세 타입 (서버 구현은 server/lib/cardPrices.ts). 클라이언트는 fetch 결과를 이 타입으로 받는다. */

export interface EbayItemSummary {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  webUrl: string;
  thumb?: string;
}

export interface PriceSnapshotOut {
  cardId: string;
  currency: string;
  low: number;
  avg: number;
  median: number;
  high: number;
  sampleN: number;
  fetchedAt: string;
}

export interface PriceCurrent extends PriceSnapshotOut {
  items?: EbayItemSummary[];
}

export interface HistoryPoint {
  t: string;
  avg: number;
  low: number;
  high: number;
}
