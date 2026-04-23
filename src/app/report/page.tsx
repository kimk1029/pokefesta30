import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { ReportScreen } from '@/components/screens/ReportScreen';
import { authOptions } from '@/lib/auth';
import { getPlaces } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <LoginRequired title="제보하기" message="제보는 로그인 후 가능합니다" callbackUrl="/report" />;
  }
  const places = await getPlaces();
  return <ReportScreen places={places} />;
}
