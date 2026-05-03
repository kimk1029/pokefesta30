import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
import { defaultNameFor } from '@/lib/defaultName';
import { prisma } from '@/lib/prisma';
import { getFeedPage } from '@/lib/queries';
import { REWARDS } from '@/lib/rewards';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feeds?cursor=<iso>&limit=20
 * 응답: { items: FeedPost[], nextCursor: string | null }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor') ?? null;
  const limitRaw = Number(searchParams.get('limit') ?? 20);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 20;

  const page = await getFeedPage({ cursor, limit });
  return NextResponse.json(page);
}

/**
 * POST /api/feeds  (auth required)
 * body: { text }
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
  const { text } = (body ?? {}) as { text?: string };

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  // users 행 확보 (FK 안전)
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
    const row = await tx.feed.create({
      data: {
        text: text.trim(),
        authorId,
        authorEmoji: session.user.name?.slice(0, 2) ?? '🐣',
      },
    });
    if (authorId) {
      await tx.user.update({
        where: { id: authorId },
        data: { points: { increment: REWARDS.feed_general } },
      });
    }
    return row;
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
