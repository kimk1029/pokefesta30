import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePrizes } from '@/lib/oripaPacks';

export const dynamic = 'force-dynamic';

/**
 * 팩 수정. resetTickets:true 면 같은 트랜잭션으로 티켓 전부 삭제 → 새 판으로.
 * 가격/티켓수/상품 변경 시 보통 reset 필요. 이름/설명/이모지만 바꿀 땐 reset 안 해도 OK.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  try {
    const before = await prisma.oripaPack.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.tier === 'string') data.tier = body.tier;
    if (typeof body.emoji === 'string') data.emoji = body.emoji;
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.desc === 'string') data.desc = body.desc;
    if (body.price !== undefined) data.price = Math.max(0, Number(body.price) || 0);
    if (body.ticketsCount !== undefined)
      data.ticketsCount = Math.max(1, Number(body.ticketsCount) || 100);
    if (typeof body.active === 'boolean') data.active = body.active;
    if (body.prizes !== undefined) {
      data.prizes = validatePrizes(body.prizes) as unknown as object;
    }

    const wantReset = body.resetTickets === true;

    const ops = [
      prisma.oripaPack.update({ where: { id: params.id }, data }),
      prisma.oripaPackHistory.create({
        data: {
          packId: params.id,
          action: wantReset ? 'update_with_reset' : 'update',
          note: typeof body.note === 'string' ? body.note.slice(0, 200) : null,
          snapshot: {
            before: {
              price: before.price,
              ticketsCount: before.ticketsCount,
              active: before.active,
              prizes: before.prizes,
              name: before.name,
            },
            after: data,
          } as unknown as object,
        },
      }),
    ];

    if (wantReset) {
      ops.push(
        prisma.oripaTicket.deleteMany({ where: { packId: params.id } }) as unknown as ReturnType<
          typeof prisma.oripaPack.update
        >,
      );
    }

    const [pack] = await prisma.$transaction(ops);
    return NextResponse.json({ data: pack, reset: wantReset });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const notFound = msg.includes('P2025');
    return NextResponse.json(
      { error: notFound ? 'not found' : msg },
      { status: notFound ? 404 : 400 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.oripaPack.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const notFound = msg.includes('P2025');
    return NextResponse.json(
      { error: notFound ? 'not found' : msg },
      { status: notFound ? 404 : 400 },
    );
  }
}
