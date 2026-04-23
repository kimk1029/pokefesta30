import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { MessagesThreadScreen } from '@/components/screens/MessagesThreadScreen';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface Props {
  params: { peerId: string };
}

export default async function Page({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <LoginRequired
        title="쪽지"
        message="쪽지는 로그인 후 이용 가능합니다"
        callbackUrl={`/my/messages/${params.peerId}`}
      />
    );
  }

  const peer = await prisma.user.findUnique({
    where: { id: params.peerId },
    select: { id: true, name: true, avatarId: true, backgroundId: true, frameId: true },
  });

  return (
    <MessagesThreadScreen
      peerId={params.peerId}
      peer={peer ?? undefined}
      myId={session.user.id}
    />
  );
}
