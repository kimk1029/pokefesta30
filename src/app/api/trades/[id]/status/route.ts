import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TRADE_STATUSES = ['open', 'reserved', 'done', 'cancelled'] as const;
type TradeStatus = (typeof TRADE_STATUSES)[number];

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** PATCH /api/trades/:id/status — body: { status: 'open'|'reserved'|'done'|'cancelled' } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const status = (body as { status?: string } | null)?.status;
  if (!status || !TRADE_STATUSES.includes(status as TradeStatus)) {
    return NextResponse.json(
      { error: `invalid status. allowed: ${TRADE_STATUSES.join(',')}` },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.trade.update({
      where: { id },
      data: { status },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}
