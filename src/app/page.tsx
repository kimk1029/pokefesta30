import { DashboardScreen, type SnkrdunkRow, type SnkrdunkCategory } from '@/components/dashboard/DashboardScreen';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import type { HeroSlideData } from '@/components/HeroSlider';
import { SNKRDUNK_FEATURED_CARDS, type SnkrdunkCardSeed } from '@/lib/snkrdunkCards';

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

async function pickRandomSeeds(): Promise<SnkrSeed[]> {
  const r = await serverFetch<{ results: SnkrdunkSearchResult[] }>(
    '/api/snkrdunk/browse?page=1',
    { auth: false },
  );
  const pool = r.data?.results ?? [];
  if (pool.length > 0) return shuffle(pool).slice(0, 6).map(searchToSeed);
  return shuffle(SNKRDUNK_FEATURED_CARDS).slice(0, 6).map(curatedToSeed);
}

export default async function Page() {
  const user = await getServerUser();
  const userId = user?.id ?? null;

  const [cardsResp, bannersResp, seeds] = await Promise.all([
    userId
      ? serverFetch<{ data: unknown[] }>('/api/me/cards/with-prices')
      : Promise.resolve({ data: { data: [] as unknown[] } }),
    serverFetch<{ data: HeroSlideData[] }>('/api/banners', { auth: false }),
    pickRandomSeeds(),
  ]);

  const cards = (cardsResp.data?.data ?? []) as never;
  const heroBanners = bannersResp.data?.data ?? [];

  const snkrdunkRows: SnkrdunkRow[] = await Promise.all(
    seeds.map(async (seed): Promise<SnkrdunkRow> => {
      const ar = await serverFetch<{ data: ApparelDetail }>(
        `/api/snkrdunk/apparels/${seed.apparelId}`,
        { auth: false },
      );
      const apparel = ar.data?.data;
      return {
        apparelId: seed.apparelId,
        shortName: seed.shortName,
        category: seed.category,
        imageUrl: apparel?.imageUrl ?? null,
        minPrice: apparel?.minPrice ?? 0,
        listingCountText: apparel?.listingCountText ?? '',
      };
    }),
  );

  return (
    <DashboardScreen
      cards={cards}
      heroBanners={heroBanners}
      isLoggedIn={Boolean(userId)}
      snkrdunkRows={snkrdunkRows}
    />
  );
}
