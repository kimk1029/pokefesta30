/**
 * SNKRDUNK 비공식 v1 JSON API 호출 (모바일).
 *
 * 네이티브에서는 CORS 없이 직접 호출. Expo Web 빌드는 CORS로 차단되므로
 * 그 경우 Next.js 백엔드의 /api/snkrdunk/* 프록시를 거쳐야 함 (현재 미적용).
 */

function abortAfter(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

const SNKRDUNK_ORIGIN = 'https://snkrdunk.com';

export interface SnkrdunkApparel {
  id: number;
  localizedName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

interface RawApparel {
  id: number;
  name?: string;
  localizedName?: string;
  primaryMedia?: { imageUrl?: string };
  minPrice?: number;
  usedMinPrice?: number;
  listingCountText?: string;
  usedListingCountText?: string;
}

export async function fetchSnkrdunkApparel(apparelId: number): Promise<SnkrdunkApparel | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  try {
    const res = await fetch(`${SNKRDUNK_ORIGIN}/v1/apparels/${apparelId}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      },
      signal: abortAfter(8000),
    });
    if (!res.ok) return null;
    const raw: RawApparel = await res.json();
    // 싱글카드는 신품 시장이 없고 중고만 거래됨. 박스/팩은 반대.
    const newMin = raw.minPrice ?? 0;
    const usedMin = raw.usedMinPrice ?? 0;
    const useUsed = newMin <= 0 && usedMin > 0;
    return {
      id: raw.id,
      localizedName: raw.localizedName ?? raw.name ?? '',
      imageUrl: raw.primaryMedia?.imageUrl ?? null,
      minPrice: useUsed ? usedMin : newMin,
      listingCountText: useUsed
        ? (raw.usedListingCountText ?? '')
        : (raw.listingCountText ?? ''),
    };
  } catch {
    return null;
  }
}

export function snkrdunkApparelUrl(apparelId: number): string {
  return `${SNKRDUNK_ORIGIN}/apparels/${apparelId}`;
}

export interface SnkrdunkSaleEntry {
  price: number;
  date: string;
  size: string;
  condition: string;
  label: string;
}

export interface SnkrdunkSalesHistory {
  history: SnkrdunkSaleEntry[];
}

export interface SnkrdunkSalesChart {
  points: Array<[number, number]>;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SNKRDUNK_ORIGIN}${path}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ja,en-US;q=0.8,ko;q=0.7',
      },
      signal: abortAfter(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSnkrdunkSalesHistory(
  apparelId: number,
): Promise<SnkrdunkSalesHistory | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  return getJson<SnkrdunkSalesHistory>(
    `/v1/apparels/${apparelId}/sales-history?size_id=0&page=1&per_page=20`,
  );
}

export async function fetchSnkrdunkSalesChart(
  apparelId: number,
): Promise<SnkrdunkSalesChart | null> {
  if (!Number.isInteger(apparelId) || apparelId <= 0) return null;
  const main = await getJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart`);
  if (main && main.points && main.points.length > 0) return main;
  return getJson<SnkrdunkSalesChart>(`/v1/apparels/${apparelId}/sales-chart/used`);
}

export interface SnkrdunkCardSeed {
  apparelId: number;
  shortName: string;
  category: 'SAR' | '프로모' | 'SR' | '원피스';
}

export const SNKRDUNK_FEATURED_CARDS: SnkrdunkCardSeed[] = [
  { apparelId: 128117, shortName: '리자몽ex SAR (151)', category: 'SAR' },
  { apparelId: 103079, shortName: '리자몽VSTAR SAR', category: 'SAR' },
  { apparelId: 100090, shortName: '피카츄 뭉크展 프로모', category: '프로모' },
  { apparelId: 106796, shortName: 'Nagaba × 피카츄 프로모', category: '프로모' },
  { apparelId: 104636, shortName: '게코우가 & 조로아크 GX SR', category: 'SR' },
  { apparelId: 108050, shortName: '루피 P-033 (점프 부록)', category: '원피스' },
];
