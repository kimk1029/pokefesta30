import { LiveScreen } from '@/components/screens/LiveScreen';
import { getPlaces, getReports } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, reports] = await Promise.all([getPlaces(), getReports(20)]);
  return <LiveScreen places={places} reports={reports} />;
}
