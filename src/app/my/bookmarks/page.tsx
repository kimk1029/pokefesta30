import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { FeedRow } from '@/components/FeedRow';
import { TradeCard } from '@/components/TradeCard';
import { AppBar } from '@/components/ui/AppBar';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { StatusBar } from '@/components/ui/StatusBar';
import { authOptions } from '@/lib/auth';
import { getMyBookmarks } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/my');

  const { trades, feeds } = await getMyBookmarks(session.user.id);

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
