import { getServerSession } from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAuth() {
  const session = await getServerSession(authOptions);
  return session?.user ? session : null;
}

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** GET /api/feeds/:id */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const row = await prisma.feed.findUnique({
    where: { id },
    include: { place: { select: { id: true, name: true } } },
  });
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

/** PATCH /api/feeds/:id — body: { text?, placeId? } (auth required) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { text, placeId } = (body ?? {}) as { text?: string; placeId?: string | null };

  const data: Prisma.FeedUpdateInput = {};
  if (typeof text === 'string') {
    const trimmed = text.trim();
    if (!trimmed) return NextResponse.json({ error: 'text empty' }, { status: 400 });
    data.text = trimmed;
  }
  if (placeId !== undefined) {
    data.place = placeId ? { connect: { id: placeId } } : { disconnect: true };
  }

  try {
    const updated = await prisma.feed.update({ where: { id }, data });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}

/** DELETE /api/feeds/:id (auth required) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAuth())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  try {
    await prisma.feed.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    throw err;
  }
}
