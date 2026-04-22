import { WriteScreen } from '@/components/screens/WriteScreen';
import { getPlaces } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const places = await getPlaces();
  return <WriteScreen mode="feed" places={places} />;
}
