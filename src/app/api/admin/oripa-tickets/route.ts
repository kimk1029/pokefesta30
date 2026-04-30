import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminSession } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

/**
 * GET /api/admin/oripa-tickets?limit=30&cursor=<id>&packId=&userId=
 * 뽑힌 티켓만 (drawn=true) 시간 역순으로 반환.
 * cursor = 마지막으로 받은 ticket id → 다음 페이지 시작점.
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );
  const cursorRaw = url.searchParams.get('cursor');
  const cursor = cursorRaw ? Number(cursorRaw) : null;
  const packId = url.searchParams.get('packId') || undefined;
  const userId = url.searchParams.get('userId') || undefined;

  const where = {
    drawn: true,
    ...(packId ? { packId } : {}),
    ...(userId ? { drawnById: userId } : {}),
  };

  const rows = await prisma.oripaTicket.findMany({
    where,
    orderBy: [{ drawnAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor && Number.isInteger(cursor) ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      packId: true,
      index: true,
      grade: true,
      prizeName: true,
      prizeEmoji: true,
      prizeImageUrl: true,
      drawnAt: true,
      drawnById: true,
      drawnByName: true,
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  // pack 이름 join (별도 쿼리, packId 가 적은 종류라 N+1 안 됨)
  const packIds = Array.from(new Set(items.map((r) => r.packId)));
  const packs = packIds.length
    ? await prisma.oripaPack.findMany({
        where: { id: { in: packIds } },
        select: { id: true, name: true, emoji: true, price: true },
      })
    : [];
  const packMap = new Map(packs.map((p) => [p.id, p]));

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      packId: r.packId,
      packName: packMap.get(r.packId)?.name ?? r.packId,
      packEmoji: packMap.get(r.packId)?.emoji ?? '🎁',
      packPrice: packMap.get(r.packId)?.price ?? null,
      index: r.index,
      grade: r.grade,
      prizeName: r.prizeName,
      prizeEmoji: r.prizeEmoji,
      prizeImageUrl: r.prizeImageUrl,
      drawnAt: r.drawnAt,
      drawnById: r.drawnById,
      drawnByName: r.drawnByName,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
