import { CommunityScreen } from '@/components/screens/CommunityScreen';
import { getFeedPage, getTrades } from '@/lib/queries';

export const revalidate = 30;

export default async function Page() {
  const [feedPage, trades] = await Promise.all([
    getFeedPage({ limit: 20 }),
    getTrades('all', 30),
  ]);
  return <CommunityScreen initialFeed={feedPage.items} trades={trades} />;
}
