import { CommunityScreen } from '@/components/screens/CommunityScreen';
import { serverFetch } from '@/lib/apiServer';
import type { FeedPost, Trade } from '@/lib/types';

export const revalidate = 30;

export default async function Page() {
  const [feedResp, tradesResp] = await Promise.all([
    serverFetch<{ items: FeedPost[]; nextCursor: string | null }>(
      '/api/feeds?limit=20',
      { auth: false },
    ),
    serverFetch<{ data: Trade[] }>('/api/trades?limit=30', { auth: false }),
  ]);
  return (
    <CommunityScreen
      initialFeed={feedResp.data?.items ?? []}
      trades={tradesResp.data?.data ?? []}
    />
  );
}
