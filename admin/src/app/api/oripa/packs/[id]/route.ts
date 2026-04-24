import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePrizes } from '@/lib/oripaPacks';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  try {
    const data: Record<string, unknown> = {};
    if (typeof body.tier === 'string') data.tier = body.tier;
    if (typeof body.emoji === 'string') data.emoji = body.emoji;
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.desc === 'string') data.desc = body.desc;
    if (body.price !== undefined) data.price = Math.max(0, Number(body.price) || 0);
    if (body.ticketsCount !== undefined) data.ticketsCount = Math.max(1, Number(body.ticketsCount) || 100);
    if (typeof body.active === 'boolean') data.active = body.active;
    if (body.prizes !== undefined) {
      data.prizes = validatePrizes(body.prizes) as unknown as object;
    }

    const pack = await prisma.oripaPack.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ data: pack });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const notFound = msg.includes('P2025');
    return NextResponse.json({ error: notFound ? 'not found' : msg }, { status: notFound ? 404 : 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.oripaPack.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const notFound = msg.includes('P2025');
    return NextResponse.json({ error: notFound ? 'not found' : msg }, { status: notFound ? 404 : 400 });
  }
}
