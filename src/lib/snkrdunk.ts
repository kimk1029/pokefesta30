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
  /** "中古" 등 거래 라벨. 싱글카드 응답에만 옴. */
  label: string;
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

/**
 * 스니다 응답의 일본어 상대시간/단위/라벨을 한국어로 변환.
 *   "16分前"   → "16분 전"
 *   "1時間前"  → "1시간 전"
 *   "1日前"    → "1일 전"
 *   "1週間前"  → "1주 전"
 *   "1ヶ月前"  → "1개월 전"
 *   "1年前"    → "1년 전"
 *   "1個"      → "1개"
 *   "中古"     → "중고"
 *   "新品"     → "새상품"
 */
export function localizeSnkrdunkText(value: string | null | undefined): string {
  if (!value) return '';
  let v = String(value);
  v = v.replace(/(\d+)\s*分前/g, '$1분 전');
  v = v.replace(/(\d+)\s*時間前/g, '$1시간 전');
  v = v.replace(/(\d+)\s*日前/g, '$1일 전');
  v = v.replace(/(\d+)\s*週間前/g, '$1주 전');
  v = v.replace(/(\d+)\s*ヶ月前/g, '$1개월 전');
  v = v.replace(/(\d+)\s*年前/g, '$1년 전');
  v = v.replace(/(\d+)\s*個/g, '$1개');
  v = v.replace(/中古/g, '중고');
  v = v.replace(/新品/g, '새상품');
  return v;
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
  // 싱글카드는 size_id/page/per_page 가 필수, 박스도 이 형태에서 정상 응답.
  return fetchJson<SnkrdunkSalesHistory>(
    `/v1/apparels/${apparelId}/sales-history?size_id=0&page=1&per_page=20`,
  );
}

export async function fetchSnkrdunkSalesChart(
  apparelId: number,
): Promise<SnkrdunkSalesChart | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  // 박스/팩: /sales-chart. 싱글카드: /sales-chart/used. 둘 다 시도해서 데이터 있는 쪽 반환.
  const main = await fetchJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart`);
  if (main && main.points && main.points.length > 0) return main;
  return fetchJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart/used`);
}
