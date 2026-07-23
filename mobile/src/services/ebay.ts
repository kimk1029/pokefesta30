/**
 * eBay 시세 스냅샷 — 웹 /cards/search 카드 모드의 eBay 섹션과 동일한
 * 서버 API(/api/cards/ebay-search)를 호출한다. 쿼리는 영문(translate q→en).
 * 타입은 server/lib/ebay.ts 응답 형태(웹 src/lib/ebay.ts와 동일)를 미러.
 */
import { api } from '@/lib/apiClient';

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

export interface EbaySearchResp {
  configured: boolean;
  data: EbayPriceSnapshot | null;
}

export async function fetchEbaySnapshot(enQuery: string, limit = 20): Promise<EbaySearchResp> {
  return api<EbaySearchResp>(
    `/api/cards/ebay-search?q=${encodeURIComponent(enQuery)}&limit=${limit}`,
    { auth: false },
  );
}
