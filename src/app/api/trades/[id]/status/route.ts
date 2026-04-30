import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { REWARDS } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

const TRADE_STATUSES = ['open', 'reserved', 'done', 'cancelled'] as const;
type TradeStatus = (typeof TRADE_STATUSES)[number];

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** PATCH /api/trades/:id/status — body: { status: 'open'|'reserved'|'done'|'cancelled' } (auth required) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const status = (body as { status?: string } | null)?.status;
  if (!status || !TRADE_STATUSES.includes(status as TradeStatus)) {
    return NextResponse.json(
      { error: `invalid status. allowed: ${TRADE_STATUSES.join(',')}` },
      { status: 400 },
    );
  }

  try {
    // 완료 전환 시 작성자에게 트레이드 완료 보상 1회 지급
    const before = await prisma.trade.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // 거래 완료는 누군가 1:1 쪽지를 보낸 적이 있어야 가능 (스팸·자기완료 방지)
    const becameDone = status === 'done' && before.status !== 'done';
    if (becameDone && before.authorId) {
      const inboundMsg = await prisma.message.findFirst({
        where: { tradeId: id, receiverId: before.authorId },
        select: { id: true },
      });
      if (!inboundMsg) {
        return NextResponse.json(
          { error: '아직 쪽지를 받은 적이 없어 완료 처리할 수 없어요. 구매자와 쪽지를 먼저 주고받아 주세요.' },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.trade.update({ where: { id }, data: { status } });
      if (becameDone && before.authorId) {
        await tx.user.update({
          where: { id: before.authorId },
          data: { points: { increment: REWARDS.trade_done } },
        });
      }
      return row;
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}
