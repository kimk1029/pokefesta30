import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { MyCardsScreen } from '@/components/screens/MyCardsScreen';
import { authOptions } from '@/lib/auth';
import { getMyCardsWithPrices } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '내 컬렉션 · CardVault',
  description: '내가 그레이딩·아카이빙한 카드 컬렉션. 그리드/리스트/바인더/앨범 4가지 뷰.',
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <LoginRequired
        title="내 카드"
        message="내 카드 아카이브는 로그인 후 이용 가능합니다"
        callbackUrl="/my/cards"
      />
    );
  }
  const cards = await getMyCardsWithPrices(session.user.id, 200);
  return <MyCardsScreen cards={cards} />;
}
