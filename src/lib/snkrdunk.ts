/**
 * SNKRDUNK 비공식 v1 JSON API 호출.
 *
 * - 인증/쿠키 불필요
 * - 응답 그대로 받아 필요한 필드만 노출
 * - Next.js fetch revalidate 로 10분 캐시 (서버사이드 호출 전제)
 *
 * 참고: 비공식이므로 스키마/엔드포인트가 사전 통보 없이 변경될 수 있음.
 */

const SNKRDUNK_ORIGIN = 'https://snkrdunk.com';
const REVALIDATE_SEC = 600;

const COMMON_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export interface SnkrdunkApparel {
  id: number;
  name: string;
  localizedName: string;
  imageUrl: string | null;
  minPrice: number;
  regularPrice: number;
  displayPrice: string;
  listingCount: number;
  listingCountText: string;
  releasedAt: string | null;
  productNumber: string;
}

export interface SnkrdunkSaleEntry {
  price: number;
  date: string;
  size: string;
  condition: string;
}

export interface SnkrdunkSalesHistory {
  history: SnkrdunkSaleEntry[];
}

export interface SnkrdunkSalesChart {
  points: Array<[number, number]>;
  rangeKeys: Array<{ key: string; text: string; enabled: boolean }>;
}

export function snkrdunkApparelUrl(apparelId: number): string {
  return `${SNKRDUNK_ORIGIN}/apparels/${apparelId}`;
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const url = `${SNKRDUNK_ORIGIN}${path}`;
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      next: { revalidate: REVALIDATE_SEC },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('[snkrdunk] non-OK', res.status, path);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error('[snkrdunk] fetch failed', path, err);
    return null;
  }
}

interface RawApparel {
  id: number;
  name?: string;
  localizedName?: string;
  primaryMedia?: { imageUrl?: string };
  minPrice?: number;
  usedMinPrice?: number;
  regularPrice?: number;
  displayPrice?: string;
  listingCount?: number;
  usedListingCount?: number;
  listingCountText?: string;
  usedListingCountText?: string;
  releasedAt?: string;
  productNumber?: string;
}

export async function fetchSnkrdunkApparel(apparelId: number): Promise<SnkrdunkApparel | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  const raw = await fetchJson<RawApparel>(`/v1/apparels/${apparelId}`);
  if (!raw) return null;
  // 싱글카드는 신품(minPrice) 시장이 없고 중고(usedMinPrice)만 있음. 박스/팩은 반대.
  // 활성 쪽을 통합 필드에 노출.
  const newMin = raw.minPrice ?? 0;
  const usedMin = raw.usedMinPrice ?? 0;
  const useUsed = newMin <= 0 && usedMin > 0;
  return {
    id: raw.id,
    name: raw.name ?? '',
    localizedName: raw.localizedName ?? raw.name ?? '',
    imageUrl: raw.primaryMedia?.imageUrl ?? null,
    minPrice: useUsed ? usedMin : newMin,
    regularPrice: raw.regularPrice ?? 0,
    displayPrice: raw.displayPrice ?? '',
    listingCount: useUsed ? (raw.usedListingCount ?? 0) : (raw.listingCount ?? 0),
    listingCountText: useUsed ? (raw.usedListingCountText ?? '') : (raw.listingCountText ?? ''),
    releasedAt: raw.releasedAt ?? null,
    productNumber: raw.productNumber ?? '',
  };
}

export async function fetchSnkrdunkSalesHistory(
  apparelId: number,
): Promise<SnkrdunkSalesHistory | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  return fetchJson<SnkrdunkSalesHistory>(`/v1/apparels/${apparelId}/sales-history`);
}

export async function fetchSnkrdunkSalesChart(
  apparelId: number,
): Promise<SnkrdunkSalesChart | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  return fetchJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart`);
}
