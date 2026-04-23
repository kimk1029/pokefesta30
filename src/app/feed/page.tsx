import { FeedScreen } from '@/components/screens/FeedScreen';
import { getFeedPosts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const posts = await getFeedPosts(30);
  return <FeedScreen posts={posts} />;
}
