import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { defaultNameFor } from '@/lib/defaultName';
import { prisma } from '@/lib/prisma';
import { REWARDS } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const TRADE_TYPES = ['buy', 'sell'] as const;
const TRADE_STATUSES = ['open', 'reserved', 'done', 'cancelled'] as const;

/** GET /api/trades?type=buy&status=open&placeId=seongsu&limit=20 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), MAX_LIMIT);
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const placeId = searchParams.get('placeId') ?? undefined;

  const where: Prisma.TradeWhereInput = {};
  if (type && TRADE_TYPES.includes(type as (typeof TRADE_TYPES)[number])) where.type = type;
  if (status && TRADE_STATUSES.includes(status as (typeof TRADE_STATUSES)[number])) where.status = status;
  if (placeId) where.placeId = placeId;

  const rows = await prisma.trade.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { place: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data: rows });
}

/**
 * POST /api/trades (auth required)
 * body: { placeId, type: 'buy'|'sell', title, body?, price? }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const {
    placeId,
    type,
    title,
    body: content,
    price,
  } = (body ?? {}) as Record<string, string | undefined>;

  if (!placeId) return NextResponse.json({ error: 'placeId required' }, { status: 400 });
  if (!type || !TRADE_TYPES.includes(type as (typeof TRADE_TYPES)[number])) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }
  if (!title || !title.trim()) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  let authorId: string | null = null;
  if (session.user.id) {
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {},
      create: { id: session.user.id, name: defaultNameFor(session.user.id) },
    });
    authorId = session.user.id;
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.trade.create({
      data: {
        placeId,
        type,
        title: title.trim(),
        body: content?.trim() ?? '',
        price: price?.trim() || '제안',
        authorId,
        authorEmoji: session.user.name?.slice(0, 2) ?? '익명',
      },
    });
    if (authorId) {
      await tx.user.update({
        where: { id: authorId },
        data: { points: { increment: REWARDS.trade_post } },
      });
    }
    return row;
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
