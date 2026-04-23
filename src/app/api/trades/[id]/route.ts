import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TRADE_TYPES = ['buy', 'sell'] as const;

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** GET /api/trades/:id */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const row = await prisma.trade.findUnique({
    where: { id },
    include: { place: { select: { id: true, name: true } } },
  });
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

/** PATCH /api/trades/:id — body: { title?, body?, price?, type?, placeId? } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const input = (body ?? {}) as {
    title?: string;
    body?: string;
    price?: string;
    type?: string;
    placeId?: string;
  };

  const data: Prisma.TradeUpdateInput = {};
  if (typeof input.title === 'string') {
    const t = input.title.trim();
    if (!t) return NextResponse.json({ error: 'title empty' }, { status: 400 });
    data.title = t;
  }
  if (typeof input.body === 'string') data.body = input.body.trim();
  if (typeof input.price === 'string') data.price = input.price.trim() || '제안';
  if (typeof input.type === 'string') {
    if (!TRADE_TYPES.includes(input.type as (typeof TRADE_TYPES)[number])) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }
    data.type = input.type;
  }
  if (typeof input.placeId === 'string' && input.placeId) {
    data.place = { connect: { id: input.placeId } };
  }

  try {
    const updated = await prisma.trade.update({ where: { id }, data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}

/** DELETE /api/trades/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  try {
    await prisma.trade.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}
