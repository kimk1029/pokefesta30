import { getServerSession } from 'next-auth';
import { DashboardScreen, type SnkrdunkRow, type SnkrdunkCategory } from '@/components/dashboard/DashboardScreen';
import { authOptions } from '@/lib/auth';
import { getActiveHeroBanners, getMyCardsWithPrices } from '@/lib/queries';
import { fetchSnkrdunkApparel, fetchSnkrdunkBrowse, type SnkrdunkSearchResult } from '@/lib/snkrdunk';
import { SNKRDUNK_FEATURED_CARDS, type SnkrdunkCardSeed } from '@/lib/snkrdunkCards';

// 메인의 인기 카드들은 매 요청마다 다른 6장을 보여주기 위해 페이지 캐시를 끔.
// 개별 snkrdunk fetch 는 fetch 레이어에서 캐싱되어 비용 부담은 낮음.
export const dynamic = 'force-dynamic';

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
  const pool = await fetchSnkrdunkBrowse(1);
  if (pool.length > 0) {
    return shuffle(pool).slice(0, 6).map(searchToSeed);
  }
  return shuffle(SNKRDUNK_FEATURED_CARDS).slice(0, 6).map(curatedToSeed);
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const [cards, heroBanners, snkrdunkRows] = await Promise.all([
    userId ? getMyCardsWithPrices(userId, 100) : Promise.resolve([]),
    getActiveHeroBanners(),
    (async (): Promise<SnkrdunkRow[]> => {
      const seeds = await pickRandomSeeds();
      return Promise.all(
        seeds.map(async (seed): Promise<SnkrdunkRow> => {
          const apparel = await fetchSnkrdunkApparel(seed.apparelId);
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
    })(),
  ]);

  return (
    <DashboardScreen
      cards={cards}
      heroBanners={heroBanners}
      isLoggedIn={Boolean(userId)}
      snkrdunkRows={snkrdunkRows}
    />
  );
}
