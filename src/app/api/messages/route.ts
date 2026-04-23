import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getThreads } from '@/lib/messages';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/messages — 내 쪽지 쓰레드 목록 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const threads = await getThreads(session.user.id);
  return NextResponse.json({ data: threads });
}

/**
 * POST /api/messages — 쪽지 발송
 * body: { receiverId: string, text: string, tradeId?: number }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { receiverId, text, tradeId } = (body ?? {}) as {
    receiverId?: string;
    text?: string;
    tradeId?: number;
  };
  if (!receiverId || typeof receiverId !== 'string') {
    return NextResponse.json({ error: 'receiverId required' }, { status: 400 });
  }
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (receiverId === session.user.id) {
    return NextResponse.json({ error: 'cannot message yourself' }, { status: 400 });
  }
  // 상대 유저 존재 확인
  const peer = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
  if (!peer) {
    return NextResponse.json({ error: 'receiver not found' }, { status: 404 });
  }
  const created = await prisma.message.create({
    data: {
      senderId: session.user.id,
      receiverId,
      text: text.trim().slice(0, 1000),
      tradeId: tradeId && Number.isInteger(tradeId) ? tradeId : null,
    },
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
