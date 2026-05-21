import { redirect } from 'next/navigation';
import { TradeCard } from '@/components/TradeCard';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import type { Trade } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) redirect('/my');

  const r = await serverFetch<{ data: Trade[] }>('/api/me/trades');
  const trades = r.data?.data ?? [];

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
