import { LoginRequired } from '@/components/LoginRequired';
import { RegisterFromScan } from '@/components/cards/RegisterFromScan';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { getServerUser } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '카드 등록 · 아르보TCG',
  description: '스캔에서 선택한 카드를 내 컬렉션에 등록합니다.',
};

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="카드 등록"
        message="카드 등록은 로그인 후 이용 가능합니다"
        callbackUrl="/cards/register"
      />
    );
  }
  return (
    <>
      <StatusBar />
      <AppBar title="카드 등록" showBack backHref="/cards/grading" />
      <div style={{ height: 14 }} />
      <RegisterFromScan />
      <div className="bggap" />
    </>
  );
}
