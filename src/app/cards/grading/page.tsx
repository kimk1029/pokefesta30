import { CardGrader } from '@/components/grading/CardGrader';
import { LoginRequired } from '@/components/LoginRequired';
import { AppBar } from '@/components/ui/AppBar';
import { StatusBar } from '@/components/ui/StatusBar';
import { getServerUser } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '카드 센터링 추정 · 포케페스타30',
  description: '포켓몬 카드 사진을 올리면 센터링을 추정해서 PSA 예상 등급을 보여줍니다.',
};

export default async function Page() {
  // 스캔(/api/cards/scan)은 서버에서 로그인 필수 — 진입 시점에 미리 안내
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="카드 스캔"
        message="카드 스캔 · 그레이딩은 로그인 후 이용 가능합니다"
        callbackUrl="/cards/grading"
      />
    );
  }
  return (
    <>
      <StatusBar />
      <AppBar title="카드 그레이딩 (센터링 추정)" showBack backHref="/cards" />
      <div style={{ height: 14 }} />
      <CardGrader />
      <div className="bggap" />
    </>
  );
}
