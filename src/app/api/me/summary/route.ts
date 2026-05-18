import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { levelFromPoints } from '@/lib/level';
import { prisma } from '@/lib/prisma';
import { countMyCards, getMyInventory } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/summary — 마이페이지 대시보드 한 번에 묶어서 반환.
 * 모바일 클라이언트가 라운드트립 한 번에 화면을 채울 수 있게 한다.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const [inv, profile, tradeCount, savedCount, cardCount] = await Promise.all([
    getMyInventory(userId),
    prisma.user
      .findUnique({ where: { id: userId }, select: { name: true, email: true } })
      .catch(() => null),
    prisma.trade.count({ where: { authorId: userId } }).catch(() => 0),
    prisma.bookmark.count({ where: { userId } }).catch(() => 0),
    countMyCards(userId),
  ]);

  return NextResponse.json({
    user: {
      id: userId,
      name: profile?.name ?? session.user.name ?? null,
      email: profile?.email ?? session.user.email ?? null,
    },
    inventory: inv,
    level: levelFromPoints(inv.points),
    counts: { tradeCount, savedCount, cardCount },
  });
}
