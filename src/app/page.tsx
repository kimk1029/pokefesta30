import { HomeScreen } from '@/components/screens/HomeScreen';
import { getPlaces, getTodayReportCount, getTrades } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, trades, todayCount] = await Promise.all([
    getPlaces(),
    getTrades('all'),
    getTodayReportCount(),
  ]);
  return <HomeScreen places={places} trades={trades} todayCount={todayCount} />;
}
