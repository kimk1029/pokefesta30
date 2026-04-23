import { HomeScreen } from '@/components/screens/HomeScreen';
import { getFeedPosts, getPlaces, getTodayReportCount } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, feeds, todayCount] = await Promise.all([
    getPlaces(),
    getFeedPosts(5),
    getTodayReportCount(),
  ]);
  return <HomeScreen places={places} feeds={feeds} todayCount={todayCount} />;
}
