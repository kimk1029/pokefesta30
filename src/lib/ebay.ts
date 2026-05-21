/** eBay 시세 타입 (서버 구현은 server/lib/ebay.ts). */

export interface EbayItemSummary {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  webUrl: string;
  thumb?: string;
}

export interface EbayPriceSnapshot {
  low: number;
  avg: number;
  median: number;
  high: number;
  sampleN: number;
  currency: string;
  marketplace: string;
  items: EbayItemSummary[];
}
