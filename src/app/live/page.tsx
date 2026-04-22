import { LiveScreen } from '@/components/screens/LiveScreen';
import { getFeed, getPlaces } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [places, feed] = await Promise.all([getPlaces(), getFeed(20)]);
  return <LiveScreen places={places} feed={feed} />;
}
