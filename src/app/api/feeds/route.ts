import { NextResponse, type NextRequest } from 'next/server';
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

/** POST /api/feeds — body: { placeId?, text, authorEmoji? } */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { placeId, text, authorEmoji } = (body ?? {}) as {
    placeId?: string;
    text?: string;
    authorEmoji?: string;
  };
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  const created = await prisma.feed.create({
    data: {
      placeId: placeId || null,
      text: text.trim(),
      authorEmoji: authorEmoji || '🐣',
    },
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
