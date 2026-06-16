import { DashboardScreen, type SnkrdunkRow, type SnkrdunkCategory } from '@/components/dashboard/DashboardScreen';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import type { HeroSlideData } from '@/components/HeroSlider';
import { SNKRDUNK_FEATURED_CARDS, type SnkrdunkCardSeed } from '@/lib/snkrdunkCards';
import { translateKnownCardNameToKo } from '@/lib/cardTranslate';
import { classifySnkrdunkName } from '@/lib/snkrdunk';

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

/** 인기 박스 — 'ポケモンカード ボックス' 검색 결과 중 박스류만 추려서 표본. */
const SNKRDUNK_BOX_QUERY = 'ポケモンカード ボックス';
async function pickRandomBoxSeeds(): Promise<SnkrSeed[]> {
  const r = await serverFetch<{ results: SnkrdunkSearchResult[] }>(
    `/api/snkrdunk/search?q=${encodeURIComponent(SNKRDUNK_BOX_QUERY)}`,
    { auth: false },
  );
  const all = r.data?.results ?? [];
  const boxes = all.filter((x) => classifySnkrdunkName(x.name) === 'box');
  const pool = boxes.length > 0 ? boxes : all;
  return shuffle(pool).slice(0, 6).map(searchToSeed);
}

/** seed → 상세 조회로 가격·매물·이미지 채운 행. 카드/박스 공용. */
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

  const [cardsResp, bannersResp, cardSeeds, boxSeeds] = await Promise.all([
    userId
      ? serverFetch<{ data: unknown[] }>('/api/me/cards/with-prices')
      : Promise.resolve({ data: { data: [] as unknown[] } }),
    serverFetch<{ data: HeroSlideData[] }>('/api/banners', { auth: false }),
    pickRandomCardSeeds(),
    pickRandomBoxSeeds(),
  ]);

  const cards = (cardsResp.data?.data ?? []) as never;
  const heroBanners = bannersResp.data?.data ?? [];

  const [snkrdunkRows, snkrdunkBoxRows] = await Promise.all([
    Promise.all(cardSeeds.map(seedToRow)),
    Promise.all(boxSeeds.map(seedToRow)),
  ]);

  return (
    <DashboardScreen
      cards={cards}
      heroBanners={heroBanners}
      isLoggedIn={Boolean(userId)}
      snkrdunkRows={snkrdunkRows}
      snkrdunkBoxRows={snkrdunkBoxRows}
    />
  );
}
