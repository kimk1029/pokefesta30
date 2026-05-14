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
  listingCountText?: string;
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
    return {
      id: raw.id,
      localizedName: raw.localizedName ?? raw.name ?? '',
      imageUrl: raw.primaryMedia?.imageUrl ?? null,
      minPrice: raw.minPrice ?? 0,
      listingCountText: raw.listingCountText ?? '',
    };
  } catch {
    return null;
  }
}

export function snkrdunkApparelUrl(apparelId: number): string {
  return `${SNKRDUNK_ORIGIN}/apparels/${apparelId}`;
}

export interface SnkrdunkCardSeed {
  apparelId: number;
  shortName: string;
  category: '박스' | '프로모' | 'SR' | '원피스';
}

export const SNKRDUNK_FEATURED_CARDS: SnkrdunkCardSeed[] = [
  { apparelId: 111467, shortName: '트리플렛비트 BOX', category: '박스' },
  { apparelId: 101885, shortName: 'VSTAR 유니버스 BOX', category: '박스' },
  { apparelId: 100090, shortName: '피카츄 뭉크展 프로모', category: '프로모' },
  { apparelId: 106796, shortName: 'Nagaba × 피카츄 프로모', category: '프로모' },
  { apparelId: 104636, shortName: '게코우가 & 조로아크 GX SR', category: 'SR' },
  { apparelId: 108050, shortName: '루피 P-033 (점프 부록)', category: '원피스' },
];
