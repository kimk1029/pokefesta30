import { HomeScreen } from '@/components/screens/HomeScreen';
import {
  getFeedPosts,
  getHourlyReportCounts,
  getPlaces,
  getTodayReportCount,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, feeds, todayCount, hourly] = await Promise.all([
    getPlaces(),
    getFeedPosts(5),
    getTodayReportCount(),
    getHourlyReportCounts(),
  ]);
  return (
    <HomeScreen
      places={places}
      feeds={feeds}
      todayCount={todayCount}
      hourlyCounts={hourly.counts}
      nowHour={hourly.nowHour}
    />
  );
}
