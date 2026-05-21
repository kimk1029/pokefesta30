import { redirect } from 'next/navigation';
import { FeedRow } from '@/components/FeedRow';
import { TradeCard } from '@/components/TradeCard';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import type { FeedPost, Trade } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) redirect('/my');

  const r = await serverFetch<{ data: { trades: Trade[]; feeds: FeedPost[] } }>('/api/me/bookmarks');
  const { trades = [], feeds = [] } = r.data?.data ?? { trades: [], feeds: [] };

  return (
    <>
      <StatusBar />
      <AppBar title="찜한 글" showBack backHref="/my" />

      {trades.length === 0 && feeds.length === 0 ? (
        <div className="sect">
          <div className="feed-item">
            <div className="fi-body">
              <div className="fi-text">아직 찜한 글이 없어요</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {trades.length > 0 && (
            <div className="sect">
              <SectionTitle title="찜한 거래글" />
              {trades.map((t) => <TradeCard key={t.id} trade={t} />)}
            </div>
          )}
          {feeds.length > 0 && (
            <div className="sect">
              <SectionTitle title="찜한 피드" />
              {feeds.map((p) => <FeedRow key={p.id} post={p} />)}
            </div>
          )}
        </>
      )}
      <div className="bggap" />
    </>
  );
}
