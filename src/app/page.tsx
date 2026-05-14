import { getServerSession } from 'next-auth';
import { DashboardScreen, type SnkrdunkRow } from '@/components/dashboard/DashboardScreen';
import { authOptions } from '@/lib/auth';
import { getActiveHeroBanners, getMyCardsWithPrices } from '@/lib/queries';
import { fetchSnkrdunkApparel } from '@/lib/snkrdunk';
import { SNKRDUNK_FEATURED_CARDS } from '@/lib/snkrdunkCards';

export const revalidate = 30;

export default async function Page() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const [cards, heroBanners, snkrdunkRows] = await Promise.all([
    userId ? getMyCardsWithPrices(userId, 100) : Promise.resolve([]),
    getActiveHeroBanners(),
    Promise.all(
      SNKRDUNK_FEATURED_CARDS.map(async (seed): Promise<SnkrdunkRow> => {
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
    ),
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
