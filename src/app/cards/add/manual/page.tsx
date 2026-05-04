import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { ManualAddForm } from '@/components/ManualAddForm';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { authOptions } from '@/lib/auth';
import { CARDS_CATALOG } from '@/lib/cardsCatalog';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '카드 직접 입력 · CardVault',
  description: '카드명·세트·메모 등을 직접 입력해 컬렉션에 보관합니다.',
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <LoginRequired
        title="카드 추가"
        message="카드를 추가하려면 로그인해주세요"
        callbackUrl="/cards/add/manual"
      />
    );
  }

  const catalog = CARDS_CATALOG.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    grade: c.grade,
  }));

  return (
    <>
      <StatusBar />
      <AppBar title="카드 직접 입력" showBack backHref="/cards/add" />
      <div style={{ height: 14 }} />
      <ManualAddForm catalog={catalog} />
      <div className="bggap" />
    </>
  );
}
