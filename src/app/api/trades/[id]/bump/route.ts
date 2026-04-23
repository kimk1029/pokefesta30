import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_BUMPS = 3;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tradeId = Number(params.id);
  if (isNaN(tradeId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (trade.authorId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (trade.bumpCount >= MAX_BUMPS) return NextResponse.json({ error: 'MAX_BUMPS', remaining: 0 }, { status: 400 });

  const updated = await prisma.trade.update({
    where: { id: tradeId },
    data: { bumpCount: { increment: 1 }, bumpedAt: new Date() },
  });

  revalidatePath('/trade');
  revalidatePath('/');

  return NextResponse.json({ bumpCount: updated.bumpCount, remaining: MAX_BUMPS - updated.bumpCount });
}
