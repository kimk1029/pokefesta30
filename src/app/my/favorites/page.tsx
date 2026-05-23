import { LoginRequired } from '@/components/LoginRequired';
import { FavoritesScreen } from '@/components/screens/FavoritesScreen';
import { getServerUser, serverFetch } from '@/lib/apiServer';
import type { MyFavoriteRow } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '관심카드 · CardVault',
  description: '내가 관심 표시한 카드 목록. 포트폴리오 자산 합계에는 포함되지 않습니다.',
};

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="관심카드"
        message="관심카드는 로그인 후 이용 가능합니다"
        callbackUrl="/my/favorites"
      />
    );
  }
  const r = await serverFetch<{ data: MyFavoriteRow[] }>('/api/me/favorites/with-prices');
  return <FavoritesScreen favorites={r.data?.data ?? []} />;
}
