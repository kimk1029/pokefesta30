import { FeedScreen } from '@/components/screens/FeedScreen';
import { getFeed } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const feed = await getFeed(30);
  return <FeedScreen feed={feed} />;
}
