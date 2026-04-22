import { MapScreen } from '@/components/screens/MapScreen';
import { getPlaces, getTrades } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, trades] = await Promise.all([getPlaces(), getTrades('all')]);
  return <MapScreen places={places} trades={trades} />;
}
