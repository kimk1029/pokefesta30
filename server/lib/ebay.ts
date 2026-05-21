/**
 * eBay Browse API 연동 — client_credentials OAuth + 아이템 검색 + 가격 집계.
 *
 * 환경변수(설정 전에는 모든 함수가 null 반환):
 *   EBAY_CLIENT_ID        — App ID (developer.ebay.com 에서 발급)
 *   EBAY_CLIENT_SECRET    — Cert ID
 *   EBAY_MARKETPLACE_ID   — 기본 'EBAY_US' (EBAY_KR 는 미지원)
 *   EBAY_OAUTH_SCOPE      — 기본 'https://api.ebay.com/oauth/api_scope'
 *   EBAY_ENV              — 'production' (기본) | 'sandbox'
 *
 * 토큰은 모듈 메모리에 캐시 (만료 1분 전까지 재사용).
 * Browse API 는 현재 리스팅 기반이라 "체결가(sold)"가 아닌 "호가(asks)" 기반 통계임에 유의.
 */

const SANDBOX = process.env.EBAY_ENV === 'sandbox';
const API_HOST = SANDBOX ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
const SCOPE = process.env.EBAY_OAUTH_SCOPE ?? 'https://api.ebay.com/oauth/api_scope';

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string | null> {
  const cid = process.env.EBAY_CLIENT_ID;
  const cs = process.env.EBAY_CLIENT_SECRET;
  if (!cid || !cs) return null;

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) return tokenCache.token;

  const basic = Buffer.from(`${cid}:${cs}`).toString('base64');
  const res = await fetch(`${API_HOST}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE)}`,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[ebay] token fetch failed', res.status, text.slice(0, 200));
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return tokenCache.token;
}

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
  fetchedAt: Date;
}

export interface SearchOptions {
  marketplace?: string;
  limit?: number;
  /** 가격 outlier 제거용 trim 비율(양쪽 꼬리). 0.1 이면 상·하위 10% 제거. */
  trim?: number;
}

/**
 * eBay Browse API 에서 쿼리 결과를 받아 가격 통계를 반환.
 * - 키 미설정 또는 실패 시 null.
 * - items 는 저장용이 아니라 링크용으로 상위 10개만 포함.
 */
export async function searchEbayPrices(
  query: string,
  opts: SearchOptions = {},
): Promise<EbayPriceSnapshot | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const marketplace = opts.marketplace ?? process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US';
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const trim = Math.min(Math.max(opts.trim ?? 0.1, 0), 0.4);

  const url = new URL(`${API_HOST}/buy/browse/v1/item_summary/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE|AUCTION}');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplace,
      'Accept-Language': 'en-US',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[ebay] search failed', res.status, text.slice(0, 200));
    return null;
  }

  const data = (await res.json()) as {
    itemSummaries?: Array<{
      itemId: string;
      title: string;
      itemWebUrl: string;
      price?: { value: string; currency: string };
      image?: { imageUrl?: string };
      thumbnailImages?: Array<{ imageUrl: string }>;
    }>;
  };
  const summaries = data.itemSummaries ?? [];

  const parsed: EbayItemSummary[] = [];
  const prices: number[] = [];
  let currency = 'USD';
  for (const s of summaries) {
    if (!s.price) continue;
    const v = Number(s.price.value);
    if (!Number.isFinite(v) || v <= 0) continue;
    prices.push(v);
    currency = s.price.currency;
    parsed.push({
      itemId: s.itemId,
      title: s.title,
      price: v,
      currency: s.price.currency,
      webUrl: s.itemWebUrl,
      thumb: s.thumbnailImages?.[0]?.imageUrl ?? s.image?.imageUrl,
    });
  }
  if (prices.length === 0) return null;

  prices.sort((a, b) => a - b);
  const trimmed = trimOutliers(prices, trim);
  const low = trimmed[0];
  const high = trimmed[trimmed.length - 1];
  const avg = trimmed.reduce((s, p) => s + p, 0) / trimmed.length;
  const median = trimmed[Math.floor(trimmed.length / 2)];

  return {
    low, avg, median, high,
    sampleN: trimmed.length,
    currency,
    marketplace,
    items: parsed.slice(0, 10),
    fetchedAt: new Date(),
  };
}

function trimOutliers(sorted: number[], ratio: number): number[] {
  if (ratio <= 0 || sorted.length < 5) return sorted;
  const cut = Math.floor(sorted.length * ratio);
  return sorted.slice(cut, sorted.length - cut);
}

export function isEbayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}
