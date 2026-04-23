import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFeedPage } from '@/lib/queries';
import type { CongestionLevel, FeedKind } from '@/lib/types';

export const dynamic = 'force-dynamic';

const KINDS: FeedKind[] = ['general', 'report'];
const LEVELS: CongestionLevel[] = ['empty', 'normal', 'busy', 'full'];

/**
 * GET /api/feeds?kind=general|report&cursor=<iso>&limit=20
 * 응답: { items: FeedPost[], nextCursor: string | null }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kindParam = searchParams.get('kind');
  const kind: FeedKind | undefined =
    kindParam && KINDS.includes(kindParam as FeedKind) ? (kindParam as FeedKind) : undefined;
  const cursor = searchParams.get('cursor') ?? null;
  const limitRaw = Number(searchParams.get('limit') ?? 20);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

  const page = await getFeedPage({ kind, cursor, limit });
  return NextResponse.json(page);
}

/**
 * POST /api/feeds  (auth required)
 * body: { kind: 'general'|'report', placeId?, text, level? }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { kind, placeId, text, level } = (body ?? {}) as {
    kind?: string;
    placeId?: string;
    text?: string;
    level?: string;
  };

  const resolvedKind: FeedKind = kind && KINDS.includes(kind as FeedKind)
    ? (kind as FeedKind)
    : 'general';
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  let resolvedLevel: CongestionLevel | null = null;
  if (resolvedKind === 'report') {
    if (!placeId) return NextResponse.json({ error: 'placeId required for report' }, { status: 400 });
    if (!level || !LEVELS.includes(level as CongestionLevel)) {
      return NextResponse.json({ error: 'invalid level' }, { status: 400 });
    }
    resolvedLevel = level as CongestionLevel;
  }

  // users 행 확보 (FK 안전)
  let authorId: string | null = null;
  if (session.user.id) {
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: { name: session.user.name ?? '트레이너' },
      create: { id: session.user.id, name: session.user.name ?? '트레이너' },
    });
    authorId = session.user.id;
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.feed.create({
      data: {
        kind: resolvedKind,
        level: resolvedLevel,
        placeId: placeId || null,
        text: text.trim(),
        authorId,
        authorEmoji: session.user.name?.slice(0, 2) ?? '🐣',
      },
    });
    if (resolvedKind === 'report' && placeId && resolvedLevel) {
      await tx.place.update({
        where: { id: placeId },
        data: { level: resolvedLevel, lastReportAt: new Date(), count: { increment: 1 } },
      });
    }
    return row;
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
