import { TradeScreen } from '@/components/screens/TradeScreen';
import { serverFetch } from '@/lib/apiServer';
import type { Trade } from '@/lib/types';

export const revalidate = 30;

export default async function Page() {
  const r = await serverFetch<{ data: Trade[] }>('/api/trades?limit=60', { auth: false });
  const trades = r.data?.data ?? [];
  return <TradeScreen trades={trades} />;
}
