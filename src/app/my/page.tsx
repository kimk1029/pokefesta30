import { getServerSession } from 'next-auth';
import { LoginRequired } from '@/components/LoginRequired';
import { MyScreen } from '@/components/screens/MyScreen';
import { authOptions } from '@/lib/auth';
import { levelFromPoints } from '@/lib/level';
import { prisma } from '@/lib/prisma';
import { countMyCards, getMyInventory } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <LoginRequired
        title="마이페이지"
        message="내 활동 · 포인트 · 상점은 로그인 후 이용 가능합니다"
        callbackUrl="/my"
      />
    );
  }

  const userId = session.user.id;

  // 실제 DB 집계
  const [inv, profile, tradeCount, savedCount, cardCount] = await Promise.all([
    getMyInventory(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null),
    prisma.trade.count({ where: { authorId: userId } }).catch(() => 0),
    prisma.bookmark.count({ where: { userId } }).catch(() => 0),
    countMyCards(userId),
  ]);

  const level = levelFromPoints(inv.points);

  return (
    <MyScreen
      session={{
        ...session,
        user: { ...session.user, name: profile?.name ?? session.user.name },
      }}
      level={level}
      cardCount={cardCount}
      tradeCount={tradeCount}
      savedCount={savedCount}
    />
  );
}
