import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 팩의 티켓 100칸을 "새 판"으로 초기화. 기존 OripaTicket 행 전부 삭제.
 * 다음 사용자가 oripa play 페이지 진입 시 ensureSeeded 가 다시 시드.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  let body: { note?: unknown } = {};
  try {
    body = (await req.json()) as { note?: unknown };
  } catch {
    /* body optional */
  }

  try {
    const pack = await prisma.oripaPack.findUnique({ where: { id: params.id } });
    if (!pack) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const [{ count }] = await prisma.$transaction([
      prisma.oripaTicket.deleteMany({ where: { packId: params.id } }),
      prisma.oripaPackHistory.create({
        data: {
          packId: params.id,
          action: 'reset_tickets',
          note: typeof body.note === 'string' ? body.note.slice(0, 200) : null,
          snapshot: { ticketsCount: pack.ticketsCount },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, deleted: count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
