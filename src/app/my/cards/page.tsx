import { LoginRequired } from '@/components/LoginRequired';
import { CollectionScreen } from '@/components/screens/CollectionScreen';
import { getServerUser } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '내 컬렉션 · CardVault',
  description: '내 카드 자산 — 총 평가액·손익·구성 비중과 보유 카드 목록.',
};

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="내 컬렉션"
        message="내 카드 자산은 로그인 후 이용 가능합니다"
        callbackUrl="/my/cards"
      />
    );
  }
  // POKE30 '내 자산' 디자인 — 데이터는 CollectionScreen 이 클라이언트에서 직접 조회.
  return <CollectionScreen />;
}
