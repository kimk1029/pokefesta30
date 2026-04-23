import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { FeedRow } from '@/components/FeedRow';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { authOptions } from '@/lib/auth';
import { getMyFeeds } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/my');

  const feeds = await getMyFeeds(session.user.id);

  return (
    <>
      <StatusBar />
      <AppBar title="내 피드" showBack backHref="/my" />
      <div className="sect">
        {feeds.length === 0 ? (
          <div className="feed-item">
            <div className="fi-body">
              <div className="fi-text">아직 작성한 피드가 없어요</div>
            </div>
          </div>
        ) : (
          feeds.map((p) => <FeedRow key={p.id} post={p} />)
        )}
      </div>
      <div className="bggap" />
    </>
  );
}
