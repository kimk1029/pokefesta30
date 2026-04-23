import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { WriteScreen } from '@/components/screens/WriteScreen';
import { authOptions } from '@/lib/auth';
import { getPlaces } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <LoginRequired title="거래글 작성" message="거래글 작성은 로그인 후 가능합니다" callbackUrl="/write/trade" />;
  }
  const places = await getPlaces();
  return <WriteScreen mode="trade" places={places} />;
}
