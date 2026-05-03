import { getServerSession } from 'next-auth';
import { DashboardScreen } from '@/components/dashboard/DashboardScreen';
import { authOptions } from '@/lib/auth';
import { getActiveHeroBanners, getMyCardsWithPrices } from '@/lib/queries';

export const revalidate = 30;

export default async function Page() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const [cards, heroBanners] = await Promise.all([
    userId ? getMyCardsWithPrices(userId, 100) : Promise.resolve([]),
    getActiveHeroBanners(),
  ]);

  return (
    <DashboardScreen
      cards={cards}
      heroBanners={heroBanners}
      isLoggedIn={Boolean(userId)}
    />
  );
}
