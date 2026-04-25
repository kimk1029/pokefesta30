import { FeedScreen } from '@/components/screens/FeedScreen';
import { getFeedPage } from '@/lib/queries';

export const revalidate = 30;

export default async function Page() {
  const { items, nextCursor } = await getFeedPage({ limit: 20 });
  return <FeedScreen initialPosts={items} initialCursor={nextCursor} />;
}
