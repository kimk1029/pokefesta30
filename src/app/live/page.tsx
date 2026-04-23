import { LiveScreen } from '@/components/screens/LiveScreen';
import { getFeedPage, getPlaces, getTodayReportCount } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, feedPage, todayCount] = await Promise.all([
    getPlaces(),
    getFeedPage({ limit: 15 }),
    getTodayReportCount(),
  ]);
  return (
    <LiveScreen
      places={places}
      initialFeeds={feedPage.items}
      initialCursor={feedPage.nextCursor}
      todayCount={todayCount}
    />
  );
}
