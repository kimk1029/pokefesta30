'use server';

import { serverFetch } from '@/lib/apiServer';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';

interface SearchResult {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

interface ApparelDetail {
  apparelId: number;
  name: string;
  localizedName?: string;
  imageUrl: string | null;
  minPrice: number;
  listingCount: number;
  listingCountText: string;
}

export interface HydratedHit {
  apparelId: number;
  koName: string;
  jpName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

async function hydrateBatch(results: SearchResult[]): Promise<HydratedHit[]> {
  const out: HydratedHit[] = new Array(results.length);
  const CONCURRENCY = 6;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, results.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= results.length) return;
      const r = results[idx];
      const ar = await serverFetch<{ data: ApparelDetail | null }>(
        `/api/snkrdunk/apparels/${r.apparelId}`,
        { auth: false },
      );
      const apparel = ar.data?.data ?? null;
      const jp = apparel?.localizedName ?? apparel?.name ?? r.name;
      out[idx] = {
        apparelId: r.apparelId,
        koName: translateKnownCardNameToKo(jp) || jp,
        jpName: jp,
        imageUrl: apparel?.imageUrl ?? r.imageUrl,
        minPrice: apparel?.minPrice ?? 0,
        listingCountText: apparel?.listingCountText ?? '',
      };
    }
  });
  await Promise.all(workers);
  return out.filter(Boolean);
}

/**
 * 일본어 키워드 `ja` 의 검색 결과 한 페이지를 가져와 상세까지 hydrate.
 * 클라이언트의 "더 보기"가 page 를 늘려가며 호출한다.
 */
export async function searchSnkrdunkPage(
  ja: string,
  page: number,
): Promise<{ hits: HydratedHit[]; hasMore: boolean }> {
  const q = (ja ?? '').trim();
  if (!q) return { hits: [], hasMore: false };
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const r = await serverFetch<{ results: SearchResult[]; hasMore?: boolean }>(
    `/api/snkrdunk/search?q=${encodeURIComponent(q)}&page=${safePage}`,
    { auth: false },
  );
  const raw = r.data?.results ?? [];
  const hasMore = r.data?.hasMore ?? raw.length > 0;
  const hits = raw.length > 0 ? await hydrateBatch(raw) : [];
  return { hits, hasMore };
}
