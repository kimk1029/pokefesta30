import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tradeId, feedId } = await req.json() as { tradeId?: number; feedId?: number };
  if (!tradeId && !feedId) return NextResponse.json({ error: 'tradeId or feedId required' }, { status: 400 });

  const userId = session.user.id;

  try {
    const existing = await prisma.bookmark.findFirst({
      where: { userId, ...(tradeId ? { tradeId } : { feedId }) },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return NextResponse.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({ data: { userId, tradeId, feedId } });
      return NextResponse.json({ bookmarked: true });
    }
  } catch (err) {
    console.error('[bookmark]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
