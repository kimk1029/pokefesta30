import { type SnkrdunkRow, type SnkrdunkCategory } from '@/components/dashboard/DashboardScreen';
import { HomeRouter } from '@/components/dashboard/HomeRouter';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import type { HeroSlideData } from '@/components/HeroSlider';
import { SNKRDUNK_FEATURED_CARDS, type SnkrdunkCardSeed } from '@/lib/snkrdunkCards';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { classifySnkrdunkName } from '@/lib/snkrdunk';
import { CARD_PACKS } from '@/lib/cardPacks';

export const dynamic = 'force-dynamic';

interface SnkrdunkSearchResult {
  apparelId: number;
  name: string;
  imageUrl: string | null;
  priceText: string;
}

interface ApparelDetail {
  apparelId: number;
  name: string;
  /** snkrdunk 일본어 원문. (인기카드 카드 아래 작은 글씨 노출에 사용) */
  localizedName?: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText: string;
}

const FEATURED_BY_ID = new Map(SNKRDUNK_FEATURED_CARDS.map((s) => [s.apparelId, s]));

function inferCategory(name: string): SnkrdunkCategory | null {
  if (/プロモ|PROMO/i.test(name)) return '프로모';
  if (/\bSAR\b/.test(name)) return 'SAR';
  if (/\bSR\b/.test(name)) return 'SR';
  return null;
}

function shortenName(name: string): string {
  const cut = name.split(/[|｜]/)[0].trim();
  return cut.length > 22 ? cut.slice(0, 21) + '…' : cut;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SnkrSeed {
  apparelId: number;
  shortName: string;
  category: SnkrdunkCategory | null;
}

function searchToSeed(r: SnkrdunkSearchResult): SnkrSeed {
  const curated = FEATURED_BY_ID.get(r.apparelId);
  if (curated) {
    return { apparelId: r.apparelId, shortName: curated.shortName, category: curated.category };
  }
  return {
    apparelId: r.apparelId,
    shortName: shortenName(r.name),
    category: inferCategory(r.name),
  };
}

function curatedToSeed(s: SnkrdunkCardSeed): SnkrSeed {
  return { apparelId: s.apparelId, shortName: s.shortName, category: s.category };
}

/** 인기 카드 — 브라우즈(ポケモンカード) 결과에서 박스류를 제외한 싱글카드만. */
async function pickRandomCardSeeds(): Promise<SnkrSeed[]> {
  const r = await serverFetch<{ results: SnkrdunkSearchResult[] }>(
    '/api/snkrdunk/browse?page=1',
    { auth: false },
  );
  const pool = (r.data?.results ?? []).filter((x) => classifySnkrdunkName(x.name) !== 'box');
  if (pool.length > 0) return shuffle(pool).slice(0, 6).map(searchToSeed);
  return shuffle(SNKRDUNK_FEATURED_CARDS).slice(0, 6).map(curatedToSeed);
}

/**
 * 인기 박스 — 최근 포켓몬 팩의 대표 '박스'(apparelCategoryId=14)로 구성.
 * 검색 이름 추측이 아니라 박스 전용 카테고리 그룹 조회라 싱글카드가 섞이지 않는다.
 * (/cards/packs 가 쓰는 것과 동일한 소스.)
 */
interface ApparelGroupBox {
  id: number;
  localizedName: string;
  imageUrl: string | null;
  minPrice: number;
  listingCountText?: string;
}
async function fetchBoxRows(): Promise<SnkrdunkRow[]> {
  const pool = CARD_PACKS
    .filter((p) => (p.game ?? 'pokemon') === 'pokemon' && p.apparelGroupId > 0)
    .sort((a, b) => (b.releasedAt ?? '').localeCompare(a.releasedAt ?? ''))
    .slice(0, 12);
  const picked = shuffle(pool).slice(0, 8);
  const rows = await Promise.all(
    picked.map(async (pack): Promise<SnkrdunkRow | null> => {
      const r = await serverFetch<{ data: { apparels?: ApparelGroupBox[] } | null }>(
        `/api/snkrdunk/apparel-groups/${pack.apparelGroupId}?apparelCategoryId=14&page=1&perPage=1`,
        { auth: false },
      );
      const box = r.data?.data?.apparels?.[0];
      if (!box || !box.id) return null;
      return {
        apparelId: box.id,
        shortName: pack.shortName,
        localizedName: box.localizedName || undefined,
        category: null,
        imageUrl: box.imageUrl ?? null,
        minPrice: box.minPrice ?? 0,
        listingCountText: box.listingCountText ?? '',
      };
    }),
  );
  return rows.filter((r): r is SnkrdunkRow => r !== null).slice(0, 6);
}

/** seed → 상세 조회로 가격·매물·이미지 채운 행. (인기 카드용) */
async function seedToRow(seed: SnkrSeed): Promise<SnkrdunkRow> {
  const ar = await serverFetch<{ data: ApparelDetail }>(
    `/api/snkrdunk/apparels/${seed.apparelId}`,
    { auth: false },
  );
  const apparel = ar.data?.data;
  // 큐레이션된 seed.shortName 이 우선, 없으면 일본어 원문을 한국어로 자동 번역.
  const jp = apparel?.localizedName ?? apparel?.name ?? '';
  const ko = FEATURED_BY_ID.has(seed.apparelId)
    ? seed.shortName
    : shortenName(translateKnownCardNameToKo(jp) || seed.shortName);
  return {
    apparelId: seed.apparelId,
    shortName: ko,
    localizedName: jp || undefined,
    category: seed.category,
    imageUrl: apparel?.imageUrl ?? null,
    minPrice: apparel?.minPrice ?? 0,
    listingCountText: apparel?.listingCountText ?? '',
  };
}

export default async function Page() {
  const user = await getServerUser();
  const userId = user?.id ?? null;

  const [cardsResp, bannersResp, cardSeeds, snkrdunkBoxRows] = await Promise.all([
    userId
      ? serverFetch<{ data: unknown[] }>('/api/me/cards/with-prices')
      : Promise.resolve({ data: { data: [] as unknown[] } }),
    serverFetch<{ data: HeroSlideData[] }>('/api/banners', { auth: false }),
    pickRandomCardSeeds(),
    fetchBoxRows(),
  ]);

  const cards = (cardsResp.data?.data ?? []) as never;
  const heroBanners = bannersResp.data?.data ?? [];

  const snkrdunkRows = await Promise.all(cardSeeds.map(seedToRow));

  return (
    <HomeRouter
      cards={cards}
      heroBanners={heroBanners}
      isLoggedIn={Boolean(userId)}
      snkrdunkRows={snkrdunkRows}
      snkrdunkBoxRows={snkrdunkBoxRows}
    />
  );
}
