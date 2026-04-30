import { HomeScreen } from '@/components/screens/HomeScreen';
import {
  getActiveHeroBanners,
  getFeedPosts,
  getHourlyReportCounts,
  getPlaces,
  getTodayReportCount,
} from '@/lib/queries';

export const revalidate = 30;

export default async function Page() {
  const [places, feeds, todayCount, hourly, heroBanners] = await Promise.all([
    getPlaces(),
    getFeedPosts(5),
    getTodayReportCount(),
    getHourlyReportCounts(),
    getActiveHeroBanners(),
  ]);
  return (
    <HomeScreen
      places={places}
      feeds={feeds}
      todayCount={todayCount}
      hourlyCounts={hourly.counts}
      nowHour={hourly.nowHour}
      heroBanners={heroBanners}
    />
  );
}
