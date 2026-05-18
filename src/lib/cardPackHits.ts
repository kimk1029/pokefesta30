/**
 * 팩별 힛카드 해석기.
 *
 * 흐름:
 *   1) 큐레이션된 `pack.hits` apparelId 들로 snkrdunk 아이템을 동시에 조회
 *   2) 결과가 limit 보다 적으면 `pack.searchQuery` 로 snkrdunk 검색 → 부족분 채움
 *   3) 동일 apparelId 중복 제거
 *
 * snkrdunk 응답은 [[fetchSnkrdunkApparel]] 단에서 이미 `next.revalidate` 로
 * 캐싱되므로, 본 함수는 추가 캐싱 없이 직접 호출. 단 동시성은 N (=6) 으로
 * 제한해 단일 요청에서 snkrdunk 서버를 과도하게 두드리지 않게 한다.
 */
import { CARD_PACKS, type CardPackMeta, getCardPack } from './cardPacks';
import {
  fetchSnkrdunkApparel,
  fetchSnkrdunkSearch,
  type SnkrdunkApparel,
} from './snkrdunk';

export interface PackHitCard {
  apparelId: number;
  name: string;
  /** UI에 노출할 짧은 한국어/일본어 라벨. snkrdunk 응답에서 정리. */
  shortName: string;
  imageUrl: string | null;
  /** 일본엔 (JPY) 최저가. 0 이면 매물 없음. */
  minPrice: number;
  displayPrice: string;
  listingCount: number;
  listingCountText: string;
  productNumber: string;
}

export interface PackWithHits {
  code: string;
  name: string;
  shortName: string;
  emoji: string;
  bg: string;
  releasedAt?: string;
  hits: PackHitCard[];
}

const DEFAULT_LIMIT = 12;
const CONCURRENCY = 6;

/** 일본 이름에서 너무 긴 부분 잘라 짧은 라벨로 변환. DashboardScreen 의 shortenName 과 동일 패턴. */
function shortenName(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 22 ? cut.slice(0, 21) + '…' : cut;
}

function toHitCard(a: SnkrdunkApparel, override?: string): PackHitCard {
  return {
    apparelId: a.id,
    name: a.localizedName || a.name,
    shortName: override ?? shortenName(a.localizedName || a.name),
    imageUrl: a.imageUrl,
    minPrice: a.minPrice,
    displayPrice: a.displayPrice,
    listingCount: a.listingCount,
    listingCountText: a.listingCountText,
    productNumber: a.productNumber,
  };
}

/** 동시 실행 cap 가진 map. */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function resolveCurated(pack: CardPackMeta): Promise<PackHitCard[]> {
  if (pack.hits.length === 0) return [];
  const results = await mapWithLimit(pack.hits, CONCURRENCY, async (h) => {
    const a = await fetchSnkrdunkApparel(h.apparelId);
    if (!a) return null;
    return toHitCard(a, h.label);
  });
  return results.filter((x): x is PackHitCard => x !== null);
}

async function resolveSearchFill(
  pack: CardPackMeta,
  alreadyIds: Set<number>,
  need: number,
): Promise<PackHitCard[]> {
  if (need <= 0) return [];
  // 검색 결과는 그 자체로 minPrice 등을 안 줘서, 각 apparelId 마다 다시 fetch.
  // need * 검색페이지 결과 수만큼 호출되니, 페이지 1만 가져와서 상위에서 채운다.
  const results = await fetchSnkrdunkSearch(pack.searchQuery, 1);
  const pool = results.filter((r) => !alreadyIds.has(r.apparelId)).slice(0, need * 2);
  const hydrated = await mapWithLimit(pool, CONCURRENCY, async (r) => {
    const a = await fetchSnkrdunkApparel(r.apparelId);
    return a ? toHitCard(a) : null;
  });
  return hydrated.filter((x): x is PackHitCard => x !== null).slice(0, need);
}

export async function getPackWithHits(
  code: string,
  limit: number = DEFAULT_LIMIT,
): Promise<PackWithHits | null> {
  const pack = getCardPack(code);
  if (!pack) return null;

  const curated = await resolveCurated(pack);
  const seen = new Set<number>(curated.map((c) => c.apparelId));
  const need = Math.max(0, limit - curated.length);
  const filled = need > 0 ? await resolveSearchFill(pack, seen, need) : [];

  return {
    code: pack.code,
    name: pack.name,
    shortName: pack.shortName,
    emoji: pack.emoji,
    bg: pack.bg,
    releasedAt: pack.releasedAt,
    hits: [...curated, ...filled],
  };
}

export async function getAllPacksWithHits(
  limit: number = DEFAULT_LIMIT,
): Promise<PackWithHits[]> {
  // 팩끼리는 직렬로 처리 — 각 팩 내부는 이미 동시성 cap 적용됨.
  // (전부 병렬화하면 한 요청에서 snkrdunk 에 ~100 동시 요청이 발생할 수 있음.)
  const out: PackWithHits[] = [];
  for (const p of CARD_PACKS) {
    const r = await getPackWithHits(p.code, limit);
    if (r) out.push(r);
  }
  return out;
}
