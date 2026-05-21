import { LoginRequired } from '@/components/LoginRequired';
import { MyCardsScreen } from '@/components/screens/MyCardsScreen';
import { getServerUser, serverFetch } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '내 컬렉션 · CardVault',
  description: '내가 그레이딩·아카이빙한 카드 컬렉션. 그리드/리스트/바인더/앨범 4가지 뷰.',
};

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="내 카드"
        message="내 카드 아카이브는 로그인 후 이용 가능합니다"
        callbackUrl="/my/cards"
      />
    );
  }
  const r = await serverFetch<{ data: unknown[] }>('/api/me/cards/with-prices');
  return <MyCardsScreen cards={(r.data?.data ?? []) as never} />;
}
