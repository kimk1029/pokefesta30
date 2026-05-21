import { LoginRequired } from '@/components/LoginRequired';
import { MessagesThreadScreen } from '@/components/screens/MessagesThreadScreen';
import { getServerUser, serverFetch } from '@/lib/apiServer';

export const dynamic = 'force-dynamic';

interface PeerUser {
  id: string;
  name: string;
  avatarId: string;
  backgroundId: string;
  frameId: string;
}

interface Props {
  params: { peerId: string };
}

export default async function Page({ params }: Props) {
  const user = await getServerUser();
  if (!user?.id) {
    return (
      <LoginRequired
        title="쪽지"
        message="쪽지는 로그인 후 이용 가능합니다"
        callbackUrl={`/my/messages/${params.peerId}`}
      />
    );
  }

  const r = await serverFetch<{ user: PeerUser }>(
    `/api/users/${encodeURIComponent(params.peerId)}`,
    { auth: false },
  );

  return (
    <MessagesThreadScreen
      peerId={params.peerId}
      peer={r.data?.user ?? undefined}
      myId={user.id}
    />
  );
}
