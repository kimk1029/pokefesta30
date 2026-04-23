import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { MyScreen } from '@/components/screens/MyScreen';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <LoginRequired title="마이페이지" message="내 활동 · 포인트 · 상점은 로그인 후 이용 가능합니다" callbackUrl="/my" />;
  }
  return <MyScreen session={session} />;
}
