import { LiveScreen } from '@/components/screens/LiveScreen';
import {
  getFeedPage,
  getHourlyReportCounts,
  getPlaces,
  getTodayReportCount,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, feedPage, todayCount, hourly] = await Promise.all([
    getPlaces(),
    getFeedPage({ limit: 15 }),
    getTodayReportCount(),
    getHourlyReportCounts(),
  ]);
  return (
    <LiveScreen
      places={places}
      initialFeeds={feedPage.items}
      initialCursor={feedPage.nextCursor}
      todayCount={todayCount}
      hourlyCounts={hourly.counts}
      nowHour={hourly.nowHour}
    />
  );
}
