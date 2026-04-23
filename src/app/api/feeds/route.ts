import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;

/** GET /api/feeds?limit=20&placeId=seongsu */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), MAX_LIMIT);
  const placeId = searchParams.get('placeId') ?? undefined;

  const rows = await prisma.feed.findMany({
    where: placeId ? { placeId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { place: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data: rows });
}

/** POST /api/feeds — body: { placeId?, text } (auth required) */
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
  const { placeId, text } = (body ?? {}) as { placeId?: string; text?: string };
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  const created = await prisma.feed.create({
    data: {
      placeId: placeId || null,
      text: text.trim(),
      authorEmoji: session.user.name?.slice(0, 2) ?? '🐣',
    },
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
