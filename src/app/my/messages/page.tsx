import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { MessagesInboxScreen } from '@/components/screens/MessagesInboxScreen';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <LoginRequired
        title="쪽지함"
        message="쪽지함은 로그인 후 이용 가능합니다"
        callbackUrl="/my/messages"
      />
    );
  }
  return <MessagesInboxScreen />;
}
