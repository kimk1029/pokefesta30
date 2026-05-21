import { LoginRequired } from '@/components/LoginRequired';
import { MessagesInboxScreen } from '@/components/screens/MessagesInboxScreen';
import { getServerUser } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getServerUser();
  if (!user?.id) {
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
