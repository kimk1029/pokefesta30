import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminSession } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/:id — 어드민 전용 사용자 상세.
 * 클릭 팝업에 채워 넣을 정보: 이름/이메일/포인트/연속출석/보유아이템/활동수.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const id = params.id;
  if (!id) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      points: true,
      streakCount: true,
      lastCheckInAt: true,
      avatarId: true,
      backgroundId: true,
      frameId: true,
      ownedAvatars: true,
      ownedBackgrounds: true,
      ownedFrames: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!u) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // 활동 카운트 (병렬 집계)
  const [feedTotal, tradeCount, ticketCount, sentMsg, recvMsg, cardCount] = await Promise.all([
    prisma.feed.count({ where: { authorId: id } }),
    prisma.trade.count({ where: { authorId: id } }),
    prisma.oripaTicket.count({ where: { drawnById: id } }),
    prisma.message.count({ where: { senderId: id } }),
    prisma.message.count({ where: { receiverId: id } }),
    prisma.userCard.count({ where: { userId: id } }),
  ]);

  return NextResponse.json({
    user: {
      ...u,
      counts: {
        feedTotal,
        tradeCount,
        ticketCount,
        sentMsg,
        recvMsg,
        cardCount,
      },
    },
  });
}
