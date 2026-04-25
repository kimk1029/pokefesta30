import { TradeScreen } from '@/components/screens/TradeScreen';
import { getTrades } from '@/lib/queries';

export const revalidate = 30;

export default async function Page() {
  const trades = await getTrades('all');
  return <TradeScreen trades={trades} />;
}
