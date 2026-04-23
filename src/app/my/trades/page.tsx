import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { TradeCard } from '@/components/TradeCard';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { authOptions } from '@/lib/auth';
import { getMyTrades } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/my');

  const trades = await getMyTrades(session.user.id);

  return (
    <>
      <StatusBar />
      <AppBar title="내가 쓴 거래글" showBack backHref="/my" />
      <div className="sect">
        {trades.length === 0 ? (
          <div className="trade-card">
            <div className="trade-title">아직 작성한 거래글이 없어요</div>
          </div>
        ) : (
          trades.map((t) => <TradeCard key={t.id} trade={t} />)
        )}
      </div>
      <div className="bggap" />
    </>
  );
}
